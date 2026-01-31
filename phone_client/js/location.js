// Backwards-compatible location module
// Re-exports from geomarker.js for API compatibility
import { geoMarker } from './geomarker.js';

/**
 * Location tracker wrapper for backwards compatibility
 * Delegates to geoMarker singleton
 */
export const locationTracker = {
  isSupported: () => geoMarker.isSupported(),

  startTracking: (onUpdate, onError) => {
    return geoMarker.startTracking(onUpdate, onError);
  },

  stopTracking: () => {
    geoMarker.stopTracking();
  },

  getLocation: () => {
    return geoMarker.getPosition();
  },

  formatForDisplay: () => {
    return geoMarker.formatForDisplay();
  },
};
