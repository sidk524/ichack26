"""Example usage of the disaster call client."""

import asyncio
import sys
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from client.websocket_client import DisasterCallClient
from app.models.schemas import DisasterSummary, ExtractedInfo
from app.utils.logging import setup_logging


# Example emergency call transcript chunks
EXAMPLE_TRANSCRIPT = [
    "Hello, this is 911, what's your emergency?",
    "There's a fire! A big fire at the warehouse on 123 Industrial Drive!",
    "I can see flames coming from the second floor, and there's thick black smoke everywhere.",
    "I think there might be people trapped inside. I saw at least 3 workers run in before the fire started.",
    "The whole building is engulfed now. We need fire trucks immediately!",
    "There's also a chemical smell, like burning plastic or something. It's making it hard to breathe.",
    "Please hurry, the fire is spreading to the neighboring building!",
]


def on_connected():
    """Called when connected to server."""
    print("\n✓ Connected to server")


def on_disconnected():
    """Called when disconnected from server."""
    print("\n✗ Disconnected from server")


def on_chunk_processed(chunk_index: int, info: ExtractedInfo):
    """Called when a chunk is processed."""
    print(f"\n→ Chunk {chunk_index} processed:")
    if info.location:
        print(f"  Location: {info.location}")
    if info.disaster_type.value != "unknown":
        print(f"  Type: {info.disaster_type.value}")
    if info.severity.value != "unknown":
        print(f"  Severity: {info.severity.value}")
    if info.people_trapped:
        print(f"  People trapped: {info.people_trapped}")
    if info.hazards:
        print(f"  Hazards: {', '.join(info.hazards)}")


def on_summary_update(summary: DisasterSummary):
    """Called when summary is updated."""
    print(f"\n═══ Summary Update ═══")
    print(f"  Overall severity: {summary.overall_severity.value}")
    print(f"  Total callers: {summary.total_callers}")
    print(f"  Total injuries: {summary.total_injuries}")
    print(f"  Total trapped: {summary.total_trapped}")
    if summary.key_findings:
        print(f"  Key findings:")
        for finding in summary.key_findings[:3]:
            print(f"    - {finding}")
    print("═" * 25)


def on_error(message: str):
    """Called on error."""
    print(f"\n✗ Error: {message}")


async def run_single_caller():
    """Run a single caller simulation."""
    print("Starting single caller simulation...")
    print("-" * 40)

    client = DisasterCallClient(
        server_url="ws://localhost:8000",
        person_id="caller-001",
    )

    # Register callbacks
    client.on_connected(on_connected)
    client.on_disconnected(on_disconnected)
    client.on_chunk_processed(on_chunk_processed)
    client.on_summary_update(on_summary_update)
    client.on_error(on_error)

    async with client:
        # Send transcript chunks with delays to simulate real call
        for i, chunk in enumerate(EXAMPLE_TRANSCRIPT):
            print(f"\n← Sending: {chunk[:50]}...")
            is_final = i == len(EXAMPLE_TRANSCRIPT) - 1
            await client.send_transcript_chunk(chunk, is_final=is_final)
            await asyncio.sleep(2)  # Simulate speaking pace

        # Wait for final processing
        print("\nWaiting for final processing...")
        await asyncio.sleep(5)

    print("\nSimulation complete!")


async def run_multiple_callers():
    """Run multiple caller simulation in parallel."""
    print("Starting multi-caller simulation...")
    print("-" * 40)

    # Different emergency scenarios
    scenarios = [
        {
            "person_id": "caller-001",
            "transcript": [
                "There's a fire at the warehouse on 123 Industrial Drive!",
                "Flames on the second floor, thick smoke!",
                "People might be trapped inside!",
            ],
        },
        {
            "person_id": "caller-002",
            "transcript": [
                "I'm at 125 Industrial Drive, next to the burning building!",
                "The fire is spreading to our building!",
                "We need immediate evacuation help, there are 10 workers here!",
            ],
        },
        {
            "person_id": "caller-003",
            "transcript": [
                "Chemical spill on Industrial Drive near the fire!",
                "I can see barrels leaking some kind of liquid!",
                "The firefighters need to know about the chemicals!",
            ],
        },
    ]

    async def simulate_caller(scenario: dict):
        """Simulate a single caller."""
        client = DisasterCallClient(
            server_url="ws://localhost:8000",
            person_id=scenario["person_id"],
        )

        client.on_chunk_processed(
            lambda idx, info: print(
                f"  [{scenario['person_id']}] Chunk {idx}: {info.severity.value}"
            )
        )

        async with client:
            for i, chunk in enumerate(scenario["transcript"]):
                is_final = i == len(scenario["transcript"]) - 1
                await client.send_transcript_chunk(chunk, is_final=is_final)
                await asyncio.sleep(1.5)

            # Wait for processing
            await asyncio.sleep(3)

        print(f"  [{scenario['person_id']}] Call complete")

    # Run all callers in parallel
    await asyncio.gather(*[simulate_caller(s) for s in scenarios])

    print("\nMulti-caller simulation complete!")


async def main():
    """Main entry point."""
    setup_logging("INFO")

    print("=" * 50)
    print("Disaster Call Client - Example Usage")
    print("=" * 50)
    print("\nMake sure the server is running:")
    print("  uvicorn app.main:app --reload")
    print("\nAnd MongoDB is available:")
    print("  docker run -p 27017:27017 mongo:7.0")
    print("=" * 50)

    if len(sys.argv) > 1 and sys.argv[1] == "multi":
        await run_multiple_callers()
    else:
        await run_single_caller()


if __name__ == "__main__":
    asyncio.run(main())
