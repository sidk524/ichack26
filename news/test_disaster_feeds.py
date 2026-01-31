#!/usr/bin/env python3
"""
Comprehensive tests for disaster_feeds.py

Run with: pytest test_disaster_feeds.py -v
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from disaster_feeds import (
    DisasterEvent,
    FeedFetcher,
    GDACSParser,
    USGSParser,
    ReliefWebParser,
    NOAAParser,
    BBCWorldParser,
    DisasterFeedAggregator,
)


# ============================================================================
# Test Fixtures - Sample RSS/JSON responses
# ============================================================================

SAMPLE_GDACS_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:gdacs="http://www.gdacs.org" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#">
<channel>
<title>GDACS - Global Disaster Alerts</title>
<item>
    <title>Green earthquake M 5.2 - Japan</title>
    <link>https://gdacs.org/report.aspx?eventid=1234</link>
    <description>Earthquake in Japan</description>
    <pubDate>Sat, 31 Jan 2026 10:00:00 GMT</pubDate>
    <guid>gdacs-1234</guid>
    <gdacs:eventtype>EQ</gdacs:eventtype>
    <gdacs:alertlevel>Green</gdacs:alertlevel>
    <gdacs:eventid>1234</gdacs:eventid>
    <gdacs:country>Japan</gdacs:country>
    <gdacs:severity unit="M">5.2</gdacs:severity>
    <gdacs:population value="50000"/>
    <geo:Point>
        <geo:lat>35.6762</geo:lat>
        <geo:long>139.6503</geo:long>
    </geo:Point>
</item>
<item>
    <title>Orange flood - Bangladesh</title>
    <link>https://gdacs.org/report.aspx?eventid=5678</link>
    <description>Severe flooding in Bangladesh</description>
    <pubDate>Sat, 31 Jan 2026 08:00:00 GMT</pubDate>
    <guid>gdacs-5678</guid>
    <gdacs:eventtype>FL</gdacs:eventtype>
    <gdacs:alertlevel>Orange</gdacs:alertlevel>
    <gdacs:eventid>5678</gdacs:eventid>
    <gdacs:country>Bangladesh</gdacs:country>
    <gdacs:population value="1000000"/>
</item>
</channel>
</rss>
"""

SAMPLE_USGS_GEOJSON = """{
    "type": "FeatureCollection",
    "metadata": {"title": "USGS Earthquakes"},
    "features": [
        {
            "type": "Feature",
            "id": "us7000abc1",
            "properties": {
                "mag": 6.5,
                "place": "100km NW of Tokyo, Japan",
                "time": 1738324800000,
                "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc1",
                "title": "M 6.5 - 100km NW of Tokyo, Japan",
                "alert": "yellow",
                "tsunami": 0
            },
            "geometry": {
                "type": "Point",
                "coordinates": [139.0, 36.0, 10.0]
            }
        },
        {
            "type": "Feature",
            "id": "us7000abc2",
            "properties": {
                "mag": 4.2,
                "place": "50km S of Los Angeles, CA",
                "time": 1738321200000,
                "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc2",
                "title": "M 4.2 - 50km S of Los Angeles, CA",
                "alert": null,
                "tsunami": 0
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-118.0, 33.5, 15.0]
            }
        }
    ]
}"""

SAMPLE_RELIEFWEB_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>ReliefWeb Updates</title>
<item>
    <title>Earthquake response update: Nepal</title>
    <link>https://reliefweb.int/report/12345</link>
    <description>OCHA coordinates earthquake response in Nepal</description>
    <pubDate>Sat, 31 Jan 2026 09:00:00 GMT</pubDate>
    <guid>rw-12345</guid>
</item>
<item>
    <title>Flood emergency: Mozambique Flash Update</title>
    <link>https://reliefweb.int/report/12346</link>
    <description>Flash flooding affects thousands in Mozambique</description>
    <pubDate>Sat, 31 Jan 2026 07:00:00 GMT</pubDate>
    <guid>rw-12346</guid>
</item>
</channel>
</rss>
"""

SAMPLE_NOAA_ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.1">
<title>NOAA Weather Alerts</title>
<entry>
    <id>noaa-alert-001</id>
    <title>Tornado Warning</title>
    <link href="https://alerts.weather.gov/cap/alert001"/>
    <summary>Tornado warning for Dallas County</summary>
    <updated>2026-01-31T12:00:00Z</updated>
    <cap:event>Tornado Warning</cap:event>
    <cap:severity>Extreme</cap:severity>
    <cap:urgency>Immediate</cap:urgency>
    <cap:areaDesc>Dallas County, TX</cap:areaDesc>
</entry>
<entry>
    <id>noaa-alert-002</id>
    <title>Flash Flood Warning</title>
    <link href="https://alerts.weather.gov/cap/alert002"/>
    <summary>Flash flood warning for Houston area</summary>
    <updated>2026-01-31T11:00:00Z</updated>
    <cap:event>Flash Flood Warning</cap:event>
    <cap:severity>Severe</cap:severity>
    <cap:urgency>Expected</cap:urgency>
    <cap:areaDesc>Houston Metro Area, TX</cap:areaDesc>
</entry>
</feed>
"""

SAMPLE_BBC_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>BBC World News</title>
<item>
    <title>Major earthquake hits Turkey, death toll rises</title>
    <link>https://bbc.com/news/world/123</link>
    <description>A powerful earthquake has struck Turkey, causing widespread devastation</description>
    <pubDate>Sat, 31 Jan 2026 06:00:00 GMT</pubDate>
    <guid>bbc-123</guid>
</item>
<item>
    <title>Political developments in Europe</title>
    <link>https://bbc.com/news/world/124</link>
    <description>Leaders meet to discuss trade agreements</description>
    <pubDate>Sat, 31 Jan 2026 05:00:00 GMT</pubDate>
    <guid>bbc-124</guid>
</item>
<item>
    <title>Wildfires force evacuations in Australia</title>
    <link>https://bbc.com/news/world/125</link>
    <description>Emergency services conduct rescue operations as fires spread</description>
    <pubDate>Sat, 31 Jan 2026 04:00:00 GMT</pubDate>
    <guid>bbc-125</guid>
</item>
</channel>
</rss>
"""


# ============================================================================
# DisasterEvent Tests
# ============================================================================

class TestDisasterEvent:
    """Tests for DisasterEvent dataclass."""

    def test_create_basic_event(self):
        """Test creating a basic disaster event."""
        event = DisasterEvent(
            id="test-1",
            title="Test Earthquake",
            description="A test earthquake",
            event_type="earthquake",
            source="test",
            link="https://example.com",
            pub_date="2026-01-31",
        )
        assert event.id == "test-1"
        assert event.title == "Test Earthquake"
        assert event.event_type == "earthquake"

    def test_create_event_with_optional_fields(self):
        """Test creating event with all optional fields."""
        event = DisasterEvent(
            id="test-2",
            title="Test Flood",
            description="A test flood",
            event_type="flood",
            source="test",
            link="https://example.com",
            pub_date="2026-01-31",
            severity="orange",
            location="Test City",
            latitude=35.0,
            longitude=139.0,
            country="Japan",
            population_affected=50000,
            raw_data={"extra": "data"},
        )
        assert event.severity == "orange"
        assert event.latitude == 35.0
        assert event.population_affected == 50000


# ============================================================================
# FeedFetcher Tests
# ============================================================================

class TestFeedFetcher:
    """Tests for FeedFetcher class."""

    def test_fetcher_initialization(self):
        """Test fetcher initializes with correct defaults."""
        fetcher = FeedFetcher()
        assert fetcher.timeout == 30
        assert fetcher.max_retries == 3
        assert fetcher.retry_delay == 1.0

    def test_fetcher_custom_settings(self):
        """Test fetcher with custom settings."""
        fetcher = FeedFetcher(timeout=60, max_retries=5, retry_delay=2.0)
        assert fetcher.timeout == 60
        assert fetcher.max_retries == 5
        assert fetcher.retry_delay == 2.0

    @patch('disaster_feeds.urllib.request.urlopen')
    def test_fetch_success(self, mock_urlopen):
        """Test successful fetch."""
        mock_response = MagicMock()
        mock_response.read.return_value = b"test content"
        mock_response.__enter__ = Mock(return_value=mock_response)
        mock_response.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_response

        fetcher = FeedFetcher()
        result = fetcher.fetch("https://example.com/feed")
        assert result == "test content"

    @patch('disaster_feeds.urllib.request.urlopen')
    def test_fetch_404_no_retry(self, mock_urlopen):
        """Test that 404 errors don't trigger retries."""
        from urllib.error import HTTPError
        mock_urlopen.side_effect = HTTPError(
            url="https://example.com", code=404, msg="Not Found",
            hdrs={}, fp=None
        )

        fetcher = FeedFetcher(max_retries=3)
        result = fetcher.fetch("https://example.com/feed")

        assert result is None
        assert mock_urlopen.call_count == 1  # No retries for 404

    @patch('disaster_feeds.urllib.request.urlopen')
    @patch('disaster_feeds.time.sleep')  # Don't actually sleep in tests
    def test_fetch_retries_on_error(self, mock_sleep, mock_urlopen):
        """Test that fetcher retries on errors."""
        from urllib.error import URLError
        mock_urlopen.side_effect = URLError("Connection failed")

        fetcher = FeedFetcher(max_retries=3, retry_delay=0.1)
        result = fetcher.fetch("https://example.com/feed")

        assert result is None
        assert mock_urlopen.call_count == 3  # Tried 3 times


# ============================================================================
# GDACS Parser Tests
# ============================================================================

class TestGDACSParser:
    """Tests for GDACS RSS parser."""

    def test_source_name(self):
        """Test source name is correct."""
        parser = GDACSParser()
        assert parser.source_name == "gdacs"

    def test_feed_urls_not_empty(self):
        """Test that feed URLs are defined."""
        parser = GDACSParser()
        assert len(parser.feed_urls) > 0

    def test_parse_valid_feed(self):
        """Test parsing valid GDACS RSS feed."""
        parser = GDACSParser()
        events = parser.parse(SAMPLE_GDACS_RSS)

        assert len(events) == 2

        # Check first event (earthquake)
        eq_event = events[0]
        assert eq_event.event_type == "earthquake"
        assert eq_event.severity == "Green"
        assert eq_event.country == "Japan"
        assert eq_event.latitude == 35.6762
        assert eq_event.longitude == 139.6503
        assert eq_event.population_affected == 50000

        # Check second event (flood)
        fl_event = events[1]
        assert fl_event.event_type == "flood"
        assert fl_event.severity == "Orange"
        assert fl_event.country == "Bangladesh"

    def test_parse_empty_feed(self):
        """Test parsing empty feed."""
        parser = GDACSParser()
        events = parser.parse("<rss><channel></channel></rss>")
        assert len(events) == 0

    def test_parse_invalid_xml(self):
        """Test parsing invalid XML returns empty list."""
        parser = GDACSParser()
        events = parser.parse("not valid xml")
        assert len(events) == 0

    def test_event_type_normalization(self):
        """Test that event types are normalized correctly."""
        parser = GDACSParser()

        assert parser._normalize_event_type("EQ") == "earthquake"
        assert parser._normalize_event_type("FL") == "flood"
        assert parser._normalize_event_type("TC") == "cyclone"
        assert parser._normalize_event_type("VO") == "volcano"
        assert parser._normalize_event_type("WF") == "wildfire"
        assert parser._normalize_event_type("DR") == "drought"
        assert parser._normalize_event_type("TS") == "tsunami"
        assert parser._normalize_event_type(None) == "unknown"
        assert parser._normalize_event_type("UNKNOWN") == "unknown"


# ============================================================================
# USGS Parser Tests
# ============================================================================

class TestUSGSParser:
    """Tests for USGS GeoJSON parser."""

    def test_source_name(self):
        """Test source name is correct."""
        parser = USGSParser()
        assert parser.source_name == "usgs"

    def test_feed_urls_not_empty(self):
        """Test that feed URLs are defined."""
        parser = USGSParser()
        assert len(parser.feed_urls) > 0

    def test_parse_valid_geojson(self):
        """Test parsing valid USGS GeoJSON feed."""
        parser = USGSParser()
        events = parser.parse(SAMPLE_USGS_GEOJSON)

        assert len(events) == 2

        # Check first event (larger earthquake)
        eq1 = events[0]
        assert eq1.event_type == "earthquake"
        assert eq1.id == "usgs_us7000abc1"
        assert "6.5" in eq1.title
        assert eq1.severity == "yellow"  # PAGER alert
        assert eq1.latitude == 36.0
        assert eq1.longitude == 139.0

        # Check second event
        eq2 = events[1]
        assert "4.2" in eq2.title
        assert eq2.severity == "yellow"  # Derived from magnitude

    def test_parse_empty_geojson(self):
        """Test parsing empty GeoJSON."""
        parser = USGSParser()
        events = parser.parse('{"type": "FeatureCollection", "features": []}')
        assert len(events) == 0

    def test_parse_invalid_json(self):
        """Test parsing invalid JSON returns empty list."""
        parser = USGSParser()
        events = parser.parse("not valid json")
        assert len(events) == 0

    def test_magnitude_to_severity(self):
        """Test magnitude to severity conversion."""
        parser = USGSParser()

        assert parser._mag_to_severity(7.5) == "red"
        assert parser._mag_to_severity(7.0) == "red"
        assert parser._mag_to_severity(6.5) == "orange"
        assert parser._mag_to_severity(5.0) == "orange"
        assert parser._mag_to_severity(4.5) == "yellow"
        assert parser._mag_to_severity(4.0) == "yellow"
        assert parser._mag_to_severity(3.5) == "green"
        assert parser._mag_to_severity(None) == "unknown"


# ============================================================================
# ReliefWeb Parser Tests
# ============================================================================

class TestReliefWebParser:
    """Tests for ReliefWeb RSS parser."""

    def test_source_name(self):
        """Test source name is correct."""
        parser = ReliefWebParser()
        assert parser.source_name == "reliefweb"

    def test_parse_valid_feed(self):
        """Test parsing valid ReliefWeb RSS feed."""
        parser = ReliefWebParser()
        events = parser.parse(SAMPLE_RELIEFWEB_RSS)

        assert len(events) == 2

        # Check earthquake report
        eq_report = events[0]
        assert "earthquake" in eq_report.event_type
        assert "Nepal" in eq_report.title

        # Check flood report
        fl_report = events[1]
        assert fl_report.event_type == "flood"
        assert "Mozambique" in fl_report.title

    def test_extract_event_type(self):
        """Test event type extraction from text."""
        parser = ReliefWebParser()

        assert parser._extract_event_type("Earthquake hits region", "") == "earthquake"
        assert parser._extract_event_type("Flash flood emergency", "") == "flood"
        assert parser._extract_event_type("Hurricane approaches", "") == "cyclone"
        assert parser._extract_event_type("Drought crisis continues", "") == "drought"
        assert parser._extract_event_type("General update", "") == "humanitarian"


# ============================================================================
# NOAA Parser Tests
# ============================================================================

class TestNOAAParser:
    """Tests for NOAA Atom parser."""

    def test_source_name(self):
        """Test source name is correct."""
        parser = NOAAParser()
        assert parser.source_name == "noaa"

    def test_parse_valid_atom_feed(self):
        """Test parsing valid NOAA Atom feed."""
        parser = NOAAParser()
        events = parser.parse(SAMPLE_NOAA_ATOM)

        assert len(events) == 2

        # Check tornado warning
        tornado = events[0]
        assert tornado.event_type == "tornado"
        assert tornado.severity == "red"  # Extreme -> red
        assert "Dallas" in tornado.location
        assert tornado.country == "USA"

        # Check flood warning
        flood = events[1]
        assert flood.event_type == "flood"
        assert flood.severity == "orange"  # Severe -> orange
        assert "Houston" in flood.location

    def test_categorize_weather_event(self):
        """Test weather event categorization."""
        parser = NOAAParser()

        assert parser._categorize_weather_event("Tornado Warning", None) == "tornado"
        assert parser._categorize_weather_event("Hurricane Warning", None) == "cyclone"
        assert parser._categorize_weather_event("Flash Flood Watch", None) == "flood"
        assert parser._categorize_weather_event("Blizzard Warning", None) == "winter_storm"
        assert parser._categorize_weather_event("Red Flag Warning", None) == "wildfire"
        assert parser._categorize_weather_event("General Advisory", None) == "weather"

    def test_normalize_severity(self):
        """Test CAP severity normalization."""
        parser = NOAAParser()

        assert parser._normalize_severity("Extreme") == "red"
        assert parser._normalize_severity("Severe") == "orange"
        assert parser._normalize_severity("Moderate") == "yellow"
        assert parser._normalize_severity("Minor") == "green"
        assert parser._normalize_severity(None) == "unknown"


# ============================================================================
# BBC Parser Tests
# ============================================================================

class TestBBCWorldParser:
    """Tests for BBC World News RSS parser."""

    def test_source_name(self):
        """Test source name is correct."""
        parser = BBCWorldParser()
        assert parser.source_name == "bbc"

    def test_parse_valid_feed(self):
        """Test parsing valid BBC RSS feed."""
        parser = BBCWorldParser()
        events = parser.parse(SAMPLE_BBC_RSS)

        # Should only include disaster-related items (2 out of 3)
        assert len(events) == 2

        # Check earthquake news
        eq_news = events[0]
        assert eq_news.event_type == "earthquake"
        assert "Turkey" in eq_news.title

        # Check wildfire news
        fire_news = events[1]
        assert fire_news.event_type == "wildfire"
        assert "Australia" in fire_news.title

    def test_is_disaster_related(self):
        """Test disaster keyword detection."""
        parser = BBCWorldParser()

        # Should be disaster-related
        assert parser._is_disaster_related("Earthquake hits city", "")
        assert parser._is_disaster_related("", "Flood waters rise")
        assert parser._is_disaster_related("Humanitarian crisis", "Relief efforts")
        assert parser._is_disaster_related("Death toll rises", "after disaster")

        # Should not be disaster-related
        assert not parser._is_disaster_related("Political news", "Leaders meet")
        assert not parser._is_disaster_related("Sports update", "Team wins")


# ============================================================================
# Aggregator Tests
# ============================================================================

class TestDisasterFeedAggregator:
    """Tests for DisasterFeedAggregator."""

    def test_aggregator_has_all_parsers(self):
        """Test that aggregator has all expected parsers."""
        aggregator = DisasterFeedAggregator()

        source_names = [p.source_name for p in aggregator.parsers]
        assert "gdacs" in source_names
        assert "usgs" in source_names
        assert "reliefweb" in source_names
        assert "noaa" in source_names
        assert "bbc" in source_names

    @patch.object(GDACSParser, 'fetch_and_parse')
    @patch.object(USGSParser, 'fetch_and_parse')
    @patch.object(ReliefWebParser, 'fetch_and_parse')
    @patch.object(NOAAParser, 'fetch_and_parse')
    @patch.object(BBCWorldParser, 'fetch_and_parse')
    def test_fetch_all_aggregates_events(
        self, mock_bbc, mock_noaa, mock_reliefweb, mock_usgs, mock_gdacs
    ):
        """Test that fetch_all aggregates events from all sources."""
        # Setup mock returns
        mock_gdacs.return_value = [
            DisasterEvent(
                id="gdacs-1", title="GDACS Event", description="Test",
                event_type="earthquake", source="gdacs", link="", pub_date="2026-01-31T10:00:00"
            )
        ]
        mock_usgs.return_value = [
            DisasterEvent(
                id="usgs-1", title="USGS Event", description="Test",
                event_type="earthquake", source="usgs", link="", pub_date="2026-01-31T09:00:00"
            )
        ]
        mock_reliefweb.return_value = []
        mock_noaa.return_value = []
        mock_bbc.return_value = []

        aggregator = DisasterFeedAggregator()
        result = aggregator.fetch_all()

        assert result['metadata']['total_events'] == 2
        assert result['metadata']['sources']['gdacs'] == 1
        assert result['metadata']['sources']['usgs'] == 1
        assert len(result['events']) == 2

    def test_deduplication(self):
        """Test that duplicate events are removed."""
        aggregator = DisasterFeedAggregator()

        events = [
            DisasterEvent(
                id="1", title="Earthquake in Japan", description="",
                event_type="earthquake", source="gdacs", link="", pub_date=""
            ),
            DisasterEvent(
                id="2", title="Earthquake in Japan", description="",
                event_type="earthquake", source="usgs", link="", pub_date=""
            ),
            DisasterEvent(
                id="3", title="Different Event", description="",
                event_type="flood", source="bbc", link="", pub_date=""
            ),
        ]

        unique = aggregator._deduplicate_events(events)
        assert len(unique) == 2  # One duplicate removed


# ============================================================================
# Integration Tests (with mocked HTTP)
# ============================================================================

class TestIntegration:
    """Integration tests with mocked HTTP responses."""

    @patch('disaster_feeds.urllib.request.urlopen')
    def test_full_pipeline_gdacs(self, mock_urlopen):
        """Test full pipeline from fetch to parse for GDACS."""
        mock_response = MagicMock()
        mock_response.read.return_value = SAMPLE_GDACS_RSS.encode('utf-8')
        mock_response.__enter__ = Mock(return_value=mock_response)
        mock_response.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_response

        parser = GDACSParser()
        events = parser.fetch_and_parse()

        # Should have fetched and parsed events
        assert len(events) > 0
        assert all(e.source == "gdacs" for e in events)

    @patch('disaster_feeds.urllib.request.urlopen')
    def test_full_pipeline_usgs(self, mock_urlopen):
        """Test full pipeline from fetch to parse for USGS."""
        mock_response = MagicMock()
        mock_response.read.return_value = SAMPLE_USGS_GEOJSON.encode('utf-8')
        mock_response.__enter__ = Mock(return_value=mock_response)
        mock_response.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_response

        parser = USGSParser()
        events = parser.fetch_and_parse()

        assert len(events) > 0
        assert all(e.source == "usgs" for e in events)
        assert all(e.event_type == "earthquake" for e in events)


# ============================================================================
# Edge Cases and Error Handling
# ============================================================================

class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_parse_with_missing_fields(self):
        """Test parsing with missing optional fields."""
        minimal_rss = """<?xml version="1.0"?>
        <rss><channel>
        <item>
            <title>Test Event</title>
            <link>https://example.com</link>
        </item>
        </channel></rss>"""

        parser = BBCWorldParser()
        # Modify to accept any news for this test
        parser._is_disaster_related = lambda t, d: True

        events = parser.parse(minimal_rss)
        assert len(events) == 1
        assert events[0].title == "Test Event"
        assert events[0].description == ""  # Missing but handled

    def test_parse_with_unicode(self):
        """Test parsing with unicode characters."""
        unicode_rss = """<?xml version="1.0" encoding="UTF-8"?>
        <rss><channel>
        <item>
            <title>Earthquake in Tōkyō (東京)</title>
            <link>https://example.com</link>
            <description>地震 - Earthquake with Japanese text</description>
        </item>
        </channel></rss>"""

        parser = BBCWorldParser()
        parser._is_disaster_related = lambda t, d: True

        events = parser.parse(unicode_rss)
        assert len(events) == 1
        assert "Tōkyō" in events[0].title
        assert "地震" in events[0].description

    def test_parse_malformed_coordinates(self):
        """Test USGS parser handles malformed coordinates."""
        bad_geojson = """{
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "id": "bad-coords",
                "properties": {"mag": 5.0, "title": "Test"},
                "geometry": {"type": "Point", "coordinates": []}
            }]
        }"""

        parser = USGSParser()
        events = parser.parse(bad_geojson)

        assert len(events) == 1
        assert events[0].latitude is None
        assert events[0].longitude is None


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
