#!/usr/bin/env python3
"""Geospatial utility functions for status inference."""
import math
from typing import List, Optional, Tuple
from database.db import LocationPoint


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth.

    Args:
        lat1, lon1: First point coordinates in degrees
        lat2, lon2: Second point coordinates in degrees

    Returns:
        Distance in meters
    """
    # Earth radius in meters
    R = 6371000

    # Convert to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def calculate_velocity(location_history: List[LocationPoint], window_seconds: int = 60) -> float:
    """
    Calculate velocity based on recent location history.

    Args:
        location_history: List of LocationPoint objects (must be sorted by timestamp)
        window_seconds: Time window to consider for velocity calculation

    Returns:
        Velocity in meters per second, or 0.0 if insufficient data
    """
    if len(location_history) < 2:
        return 0.0

    # Get most recent location
    latest = location_history[-1]
    current_time = latest.timestamp

    # Find locations within time window
    recent_locations = [
        loc for loc in location_history
        if current_time - loc.timestamp <= window_seconds
    ]

    if len(recent_locations) < 2:
        return 0.0

    # Calculate total distance traveled
    total_distance = 0.0
    for i in range(1, len(recent_locations)):
        prev = recent_locations[i - 1]
        curr = recent_locations[i]
        total_distance += haversine_distance(prev.lat, prev.lon, curr.lat, curr.lon)

    # Calculate time span
    time_span = recent_locations[-1].timestamp - recent_locations[0].timestamp

    if time_span == 0:
        return 0.0

    return total_distance / time_span


def is_stationary(location_history: List[LocationPoint], threshold_meters: float = 20.0, window_seconds: int = 120) -> bool:
    """
    Check if user has been stationary within threshold for given time window.

    Args:
        location_history: List of LocationPoint objects (must be sorted by timestamp)
        threshold_meters: Maximum movement allowed to be considered stationary
        window_seconds: Time window to check

    Returns:
        True if stationary, False otherwise
    """
    if len(location_history) < 2:
        return True  # Insufficient data, assume stationary

    # Get most recent location
    latest = location_history[-1]
    current_time = latest.timestamp

    # Find locations within time window
    recent_locations = [
        loc for loc in location_history
        if current_time - loc.timestamp <= window_seconds
    ]

    if len(recent_locations) < 2:
        return True

    # Check if all recent locations are within threshold of latest location
    for loc in recent_locations:
        distance = haversine_distance(latest.lat, latest.lon, loc.lat, loc.lon)
        if distance > threshold_meters:
            return False

    return True


def find_nearest_hospital(user_lat: float, user_lon: float, hospitals: List[dict]) -> Optional[dict]:
    """
    Find the nearest hospital to a user's location.

    Args:
        user_lat: User's latitude
        user_lon: User's longitude
        hospitals: List of hospital dicts with 'lat' and 'lon' keys

    Returns:
        Hospital dict with added 'distance' key, or None if no hospitals
    """
    if not hospitals:
        return None

    nearest = None
    min_distance = float('inf')

    for hospital in hospitals:
        distance = haversine_distance(user_lat, user_lon, hospital['lat'], hospital['lon'])
        if distance < min_distance:
            min_distance = distance
            nearest = hospital.copy()
            nearest['distance'] = distance

    return nearest


def calculate_proximity(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate proximity (distance) between two points.
    Alias for haversine_distance for semantic clarity.

    Returns:
        Distance in meters
    """
    return haversine_distance(lat1, lon1, lat2, lon2)


def get_latest_location(location_history: List[LocationPoint]) -> Optional[LocationPoint]:
    """
    Get the most recent location from history.

    Returns:
        Latest LocationPoint or None if empty
    """
    if not location_history:
        return None
    return location_history[-1]


def get_location_at_time(location_history: List[LocationPoint], timestamp: float) -> Optional[LocationPoint]:
    """
    Get the location closest to a specific timestamp.

    Args:
        location_history: List of LocationPoint objects
        timestamp: Target timestamp

    Returns:
        Closest LocationPoint or None if empty
    """
    if not location_history:
        return None

    # Find location with minimum time difference
    closest = min(location_history, key=lambda loc: abs(loc.timestamp - timestamp))
    return closest
