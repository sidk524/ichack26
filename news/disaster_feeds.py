#!/usr/bin/env python3
"""
Disaster News Feeds - Robust multi-source disaster information aggregator.
Builds on top of the existing news infrastructure.

Sources:
- GDACS (Global Disaster Alert and Coordination System) - UN/EU official alerts
- USGS Earthquake Hazards Program - Real-time earthquake data
- ReliefWeb - UN OCHA humanitarian news
- NOAA/NWS Weather Alerts - Severe weather warnings
- BBC World News - Disaster coverage
"""

import xml.etree.ElementTree as ET
import json
import urllib.request
import urllib.error
import ssl
import time
from datetime import datetime
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, asdict
from abc import ABC, abstractmethod
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DisasterEvent:
    """Normalized disaster event structure."""
    id: str
    title: str
    description: str
    event_type: str  # earthquake, flood, cyclone, volcano, wildfire, drought, weather, news
    source: str  # gdacs, usgs, reliefweb, noaa, bbc
    link: str
    pub_date: str
    severity: Optional[str] = None  # green, orange, red / magnitude / category
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None
    population_affected: Optional[int] = None
    raw_data: Optional[Dict] = None


class FeedFetcher:
    """Robust HTTP fetcher with retries and error handling."""

    def __init__(self, timeout: int = 30, max_retries: int = 3, retry_delay: float = 1.0):
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        # Create SSL context that doesn't verify (for some government feeds)
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

    def fetch(self, url: str, use_ssl_verify: bool = True) -> Optional[str]:
        """Fetch URL content with retries."""
        headers = {
            'User-Agent': 'DisasterNewsAggregator/1.0 (Emergency Response System)',
            'Accept': 'application/xml, application/json, text/xml, */*',
        }

        for attempt in range(self.max_retries):
            try:
                request = urllib.request.Request(url, headers=headers)
                context = None if use_ssl_verify else self.ssl_context

                with urllib.request.urlopen(request, timeout=self.timeout, context=context) as response:
                    content = response.read()
                    # Try to decode as UTF-8, fall back to latin-1
                    try:
                        return content.decode('utf-8')
                    except UnicodeDecodeError:
                        return content.decode('latin-1')

            except urllib.error.HTTPError as e:
                logger.warning(f"HTTP error {e.code} fetching {url} (attempt {attempt + 1})")
                if e.code == 404:
                    return None  # Don't retry 404s
            except urllib.error.URLError as e:
                logger.warning(f"URL error fetching {url}: {e.reason} (attempt {attempt + 1})")
            except Exception as e:
                logger.warning(f"Error fetching {url}: {e} (attempt {attempt + 1})")

            if attempt < self.max_retries - 1:
                time.sleep(self.retry_delay * (attempt + 1))

        logger.error(f"Failed to fetch {url} after {self.max_retries} attempts")
        return None


class DisasterFeedParser(ABC):
    """Abstract base class for disaster feed parsers."""

    def __init__(self, fetcher: Optional[FeedFetcher] = None):
        self.fetcher = fetcher or FeedFetcher()

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Return the source identifier."""
        pass

    @property
    @abstractmethod
    def feed_urls(self) -> List[str]:
        """Return list of feed URLs to fetch."""
        pass

    @abstractmethod
    def parse(self, content: str) -> List[DisasterEvent]:
        """Parse feed content into DisasterEvent objects."""
        pass

    def fetch_and_parse(self) -> List[DisasterEvent]:
        """Fetch all feeds and parse them."""
        all_events = []
        for url in self.feed_urls:
            logger.info(f"Fetching {self.source_name} from {url}")
            content = self.fetcher.fetch(url, use_ssl_verify=True)
            if content:
                try:
                    events = self.parse(content)
                    all_events.extend(events)
                    logger.info(f"Parsed {len(events)} events from {url}")
                except Exception as e:
                    logger.error(f"Error parsing {url}: {e}")
        return all_events


class GDACSParser(DisasterFeedParser):
    """Parser for GDACS (Global Disaster Alert and Coordination System) RSS feed."""

    @property
    def source_name(self) -> str:
        return "gdacs"

    @property
    def feed_urls(self) -> List[str]:
        return [
            "https://gdacs.org/xml/rss.xml",  # Current alerts
            "https://gdacs.org/xml/rss_7d.xml",  # Last 7 days
        ]

    def parse(self, content: str) -> List[DisasterEvent]:
        events = []
        try:
            root = ET.fromstring(content)

            # GDACS uses namespaces
            namespaces = {
                'gdacs': 'http://www.gdacs.org',
                'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#',
            }

            channel = root.find('.//channel')
            if channel is None:
                return events

            for item in channel.findall('item'):
                try:
                    # Extract basic info
                    title = self._get_text(item, 'title')
                    link = self._get_text(item, 'link')
                    description = self._get_text(item, 'description')
                    pub_date = self._get_text(item, 'pubDate')
                    guid = self._get_text(item, 'guid')

                    # Extract GDACS-specific info
                    event_type_raw = self._get_text(item, 'gdacs:eventtype', namespaces)
                    event_type = self._normalize_event_type(event_type_raw)
                    alert_level = self._get_text(item, 'gdacs:alertlevel', namespaces)
                    country = self._get_text(item, 'gdacs:country', namespaces)
                    event_id = self._get_text(item, 'gdacs:eventid', namespaces)

                    # Get coordinates
                    lat = None
                    lon = None
                    point = item.find('.//geo:Point', namespaces)
                    if point is not None:
                        lat_elem = point.find('geo:lat', namespaces)
                        lon_elem = point.find('geo:long', namespaces)
                        if lat_elem is not None and lat_elem.text:
                            lat = float(lat_elem.text)
                        if lon_elem is not None and lon_elem.text:
                            lon = float(lon_elem.text)

                    # Get severity info
                    severity_elem = item.find('gdacs:severity', namespaces)
                    severity = None
                    if severity_elem is not None and severity_elem.text:
                        severity = severity_elem.text

                    # Get population affected
                    pop_elem = item.find('gdacs:population', namespaces)
                    population = None
                    if pop_elem is not None:
                        pop_value = pop_elem.get('value')
                        if pop_value:
                            try:
                                population = int(float(pop_value))
                            except ValueError:
                                pass

                    event = DisasterEvent(
                        id=f"gdacs_{event_id or guid}",
                        title=title or "Unknown Event",
                        description=description or "",
                        event_type=event_type,
                        source=self.source_name,
                        link=link or "",
                        pub_date=pub_date or "",
                        severity=alert_level,
                        location=country,
                        latitude=lat,
                        longitude=lon,
                        country=country,
                        population_affected=population,
                    )
                    events.append(event)

                except Exception as e:
                    logger.warning(f"Error parsing GDACS item: {e}")
                    continue

        except ET.ParseError as e:
            logger.error(f"XML parse error in GDACS feed: {e}")

        return events

    def _get_text(self, elem: ET.Element, tag: str, namespaces: Dict = None) -> Optional[str]:
        """Safely get text from an element."""
        if namespaces:
            child = elem.find(tag, namespaces)
        else:
            child = elem.find(tag)
        return child.text if child is not None and child.text else None

    def _normalize_event_type(self, event_type: Optional[str]) -> str:
        """Normalize GDACS event types."""
        if not event_type:
            return "unknown"
        mapping = {
            'EQ': 'earthquake',
            'TC': 'cyclone',
            'FL': 'flood',
            'VO': 'volcano',
            'WF': 'wildfire',
            'DR': 'drought',
            'TS': 'tsunami',
        }
        return mapping.get(event_type.upper(), event_type.lower())


class USGSParser(DisasterFeedParser):
    """Parser for USGS Earthquake Hazards Program feeds (GeoJSON format)."""

    @property
    def source_name(self) -> str:
        return "usgs"

    @property
    def feed_urls(self) -> List[str]:
        return [
            # Significant earthquakes in the past day
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson",
            # M4.5+ earthquakes in the past day
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
            # M2.5+ earthquakes in the past day (for more coverage)
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
        ]

    def parse(self, content: str) -> List[DisasterEvent]:
        events = []
        try:
            data = json.loads(content)
            features = data.get('features', [])

            for feature in features:
                try:
                    props = feature.get('properties', {})
                    geometry = feature.get('geometry', {})
                    coords = geometry.get('coordinates', [None, None, None])

                    # Extract info
                    eq_id = feature.get('id', '')
                    title = props.get('title', 'Unknown Earthquake')
                    place = props.get('place', '')
                    mag = props.get('mag')
                    time_ms = props.get('time')
                    url = props.get('url', '')
                    alert = props.get('alert')  # green, yellow, orange, red
                    tsunami = props.get('tsunami', 0)

                    # Format time
                    pub_date = ""
                    if time_ms:
                        try:
                            dt = datetime.fromtimestamp(time_ms / 1000)
                            pub_date = dt.strftime('%a, %d %b %Y %H:%M:%S GMT')
                        except:
                            pass

                    # Build description
                    description = f"Magnitude {mag} earthquake"
                    if place:
                        description += f" - {place}"
                    if tsunami:
                        description += " [TSUNAMI WARNING]"

                    # Determine severity based on magnitude
                    severity = self._mag_to_severity(mag)
                    if alert:
                        severity = alert  # Use PAGER alert if available

                    lon = coords[0] if len(coords) > 0 else None
                    lat = coords[1] if len(coords) > 1 else None

                    event = DisasterEvent(
                        id=f"usgs_{eq_id}",
                        title=title,
                        description=description,
                        event_type="earthquake",
                        source=self.source_name,
                        link=url,
                        pub_date=pub_date,
                        severity=severity,
                        location=place,
                        latitude=lat,
                        longitude=lon,
                        raw_data={'magnitude': mag, 'tsunami': tsunami},
                    )
                    events.append(event)

                except Exception as e:
                    logger.warning(f"Error parsing USGS feature: {e}")
                    continue

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in USGS feed: {e}")

        return events

    def _mag_to_severity(self, mag: Optional[float]) -> str:
        """Convert magnitude to severity level."""
        if mag is None:
            return "unknown"
        if mag >= 7.0:
            return "red"
        elif mag >= 5.0:
            return "orange"
        elif mag >= 4.0:
            return "yellow"
        else:
            return "green"


class ReliefWebParser(DisasterFeedParser):
    """Parser for ReliefWeb humanitarian news RSS feed."""

    @property
    def source_name(self) -> str:
        return "reliefweb"

    @property
    def feed_urls(self) -> List[str]:
        return [
            # Disasters updates
            "https://reliefweb.int/updates/rss.xml?primary_country=&source=&format=&theme=4591&content_format=&disaster_type=&vulnerable_groups=&advanced-search=%28PC%29&search=disaster",
            # All updates (backup)
            "https://reliefweb.int/updates/rss.xml",
        ]

    def parse(self, content: str) -> List[DisasterEvent]:
        events = []
        try:
            root = ET.fromstring(content)
            channel = root.find('.//channel')
            if channel is None:
                return events

            for item in channel.findall('item'):
                try:
                    title = self._get_text(item, 'title')
                    link = self._get_text(item, 'link')
                    description = self._get_text(item, 'description')
                    pub_date = self._get_text(item, 'pubDate')
                    guid = self._get_text(item, 'guid')

                    # Try to extract country from title or description
                    country = self._extract_country(title, description)

                    # Determine event type from title/description
                    event_type = self._extract_event_type(title, description)

                    event = DisasterEvent(
                        id=f"reliefweb_{hash(guid or link)}",
                        title=title or "Unknown Report",
                        description=description or "",
                        event_type=event_type,
                        source=self.source_name,
                        link=link or "",
                        pub_date=pub_date or "",
                        country=country,
                    )
                    events.append(event)

                except Exception as e:
                    logger.warning(f"Error parsing ReliefWeb item: {e}")
                    continue

        except ET.ParseError as e:
            logger.error(f"XML parse error in ReliefWeb feed: {e}")

        return events

    def _get_text(self, elem: ET.Element, tag: str) -> Optional[str]:
        child = elem.find(tag)
        return child.text if child is not None and child.text else None

    def _extract_country(self, title: str, description: str) -> Optional[str]:
        """Try to extract country from text."""
        # Simple extraction - look for common patterns
        text = f"{title} {description}".lower() if title or description else ""
        # This could be enhanced with a proper NER or country list
        return None

    def _extract_event_type(self, title: str, description: str) -> str:
        """Extract disaster type from text."""
        text = f"{title} {description}".lower() if title or description else ""

        keywords = {
            'earthquake': ['earthquake', 'quake', 'seismic'],
            'flood': ['flood', 'flooding', 'flash flood'],
            'cyclone': ['cyclone', 'hurricane', 'typhoon', 'storm', 'tropical'],
            'drought': ['drought', 'famine', 'food crisis'],
            'wildfire': ['wildfire', 'fire', 'bushfire'],
            'volcano': ['volcano', 'volcanic', 'eruption'],
            'tsunami': ['tsunami'],
            'conflict': ['conflict', 'war', 'violence', 'crisis'],
            'epidemic': ['epidemic', 'outbreak', 'disease', 'cholera', 'ebola'],
        }

        for event_type, kws in keywords.items():
            if any(kw in text for kw in kws):
                return event_type

        return "humanitarian"


class NOAAParser(DisasterFeedParser):
    """Parser for NOAA/NWS Weather Alerts via API."""

    @property
    def source_name(self) -> str:
        return "noaa"

    @property
    def feed_urls(self) -> List[str]:
        return [
            # NWS API - active alerts in JSON-LD format
            "https://api.weather.gov/alerts/active",
        ]

    def parse(self, content: str) -> List[DisasterEvent]:
        events = []
        try:
            # NWS API returns JSON-LD format
            data = json.loads(content)
            features = data.get('features', [])

            for feature in features:
                try:
                    props = feature.get('properties', {})

                    alert_id = props.get('id', '')
                    headline = props.get('headline', '')
                    event_name = props.get('event', '')
                    description = props.get('description', '')
                    severity = props.get('severity', '')
                    urgency = props.get('urgency', '')
                    area_desc = props.get('areaDesc', '')
                    effective = props.get('effective', '')
                    expires = props.get('expires', '')

                    # Get link to full alert
                    link = f"https://api.weather.gov/alerts/{alert_id.split('/')[-1]}" if alert_id else ""

                    event_type = self._categorize_weather_event(headline, event_name)
                    norm_severity = self._normalize_severity(severity)

                    # Format description
                    full_desc = headline
                    if description:
                        full_desc = f"{headline}\n\n{description[:500]}..."

                    event = DisasterEvent(
                        id=f"noaa_{hash(alert_id or headline)}",
                        title=headline or event_name or "Weather Alert",
                        description=full_desc,
                        event_type=event_type,
                        source=self.source_name,
                        link=link,
                        pub_date=effective or "",
                        severity=norm_severity,
                        location=area_desc,
                        country="USA",
                        raw_data={'urgency': urgency, 'event': event_name, 'expires': expires},
                    )
                    events.append(event)

                except Exception as e:
                    logger.warning(f"Error parsing NOAA entry: {e}")
                    continue

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error in NOAA feed: {e}")

        return events

    def _categorize_weather_event(self, title: str, cap_event: Optional[str]) -> str:
        """Categorize weather event type."""
        text = f"{title} {cap_event}".lower() if title or cap_event else ""

        if any(w in text for w in ['tornado', 'twister']):
            return 'tornado'
        elif any(w in text for w in ['hurricane', 'tropical storm', 'cyclone']):
            return 'cyclone'
        elif any(w in text for w in ['flood', 'flash flood']):
            return 'flood'
        elif any(w in text for w in ['blizzard', 'winter storm', 'ice storm', 'snow']):
            return 'winter_storm'
        elif any(w in text for w in ['fire', 'red flag']):
            return 'wildfire'
        elif any(w in text for w in ['thunderstorm', 'severe storm', 'hail']):
            return 'severe_storm'
        elif any(w in text for w in ['tsunami']):
            return 'tsunami'
        elif any(w in text for w in ['heat', 'excessive heat']):
            return 'heat_wave'
        else:
            return 'weather'

    def _normalize_severity(self, cap_severity: Optional[str]) -> str:
        """Normalize CAP severity to color levels."""
        if not cap_severity:
            return "unknown"
        severity_map = {
            'extreme': 'red',
            'severe': 'orange',
            'moderate': 'yellow',
            'minor': 'green',
            'unknown': 'unknown',
        }
        return severity_map.get(cap_severity.lower(), 'unknown')


class BBCWorldParser(DisasterFeedParser):
    """Parser for BBC World News RSS feed."""

    @property
    def source_name(self) -> str:
        return "bbc"

    @property
    def feed_urls(self) -> List[str]:
        return [
            "https://feeds.bbci.co.uk/news/world/rss.xml",
        ]

    def parse(self, content: str) -> List[DisasterEvent]:
        events = []
        try:
            root = ET.fromstring(content)
            channel = root.find('.//channel')
            if channel is None:
                return events

            for item in channel.findall('item'):
                try:
                    title = self._get_text(item, 'title')
                    link = self._get_text(item, 'link')
                    description = self._get_text(item, 'description')
                    pub_date = self._get_text(item, 'pubDate')
                    guid = self._get_text(item, 'guid')

                    # Only include disaster-related news
                    if not self._is_disaster_related(title, description):
                        continue

                    event_type = self._extract_event_type(title, description)

                    event = DisasterEvent(
                        id=f"bbc_{hash(guid or link)}",
                        title=title or "BBC News",
                        description=description or "",
                        event_type=event_type,
                        source=self.source_name,
                        link=link or "",
                        pub_date=pub_date or "",
                    )
                    events.append(event)

                except Exception as e:
                    logger.warning(f"Error parsing BBC item: {e}")
                    continue

        except ET.ParseError as e:
            logger.error(f"XML parse error in BBC feed: {e}")

        return events

    def _get_text(self, elem: ET.Element, tag: str) -> Optional[str]:
        child = elem.find(tag)
        return child.text if child is not None and child.text else None

    def _is_disaster_related(self, title: str, description: str) -> bool:
        """Check if news item is disaster-related."""
        text = f"{title} {description}".lower() if title or description else ""

        disaster_keywords = [
            'earthquake', 'quake', 'flood', 'flooding', 'cyclone', 'hurricane',
            'typhoon', 'tornado', 'tsunami', 'volcano', 'eruption', 'wildfire',
            'fire', 'drought', 'famine', 'landslide', 'avalanche', 'storm',
            'disaster', 'emergency', 'evacuation', 'rescue', 'death toll',
            'casualties', 'destroyed', 'devastation', 'relief', 'humanitarian',
            'crisis', 'outbreak', 'epidemic', 'pandemic',
        ]

        return any(kw in text for kw in disaster_keywords)

    def _extract_event_type(self, title: str, description: str) -> str:
        """Extract disaster type from text."""
        text = f"{title} {description}".lower() if title or description else ""

        type_map = {
            'earthquake': ['earthquake', 'quake', 'seismic'],
            'flood': ['flood', 'flooding'],
            'cyclone': ['cyclone', 'hurricane', 'typhoon', 'tropical storm'],
            'tornado': ['tornado', 'twister'],
            'tsunami': ['tsunami'],
            'volcano': ['volcano', 'eruption', 'volcanic'],
            'wildfire': ['wildfire', 'bushfire', 'forest fire'],
            'drought': ['drought', 'famine'],
            'landslide': ['landslide', 'mudslide'],
            'epidemic': ['outbreak', 'epidemic', 'pandemic'],
        }

        for event_type, keywords in type_map.items():
            if any(kw in text for kw in keywords):
                return event_type

        return "disaster_news"


class DisasterFeedAggregator:
    """Aggregates disaster information from all sources."""

    def __init__(self):
        self.fetcher = FeedFetcher()
        self.parsers: List[DisasterFeedParser] = [
            GDACSParser(self.fetcher),
            USGSParser(self.fetcher),
            ReliefWebParser(self.fetcher),
            NOAAParser(self.fetcher),
            BBCWorldParser(self.fetcher),
        ]

    def fetch_all(self) -> Dict[str, Any]:
        """Fetch all disaster feeds and return aggregated data."""
        all_events: List[DisasterEvent] = []
        source_stats: Dict[str, int] = {}
        errors: List[str] = []

        for parser in self.parsers:
            try:
                events = parser.fetch_and_parse()
                all_events.extend(events)
                source_stats[parser.source_name] = len(events)
            except Exception as e:
                error_msg = f"Error fetching {parser.source_name}: {e}"
                logger.error(error_msg)
                errors.append(error_msg)
                source_stats[parser.source_name] = 0

        # Sort by publication date (newest first)
        all_events.sort(key=lambda e: e.pub_date or "", reverse=True)

        # Remove duplicates based on similar titles
        unique_events = self._deduplicate_events(all_events)

        return {
            'metadata': {
                'fetched_at': datetime.now().isoformat(),
                'total_events': len(unique_events),
                'sources': source_stats,
                'errors': errors,
            },
            'events': [asdict(e) for e in unique_events],
        }

    def _deduplicate_events(self, events: List[DisasterEvent]) -> List[DisasterEvent]:
        """Remove duplicate events based on similarity."""
        seen_titles = set()
        unique = []

        for event in events:
            # Simple deduplication based on normalized title
            title_key = event.title.lower().strip()[:50]
            if title_key not in seen_titles:
                seen_titles.add(title_key)
                unique.append(event)

        return unique

    def save_to_json(self, output_file: str = "disasters.json") -> Dict[str, Any]:
        """Fetch all feeds and save to JSON file."""
        data = self.fetch_all()

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        logger.info(f"Saved {data['metadata']['total_events']} events to {output_file}")
        return data


def main():
    """Main entry point."""
    aggregator = DisasterFeedAggregator()
    data = aggregator.save_to_json("disasters.json")

    print(f"\nDisaster Feed Summary:")
    print(f"  Total events: {data['metadata']['total_events']}")
    print(f"  Sources:")
    for source, count in data['metadata']['sources'].items():
        print(f"    - {source}: {count} events")

    if data['metadata']['errors']:
        print(f"  Errors:")
        for error in data['metadata']['errors']:
            print(f"    - {error}")


if __name__ == "__main__":
    main()
