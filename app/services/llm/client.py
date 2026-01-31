"""Claude LLM client with rate limiting and retry logic."""

import asyncio
import json
import time
from typing import Any

import anthropic

from app.config import get_settings
from app.models.schemas import (
    AffectedArea,
    DisasterSummary,
    DisasterType,
    ExtractedInfo,
    PersonRecord,
    SeverityLevel,
)
from app.services.llm.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    EXTRACTION_USER_TEMPLATE,
    SUMMARY_SYSTEM_PROMPT,
    SUMMARY_USER_TEMPLATE,
)
from app.utils.logging import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, requests_per_minute: int):
        self.rate = requests_per_minute / 60.0  # requests per second
        self.tokens = requests_per_minute
        self.max_tokens = requests_per_minute
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Acquire a token, waiting if necessary."""
        async with self._lock:
            while True:
                now = time.monotonic()
                elapsed = now - self.last_update
                self.tokens = min(
                    self.max_tokens, self.tokens + elapsed * self.rate
                )
                self.last_update = now

                if self.tokens >= 1:
                    self.tokens -= 1
                    return

                # Wait for token to become available
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)


class ClaudeClient:
    """Wrapper for Anthropic Claude API with rate limiting."""

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model
        self.max_tokens = settings.claude_max_tokens
        self.rate_limiter = RateLimiter(settings.claude_rate_limit_rpm)

    async def _call_api(
        self,
        system_prompt: str,
        user_prompt: str,
        max_retries: int = 3,
    ) -> str:
        """Call Claude API with rate limiting and retry."""
        await self.rate_limiter.acquire()

        for attempt in range(max_retries):
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=self.max_tokens,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_prompt}],
                )
                return response.content[0].text

            except anthropic.RateLimitError as e:
                wait_time = 2 ** attempt
                logger.warning(
                    f"Rate limit hit, waiting {wait_time}s",
                    extra={"event": "rate_limit", "attempt": attempt},
                )
                await asyncio.sleep(wait_time)

            except anthropic.APIError as e:
                if attempt == max_retries - 1:
                    logger.error(
                        f"API error after {max_retries} retries: {e}",
                        extra={"event": "api_error", "error": str(e)},
                    )
                    raise
                await asyncio.sleep(2 ** attempt)

        raise RuntimeError("Max retries exceeded")

    def _parse_json_response(self, response: str) -> dict[str, Any]:
        """Parse JSON from response, handling markdown code blocks."""
        text = response.strip()

        # Remove markdown code block if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json) and last line (```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)

        return json.loads(text)

    async def extract_info(self, transcript: str) -> ExtractedInfo:
        """Extract information from a transcript."""
        user_prompt = EXTRACTION_USER_TEMPLATE.format(transcript=transcript)

        logger.debug(
            "Extracting info from transcript",
            extra={"event": "extraction_start", "transcript_length": len(transcript)},
        )

        response = await self._call_api(EXTRACTION_SYSTEM_PROMPT, user_prompt)

        try:
            data = self._parse_json_response(response)

            # Map string values to enums
            if data.get("disaster_type"):
                data["disaster_type"] = DisasterType(data["disaster_type"])
            if data.get("severity"):
                data["severity"] = SeverityLevel(data["severity"])

            info = ExtractedInfo(**data)
            logger.info(
                "Extracted info successfully",
                extra={
                    "event": "extraction_complete",
                    "severity": info.severity.value,
                    "disaster_type": info.disaster_type.value,
                },
            )
            return info

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(
                f"Failed to parse extraction response: {e}",
                extra={"event": "extraction_parse_error", "response": response[:200]},
            )
            return ExtractedInfo(
                additional_notes=f"Extraction failed: {response[:500]}",
                confidence=0.0,
            )

    async def generate_summary(
        self,
        persons: list[PersonRecord],
        current_summary: DisasterSummary,
    ) -> DisasterSummary:
        """Generate aggregate summary from all caller information."""
        # Build caller reports
        caller_reports = []
        total_injuries = 0
        total_fatalities = 0
        total_trapped = 0

        for person in persons:
            if person.extracted_info:
                info = person.extracted_info
                report = f"Caller {person.person_id}:\n"
                if info.location:
                    report += f"  Location: {info.location}\n"
                if info.disaster_type != DisasterType.UNKNOWN:
                    report += f"  Disaster: {info.disaster_type.value}\n"
                if info.severity != SeverityLevel.UNKNOWN:
                    report += f"  Severity: {info.severity.value}\n"
                if info.injuries_reported:
                    report += f"  Injuries: {info.injuries_reported}\n"
                    total_injuries += info.injuries_reported
                if info.fatalities_reported:
                    report += f"  Fatalities: {info.fatalities_reported}\n"
                    total_fatalities += info.fatalities_reported
                if info.people_trapped:
                    report += f"  Trapped: {info.people_trapped}\n"
                    total_trapped += info.people_trapped
                if info.hazards:
                    report += f"  Hazards: {', '.join(info.hazards)}\n"
                if info.resources_needed:
                    report += f"  Resources needed: {', '.join(info.resources_needed)}\n"
                if info.additional_notes:
                    report += f"  Notes: {info.additional_notes}\n"
                caller_reports.append(report)

        if not caller_reports:
            logger.info(
                "No caller reports to summarize",
                extra={"event": "summary_skip_empty"},
            )
            return current_summary

        active_count = sum(1 for p in persons if p.is_active)

        user_prompt = SUMMARY_USER_TEMPLATE.format(
            caller_reports="\n".join(caller_reports),
            total_callers=len(persons),
            active_callers=active_count,
            total_injuries=total_injuries,
            total_fatalities=total_fatalities,
            total_trapped=total_trapped,
        )

        logger.debug(
            "Generating summary",
            extra={"event": "summary_start", "caller_count": len(persons)},
        )

        response = await self._call_api(SUMMARY_SYSTEM_PROMPT, user_prompt)

        try:
            data = self._parse_json_response(response)

            # Build updated summary
            updated_summary = DisasterSummary(
                summary_id=current_summary.summary_id,
                version=current_summary.version,
                total_callers=len(persons),
                active_callers=active_count,
                total_injuries=total_injuries,
                total_fatalities=total_fatalities,
                total_trapped=total_trapped,
                overall_severity=SeverityLevel(data.get("overall_severity", "unknown")),
                narrative_summary=data.get("narrative_summary", ""),
                key_findings=data.get("key_findings", []),
                all_hazards=data.get("all_hazards", []),
                resources_needed=data.get("resources_needed", []),
                disaster_types=[
                    DisasterType(dt) for dt in data.get("disaster_types", [])
                ],
                affected_areas=[
                    AffectedArea(
                        location=area["location"],
                        caller_count=area.get("caller_count", 0),
                        max_severity=SeverityLevel(area.get("max_severity", "unknown")),
                        disaster_types=[
                            DisasterType(dt) for dt in area.get("disaster_types", [])
                        ],
                    )
                    for area in data.get("affected_areas", [])
                ],
            )

            logger.info(
                "Generated summary successfully",
                extra={
                    "event": "summary_complete",
                    "severity": updated_summary.overall_severity.value,
                    "areas": len(updated_summary.affected_areas),
                },
            )
            return updated_summary

        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(
                f"Failed to parse summary response: {e}",
                extra={"event": "summary_parse_error", "response": response[:200]},
            )
            # Return current summary with updated stats
            current_summary.total_callers = len(persons)
            current_summary.active_callers = active_count
            current_summary.total_injuries = total_injuries
            current_summary.total_fatalities = total_fatalities
            current_summary.total_trapped = total_trapped
            return current_summary
