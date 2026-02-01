#!/usr/bin/env python3
"""
OpenRouteService integration for calculating safe routes avoiding danger zones.
"""
import os
import json
from typing import List, Dict, Any, Optional, Tuple
import aiohttp
from database.postgres import list_danger_zones


class RouteService:
    """Service for calculating routes that avoid danger zones using OpenRouteService API."""

    def __init__(self):
        self.api_key = os.getenv('ORS_API_KEY', '')
        self.base_url = 'https://api.openrouteservice.org/v2'
        self.default_profile = 'driving-car'

    async def get_danger_zones_as_geojson(self) -> Dict[str, Any]:
        """
        Fetch all active danger zones and convert to GeoJSON FeatureCollection.
        """
        zones = await list_danger_zones()

        features = []
        for zone in zones:
            if zone.get('is_active', False) and zone.get('vertices'):
                # Convert vertices to GeoJSON polygon
                coordinates = [[
                    [vertex['lon'], vertex['lat']]
                    for vertex in zone['vertices']
                ]]

                # Close the polygon by adding the first point at the end if not already closed
                if coordinates[0] and coordinates[0][0] != coordinates[0][-1]:
                    coordinates[0].append(coordinates[0][0])

                feature = {
                    "type": "Feature",
                    "properties": {
                        "zone_id": zone['zone_id'],
                        "category": zone['category'],
                        "disaster_type": zone['disaster_type'],
                        "severity": zone['severity'],
                        "description": zone['description'],
                        "recommended_action": zone['recommended_action']
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": coordinates
                    }
                }
                features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features
        }

    async def calculate_route(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
        profile: Optional[str] = None,
        avoid_polygons: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate a route from start to end, optionally avoiding active danger zones.

        Args:
            start_lat: Starting point latitude
            start_lon: Starting point longitude
            end_lat: Ending point latitude
            end_lon: Ending point longitude
            profile: Routing profile (driving-car, cycling-regular, foot-walking, etc.)
            avoid_polygons: Whether to avoid danger zone polygons (default: True)

        Returns:
            GeoJSON route, optionally avoiding danger zones
        """
        if not self.api_key:
            raise ValueError("ORS_API_KEY environment variable is not set")

        profile = profile or self.default_profile

        # Build avoid polygons from active danger zones if requested
        avoid_polygons_list = []
        if avoid_polygons:
            # Get all active danger zones
            zones = await list_danger_zones()

            for zone in zones:
                if zone.get('is_active', False) and zone.get('vertices'):
                    # ORS expects coordinates in [lon, lat] format
                    polygon_coords = []
                    for vertex in zone['vertices']:
                        polygon_coords.append([vertex['lon'], vertex['lat']])

                    # Close the polygon if not already closed
                    if polygon_coords and polygon_coords[0] != polygon_coords[-1]:
                        polygon_coords.append(polygon_coords[0])

                    # Only add valid polygons (need at least 4 points for a closed triangle)
                    if len(polygon_coords) >= 4:
                        avoid_polygons_list.append(polygon_coords)

        # Build the request body
        body = {
            "coordinates": [
                [start_lon, start_lat],  # Start point [lon, lat]
                [end_lon, end_lat]        # End point [lon, lat]
            ]
        }

        # Add avoid polygons if any exist
        if avoid_polygons_list:
            # ORS expects avoid_polygons as a GeoJSON MultiPolygon or Polygon
            if len(avoid_polygons_list) == 1:
                # Single polygon
                body["options"] = {
                    "avoid_polygons": {
                        "type": "Polygon",
                        "coordinates": [avoid_polygons_list[0]]
                    }
                }
            else:
                # Multiple polygons
                body["options"] = {
                    "avoid_polygons": {
                        "type": "MultiPolygon",
                        "coordinates": [[polygon] for polygon in avoid_polygons_list]
                    }
                }

        # Make the API request
        url = f"{self.base_url}/directions/{profile}/geojson"
        headers = {
            'Accept': 'application/json, application/geo+json',
            'Content-Type': 'application/json',
            'Authorization': self.api_key
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()

                    # Add metadata about avoided zones
                    if 'features' in data and data['features']:
                        data['features'][0]['properties']['avoided_zones'] = len(avoid_polygons_list)
                        data['features'][0]['properties']['profile'] = profile
                        data['features'][0]['properties']['avoidance_enabled'] = avoid_polygons

                    return {
                        "ok": True,
                        "route": data,
                        "avoided_zones_count": len(avoid_polygons_list),
                        "avoidance_enabled": avoid_polygons
                    }
                else:
                    error_text = await response.text()
                    return {
                        "ok": False,
                        "error": f"OpenRouteService API error: {response.status}",
                        "details": error_text
                    }

    async def calculate_simple_route(
        self,
        start_lat: float,
        start_lon: float,
        end_lat: float,
        end_lon: float,
        profile: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculate a simple route without avoiding danger zones (for comparison).

        Args:
            start_lat: Starting point latitude
            start_lon: Starting point longitude
            end_lat: Ending point latitude
            end_lon: Ending point longitude
            profile: Routing profile

        Returns:
            GeoJSON route without avoidance
        """
        if not self.api_key:
            raise ValueError("ORS_API_KEY environment variable is not set")

        profile = profile or self.default_profile

        # Build the request body (no avoidance)
        body = {
            "coordinates": [
                [start_lon, start_lat],
                [end_lon, end_lat]
            ]
        }

        # Make the API request
        url = f"{self.base_url}/directions/{profile}/geojson"
        headers = {
            'Accept': 'application/json, application/geo+json',
            'Content-Type': 'application/json',
            'Authorization': self.api_key
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=body, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "ok": True,
                        "route": data
                    }
                else:
                    error_text = await response.text()
                    return {
                        "ok": False,
                        "error": f"OpenRouteService API error: {response.status}",
                        "details": error_text
                    }


# Global instance
route_service = RouteService()
