// GeoMarker module for live location tracking and display
import { CONFIG } from '../config.js';

/**
 * GeoMarker class for real-time location tracking and visualization
 * - Tracks user's GPS position continuously
 * - Displays position on an embedded map (if enabled)
 * - Provides location data for server uploads
 * - Calculates movement speed and direction
 */
class GeoMarker {
  constructor() {
    this.currentPosition = null;
    this.positionHistory = [];
    this.maxHistoryLength = 100;
    this.watchId = null;
    this.mapElement = null;
    this.mapInstance = null;
    this.marker = null;
    this.accuracyCircle = null;
    this.pathLine = null;

    // Callbacks
    this.onPositionUpdate = null;
    this.onError = null;
    this.onMovement = null;

    // Movement tracking
    this.lastMovementTime = null;
    this.totalDistance = 0;
    this.averageSpeed = 0;

    // Options
    this.options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      showMap: false,
      trackPath: true,
      calculateSpeed: true,
    };
  }

  /**
   * Initialize the geo marker
   * @param {Object} options - Configuration options
   * @param {HTMLElement} mapContainer - Optional container for map display
   */
  async init(options = {}, mapContainer = null) {
    this.options = { ...this.options, ...options };

    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    if (mapContainer && this.options.showMap) {
      this.mapElement = mapContainer;
      await this.initMap();
    }

    return true;
  }

  /**
   * Check if geolocation is supported
   */
  isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Start tracking location
   * @param {Function} onUpdate - Callback for position updates
   * @param {Function} onError - Callback for errors
   */
  startTracking(onUpdate, onError) {
    this.onPositionUpdate = onUpdate;
    this.onError = onError;

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge,
      }
    );

    // Watch for position changes
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: this.options.timeout,
        maximumAge: this.options.maximumAge,
      }
    );

    console.log('GeoMarker: Started tracking');
    return true;
  }

  /**
   * Stop tracking location
   */
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    console.log('GeoMarker: Stopped tracking');
  }

  /**
   * Handle new position data
   */
  handlePosition(position) {
    const newPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp).toISOString(),
      source: 'gps',
    };

    // Calculate movement if we have previous position
    if (this.currentPosition && this.options.calculateSpeed) {
      const movement = this.calculateMovement(this.currentPosition, newPosition);
      if (movement.distance > 0) {
        this.totalDistance += movement.distance;
        newPosition.calculatedSpeed = movement.speed;
        newPosition.bearing = movement.bearing;

        if (this.onMovement) {
          this.onMovement(movement);
        }
      }
    }

    this.currentPosition = newPosition;

    // Add to history
    if (this.options.trackPath) {
      this.positionHistory.push(newPosition);
      if (this.positionHistory.length > this.maxHistoryLength) {
        this.positionHistory.shift();
      }
    }

    // Update map if enabled
    if (this.mapInstance) {
      this.updateMapMarker(newPosition);
    }

    // Notify callback
    if (this.onPositionUpdate) {
      this.onPositionUpdate(newPosition);
    }
  }

  /**
   * Handle geolocation errors
   */
  handleError(error) {
    let message;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
      default:
        message = 'Unknown location error';
    }

    console.error('GeoMarker error:', message);

    if (this.onError) {
      this.onError(new Error(message));
    }

    // Attempt IP-based fallback
    this.fallbackToIP();
  }

  /**
   * Fallback to IP-based geolocation
   */
  async fallbackToIP() {
    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) throw new Error('IP lookup failed');

      const data = await response.json();
      const fallbackPosition = {
        lat: data.latitude,
        lng: data.longitude,
        accuracy: 5000, // ~5km accuracy for IP
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: new Date().toISOString(),
        source: 'ip-fallback',
        city: data.city,
        region: data.region,
        country: data.country_name,
      };

      this.currentPosition = fallbackPosition;

      if (this.onPositionUpdate) {
        this.onPositionUpdate(fallbackPosition);
      }
    } catch (err) {
      console.error('IP fallback failed:', err);
    }
  }

  /**
   * Calculate movement between two positions
   */
  calculateMovement(from, to) {
    const R = 6371000; // Earth's radius in meters

    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
    const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

    // Haversine formula for distance
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Calculate bearing
    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    // Calculate speed (m/s)
    const timeDiff =
      (new Date(to.timestamp).getTime() - new Date(from.timestamp).getTime()) / 1000;
    const speed = timeDiff > 0 ? distance / timeDiff : 0;

    return {
      distance, // meters
      bearing, // degrees
      speed, // m/s
      timeDiff, // seconds
    };
  }

  /**
   * Initialize map display (using Leaflet if available)
   */
  async initMap() {
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded, skipping map initialization');
      return;
    }

    // Create map
    this.mapInstance = L.map(this.mapElement).setView([0, 0], 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.mapInstance);

    // Create marker for current position
    this.marker = L.marker([0, 0]).addTo(this.mapInstance);

    // Create accuracy circle
    this.accuracyCircle = L.circle([0, 0], {
      radius: 50,
      color: '#3388ff',
      fillColor: '#3388ff',
      fillOpacity: 0.2,
    }).addTo(this.mapInstance);

    // Create path line if tracking
    if (this.options.trackPath) {
      this.pathLine = L.polyline([], {
        color: '#e74c3c',
        weight: 3,
        opacity: 0.7,
      }).addTo(this.mapInstance);
    }
  }

  /**
   * Update map marker position
   */
  updateMapMarker(position) {
    if (!this.mapInstance) return;

    const latLng = [position.lat, position.lng];

    // Update marker
    this.marker.setLatLng(latLng);

    // Update accuracy circle
    this.accuracyCircle.setLatLng(latLng);
    this.accuracyCircle.setRadius(position.accuracy || 50);

    // Update path
    if (this.pathLine && this.options.trackPath) {
      const pathCoords = this.positionHistory.map((p) => [p.lat, p.lng]);
      this.pathLine.setLatLngs(pathCoords);
    }

    // Center map on position
    this.mapInstance.setView(latLng, this.mapInstance.getZoom());
  }

  /**
   * Get current position
   */
  getPosition() {
    return this.currentPosition;
  }

  /**
   * Get position history
   */
  getHistory() {
    return [...this.positionHistory];
  }

  /**
   * Get total distance traveled
   */
  getTotalDistance() {
    return this.totalDistance;
  }

  /**
   * Format position for display
   */
  formatForDisplay() {
    if (!this.currentPosition) {
      return 'Location unavailable';
    }

    const { lat, lng, accuracy, source } = this.currentPosition;
    const latStr = lat.toFixed(6);
    const lngStr = lng.toFixed(6);
    const accStr =
      accuracy < 1000 ? `±${accuracy.toFixed(0)}m` : `±${(accuracy / 1000).toFixed(1)}km`;

    let display = `${latStr}, ${lngStr} (${accStr})`;
    if (source === 'ip-fallback') {
      display += ' [approximate]';
    }

    return display;
  }

  /**
   * Get position as GeoJSON
   */
  toGeoJSON() {
    if (!this.currentPosition) return null;

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [this.currentPosition.lng, this.currentPosition.lat],
      },
      properties: {
        accuracy: this.currentPosition.accuracy,
        altitude: this.currentPosition.altitude,
        timestamp: this.currentPosition.timestamp,
        source: this.currentPosition.source,
      },
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopTracking();

    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }

    this.positionHistory = [];
    this.currentPosition = null;
  }
}

// Export singleton instance
export const geoMarker = new GeoMarker();
