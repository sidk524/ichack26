// Main application logic with WebSocket-based server integration
import { CONFIG } from '../config.js';
import { geoMarker } from './geomarker.js';
import { webSpeechSTT as sttClient } from './web-speech-stt.js';  // Using Web Speech API (no auth needed)
import { serverClient } from './server.js';

/**
 * Emergency Call Application
 * - High-fidelity voice AI with ElevenLabs
 * - Live geo tracking with full location data
 * - WebSocket-based real-time server communication
 * - Robust error handling and reconnection
 */
class EmergencyCallApp {
  constructor() {
    this.isCallActive = false;
    this.isServerConnected = false;
    this.callStartTime = null;
    this.conversationId = null;

    // DOM elements
    this.initDOMElements();

    // Initialize the app
    this.init();
  }

  /**
   * Debug logger - logs to console and debug panel
   */
  debugLog(type, message, data = null) {
    // Use global debugLog from index.html if available
    if (window.debugLog) {
      window.debugLog(type, message, data);
    }
    console.log(`[${type}]`, message, data || '');
  }

  /**
   * Initialize DOM element references
   */
  initDOMElements() {
    this.statusEl = document.getElementById('status');
    this.locationTextEl = document.getElementById('location-text');
    this.callBtn = document.getElementById('call-btn');
    this.transcriptEl = document.getElementById('transcript');
    this.transcriptContainer = document.getElementById('transcript-container');
    this.errorContainer = document.getElementById('error-container');
    this.errorMessage = document.getElementById('error-message');
    this.agentResponseEl = document.getElementById('agent-response');
    this.agentResponseContainer = document.getElementById('agent-response-container');
    this.volumeSlider = document.getElementById('volume-slider');
    this.connectionIndicator = document.getElementById('connection-indicator');
    this.personIdEl = document.getElementById('person-id');
    this.summaryContainer = document.getElementById('summary-container');
    this.summaryContent = document.getElementById('summary-content');
    this.mapContainer = document.getElementById('map-container');
    this.extractedInfoEl = document.getElementById('extracted-info');
    this.debugQueueEl = document.getElementById('debug-queue');
    this.debugWsEl = document.getElementById('debug-ws');
  }

  /**
   * Initialize the application
   */
  async init() {
    this.debugLog('info', 'Initializing Emergency Call App...');
    this.debugLog('info', `Server URL: ${CONFIG.SERVER_URL}`);

    // Setup server callbacks
    this.setupServerCallbacks();

    // Check server health
    this.debugLog('info', 'Checking server health...');
    await this.checkServerHealth();

    // Initialize geo tracking
    await this.initGeoTracking();

    // Setup UI event handlers
    this.setupEventHandlers();

    // Display person ID
    const personId = serverClient.getPersonId();
    if (this.personIdEl) {
      this.personIdEl.textContent = personId.substring(0, 8) + '...';
    }
    if (window.updatePersonId) {
      window.updatePersonId(personId);
    }

    // Update debug info
    this.updateDebugInfo();

    console.log('Emergency Call App initialized');
    console.log('Person ID:', serverClient.getPersonId());
  }

  /**
   * Setup server client callbacks
   */
  setupServerCallbacks() {
    // Handle summary updates from server (via WebSocket or polling)
    serverClient.setOnSummaryUpdate((summary) => {
      this.handleSummaryUpdate(summary);
    });

    // Handle caller data updates (extracted info)
    serverClient.setOnCallerUpdate((callerData) => {
      this.handleCallerUpdate(callerData);
    });

    // Handle connection state changes
    serverClient.setOnConnectionChange((isConnected, status) => {
      this.handleConnectionChange(isConnected, status);
    });

    // Handle extracted info directly from WebSocket
    serverClient.setOnExtractedInfo((extraction) => {
      this.handleExtractedInfo(extraction);
    });

    // Handle server errors
    serverClient.setOnError((error) => {
      this.handleServerError(error);
    });
  }

  /**
   * Check server health on startup
   */
  async checkServerHealth() {
    const isHealthy = await serverClient.healthCheck();
    this.isServerConnected = isHealthy;
    this.updateConnectionIndicator(isHealthy, isHealthy ? 'online' : 'offline');

    if (!isHealthy) {
      console.warn('Server health check failed - will retry on call start');
    }
  }

  /**
   * Initialize geo tracking
   */
  async initGeoTracking() {
    try {
      // Initialize geomarker with optional map
      await geoMarker.init(
        {
          enableHighAccuracy: true,
          trackPath: true,
          calculateSpeed: true,
          showMap: !!this.mapContainer,
        },
        this.mapContainer
      );

      // Start tracking
      geoMarker.startTracking(
        (position) => this.handleLocationUpdate(position),
        (error) => this.handleLocationError(error)
      );
    } catch (error) {
      console.error('Failed to initialize geo tracking:', error);
      if (this.locationTextEl) {
        this.locationTextEl.textContent = 'Location unavailable';
      }
    }
  }

  /**
   * Setup UI event handlers
   */
  setupEventHandlers() {
    // Call button
    if (this.callBtn) {
      this.callBtn.addEventListener('click', () => this.toggleCall());
    }

    // Volume slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        sttClient.setVolume(parseFloat(e.target.value));
      });
    }

    // Page unload
    window.addEventListener('beforeunload', (e) => {
      if (this.isCallActive) {
        e.preventDefault();
        e.returnValue = 'You have an active emergency call. Are you sure you want to leave?';
        this.endCall();
      }
    });

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isCallActive) {
        console.log('Tab hidden during active call - maintaining connection');
      }
    });

    // Retry button in error container
    const retryBtn = document.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.hideError();
        this.checkServerHealth();
      });
    }
  }

  /**
   * Update debug info display
   */
  updateDebugInfo() {
    if (this.debugQueueEl) {
      this.debugQueueEl.textContent = serverClient.getQueueSize();
    }
    if (this.debugWsEl) {
      this.debugWsEl.textContent = serverClient.getIsConnected() ? 'Connected' : 'Disconnected';
    }
  }

  // ==================== CALL MANAGEMENT ====================

  /**
   * Toggle emergency call on/off
   */
  async toggleCall() {
    if (this.isCallActive) {
      await this.endCall();
    } else {
      await this.startCall();
    }
  }

  /**
   * Start emergency call
   */
  async startCall() {
    this.hideError();
    this.debugLog('info', 'Starting call...');

    // Check microphone support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.debugLog('error', 'Microphone not supported');
      this.showError('Microphone access is not supported in this browser.');
      return;
    }

    // Skip health check - just try to connect directly
    this.debugLog('info', 'Skipping health check, connecting directly...');

    this.updateStatus('connecting', 'Connecting...');
    this.callBtn?.classList.add('active');
    this.updateButtonText('End Call', '📴');

    // Clear previous transcripts
    this.clearTranscripts();

    // Reset person ID for new call
    const newPersonId = serverClient.resetPersonId();
    if (this.personIdEl) {
      this.personIdEl.textContent = newPersonId.substring(0, 8) + '...';
    }
    if (window.updatePersonId) {
      window.updatePersonId(newPersonId);
    }

    // Get initial location for call_start
    const initialLocation = geoMarker.getPosition();
    this.debugLog('info', `Location: ${initialLocation ? `${initialLocation.lat}, ${initialLocation.lng}` : 'unavailable'}`);

    // Connect to server WebSocket first
    this.debugLog('ws', 'Connecting to server WebSocket...');
    const serverConnected = await serverClient.connect(initialLocation);
    if (!serverConnected) {
      this.debugLog('error', 'Server WebSocket connection failed');
      this.showError('Failed to connect to server. Please try again.');
      this.callBtn?.classList.remove('active');
      this.updateButtonText('Start Emergency Call', '📞');
      this.updateStatus('ready', 'Ready');
      return;
    }
    this.debugLog('success', 'Server WebSocket connected');

    // Connect to Speech Recognition (Speech-to-Text only)
    this.debugLog('stt', 'Connecting to Speech Recognition...');
    const elevenLabsConnected = await sttClient.connect({
      onTranscript: (transcript, isFinal) => this.handleTranscript(transcript, isFinal),
      onPartialTranscript: (transcript) => this.handleTranscript(transcript, false),
      onStatusChange: (status) => this.handleStatusChange(status),
      onError: (error) => this.handleError(error),
    });

    if (elevenLabsConnected) {
      this.debugLog('success', 'Speech Recognition connected - ready to record');
      this.isCallActive = true;
      this.callStartTime = Date.now();
      this.conversationId = sttClient.conversationId;
      this.transcriptContainer?.classList.remove('hidden');
      this.agentResponseContainer?.classList.remove('hidden');

      // Start live location updates to server via WebSocket
      serverClient.startLocationUpdates(
        () => geoMarker.getPosition(),
        CONFIG.LOCATION_UPDATE_INTERVAL
      );

      // Summary updates come via WebSocket, but also poll as fallback
      serverClient.startSummaryPolling(10000);

      this.updateDebugInfo();
    } else {
      // ElevenLabs failed - disconnect server too
      await serverClient.endCall();
      this.callBtn?.classList.remove('active');
      this.updateButtonText('Start Emergency Call', '📞');
      this.updateStatus('ready', 'Ready');
    }
  }

  /**
   * End emergency call
   */
  async endCall() {
    this.isCallActive = false;

    // Calculate call duration
    const durationSeconds = this.callStartTime
      ? Math.floor((Date.now() - this.callStartTime) / 1000)
      : 0;

    // Disconnect from ElevenLabs
    await sttClient.disconnect();

    // Get final location
    const finalLocation = geoMarker.getPosition();

    // End call on server (sends call_end message)
    await serverClient.endCall(finalLocation, durationSeconds, this.conversationId);

    // Stop location updates
    serverClient.stopLocationUpdates();

    // Stop summary polling
    serverClient.stopSummaryPolling();

    // Reset state
    this.callStartTime = null;
    this.conversationId = null;

    // Update UI
    this.callBtn?.classList.remove('active');
    this.updateButtonText('Start Emergency Call', '📞');
    this.updateStatus('ready', 'Ready');
    this.updateDebugInfo();
  }

  /**
   * Clear transcript displays
   */
  clearTranscripts() {
    if (this.transcriptEl) {
      this.transcriptEl.innerHTML = '';
    }
    if (this.agentResponseEl) {
      this.agentResponseEl.innerHTML = '';
    }
    if (this.extractedInfoEl) {
      this.extractedInfoEl.innerHTML = '';
      this.extractedInfoEl.classList.add('hidden');
    }
  }

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle transcript from ElevenLabs
   */
  handleTranscript(transcript, isFinal, words = null) {
    if (!transcript || transcript.trim() === '') return;

    this.debugLog('transcript', `${isFinal ? 'FINAL' : 'partial'}: "${transcript}"`);

    // Display transcript in debug panel
    if (window.showTranscript) {
      window.showTranscript(transcript, isFinal, words);
    }

    // Display transcript in main UI
    this.addTranscriptLine(transcript, 'user', isFinal);

    // Get current location (full data)
    const location = geoMarker.getPosition();

    // Get conversation ID from ElevenLabs
    const conversationId = sttClient.conversationId;

    // Send to server via WebSocket with all ElevenLabs data
    serverClient.sendTranscript(transcript, location, isFinal, {
      conversationId: conversationId,
      language: 'en', // ElevenLabs doesn't always provide this
      confidence: null, // Could be added if available
    });

    this.updateDebugInfo();
  }

  /**
   * Handle agent response text
   */
  handleAgentResponse(response) {
    console.log('Agent response:', response);
    this.addTranscriptLine(response, 'agent', true);

    // Get current location
    const location = geoMarker.getPosition();
    const conversationId = sttClient.conversationId;

    // Send agent response to server for logging
    serverClient.sendAgentResponse(response, location, conversationId);
  }

  /**
   * Handle agent speaking state
   */
  handleAgentSpeaking(isSpeaking) {
    console.log('Agent speaking:', isSpeaking);

    if (isSpeaking) {
      this.statusEl?.classList.add('agent-speaking');
      this.updateStatus('agent-speaking', '🔊 Agent speaking...');
    } else {
      this.statusEl?.classList.remove('agent-speaking');
      if (this.isCallActive) {
        this.updateStatus('recording', '🔴 Recording - Speak now');
      }
    }
  }

  /**
   * Handle status changes from ElevenLabs
   */
  handleStatusChange(status) {
    this.debugLog('stt', `Status: ${status}`);

    // Update STT debug display
    const sttEl = document.getElementById('d-stt');
    if (sttEl) sttEl.textContent = status;

    const statusMap = {
      connecting: ['connecting', 'Connecting...'],
      connected: ['connected', 'Connected'],
      recording: ['recording', '🔴 Recording - Speak now'],
      reconnecting: ['reconnecting', '🔄 Reconnecting...'],
      disconnected: ['disconnected', 'Disconnected'],
    };

    const [statusClass, text] = statusMap[status] || ['unknown', status];
    this.updateStatus(statusClass, text);

    if (status === 'disconnected' && this.isCallActive) {
      this.endCall();
    }
  }

  /**
   * Handle location updates from geo tracker
   */
  handleLocationUpdate(position) {
    if (this.locationTextEl) {
      this.locationTextEl.textContent = geoMarker.formatForDisplay();
    }

    // Update global GPS display
    if (window.updateGPS && position.lat && position.lng) {
      window.updateGPS(position.lat, position.lng);
    }

    // Add visual indicator for accuracy
    if (position.accuracy < 50) {
      this.locationTextEl?.classList.add('high-accuracy');
      this.locationTextEl?.classList.remove('low-accuracy');
    } else if (position.accuracy > 500) {
      this.locationTextEl?.classList.add('low-accuracy');
      this.locationTextEl?.classList.remove('high-accuracy');
    } else {
      this.locationTextEl?.classList.remove('high-accuracy', 'low-accuracy');
    }
  }

  /**
   * Handle location errors
   */
  handleLocationError(error) {
    console.error('Location error:', error);
    if (this.locationTextEl) {
      this.locationTextEl.textContent = error.message || 'Location unavailable';
    }
  }

  /**
   * Handle summary updates from server
   */
  handleSummaryUpdate(summary) {
    console.log('Summary update:', summary);

    if (this.summaryContainer && this.summaryContent) {
      this.summaryContainer.classList.remove('hidden');

      // Format summary for display
      const html = this.formatSummary(summary);
      this.summaryContent.innerHTML = html;
    }
  }

  /**
   * Handle caller data updates
   */
  handleCallerUpdate(callerData) {
    console.log('Caller update:', callerData);

    if (this.extractedInfoEl && callerData.extracted_info) {
      this.handleExtractedInfo(callerData.extracted_info);
    }
  }

  /**
   * Handle extracted info directly
   */
  handleExtractedInfo(info) {
    if (!info || !this.extractedInfoEl) return;

    this.extractedInfoEl.innerHTML = this.formatExtractedInfo(info);
    this.extractedInfoEl.classList.remove('hidden');
  }

  /**
   * Handle connection state changes
   */
  handleConnectionChange(isConnected, status) {
    this.debugLog('ws', `Server ${isConnected ? 'connected' : 'disconnected'}: ${status}`);
    this.isServerConnected = isConnected;
    this.updateConnectionIndicator(isConnected, status);
    this.updateDebugInfo();

    // Update debug panel WS status
    const wsEl = document.getElementById('d-ws');
    if (wsEl) wsEl.textContent = isConnected ? 'on' : 'off';

    if (!isConnected && this.isCallActive && status === 'failed') {
      this.showError('Connection lost. Please refresh the page.');
    }
  }

  /**
   * Handle server errors
   */
  handleServerError(error) {
    this.debugLog('error', `Server error: ${error.message || error}`);
    if (error.message) {
      this.showError(`Server error: ${error.message}`);
    }
  }

  /**
   * Handle errors
   */
  handleError(error) {
    this.debugLog('error', `Error: ${error.message || error}`);
    this.showError(error.message);

    if (this.isCallActive) {
      this.endCall();
    }
  }

  // ==================== UI UPDATES ====================

  /**
   * Update status display
   */
  updateStatus(statusClass, text) {
    if (!this.statusEl) return;
    this.statusEl.className = `status status-${statusClass}`;
    this.statusEl.textContent = text;
  }

  /**
   * Update button text and icon
   */
  updateButtonText(text, icon) {
    const textEl = this.callBtn?.querySelector('.btn-text');
    const iconEl = this.callBtn?.querySelector('.btn-icon');
    if (textEl) textEl.textContent = text;
    if (iconEl) iconEl.textContent = icon;
  }

  /**
   * Update connection indicator
   */
  updateConnectionIndicator(isOnline, status = null) {
    if (!this.connectionIndicator) return;

    const statusText = {
      online: '🟢 Connected',
      offline: '🔴 Offline',
      connecting: '🟡 Connecting...',
      reconnecting: '🟡 Reconnecting...',
      failed: '🔴 Connection Failed',
      connected: '🟢 Connected',
      disconnected: '🔴 Disconnected',
    };

    if (isOnline) {
      this.connectionIndicator.classList.add('online');
      this.connectionIndicator.classList.remove('offline');
      this.connectionIndicator.textContent = statusText[status] || statusText.online;
    } else {
      this.connectionIndicator.classList.add('offline');
      this.connectionIndicator.classList.remove('online');
      this.connectionIndicator.textContent = statusText[status] || statusText.offline;
    }
  }

  /**
   * Add line to transcript display
   */
  addTranscriptLine(text, speaker = 'user', isFinal = true) {
    const container = speaker === 'agent' ? this.agentResponseEl : this.transcriptEl;
    if (!container) return;

    // Handle interim transcripts
    const lastP = container.querySelector('p:last-child');
    if (lastP && !isFinal && lastP.classList.contains('interim')) {
      lastP.textContent = text;
      return;
    }

    if (lastP && lastP.classList.contains('interim')) {
      lastP.classList.remove('interim');
    }

    const p = document.createElement('p');
    p.textContent = text;
    p.classList.add(speaker);
    if (!isFinal) {
      p.classList.add('interim');
    }

    // Add timestamp
    const time = document.createElement('span');
    time.className = 'timestamp';
    time.textContent = new Date().toLocaleTimeString();
    p.appendChild(time);

    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Format summary for display
   */
  formatSummary(summary) {
    if (!summary) return '<p>No summary available</p>';

    return `
      <div class="summary-stats">
        <div class="stat">
          <span class="stat-value">${summary.total_callers || 0}</span>
          <span class="stat-label">Total Callers</span>
        </div>
        <div class="stat">
          <span class="stat-value">${summary.active_callers || 0}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat severity-${(summary.overall_severity || 'unknown').toLowerCase()}">
          <span class="stat-value">${summary.overall_severity || 'Unknown'}</span>
          <span class="stat-label">Severity</span>
        </div>
      </div>
      ${summary.narrative_summary ? `<p class="narrative">${summary.narrative_summary}</p>` : ''}
      ${
        summary.key_findings && summary.key_findings.length > 0
          ? `
        <ul class="findings">
          ${summary.key_findings.map((f) => `<li>${f}</li>`).join('')}
        </ul>
      `
          : ''
      }
    `;
  }

  /**
   * Format extracted info for display
   */
  formatExtractedInfo(info) {
    if (!info) return '';

    const items = [];
    if (info.location) items.push(`📍 ${info.location}`);
    if (info.location_details) items.push(`📍 ${info.location_details}`);
    if (info.disaster_type && info.disaster_type !== 'unknown') {
      items.push(`⚠️ ${info.disaster_type}`);
    }
    if (info.severity && info.severity !== 'unknown') {
      items.push(`🔴 Severity: ${info.severity}`);
    }
    if (info.injuries_reported) items.push(`🤕 Injuries: ${info.injuries_reported}`);
    if (info.people_trapped) items.push(`🆘 Trapped: ${info.people_trapped}`);
    if (info.hazards && info.hazards.length > 0) {
      items.push(`⚠️ Hazards: ${info.hazards.join(', ')}`);
    }
    if (info.resources_needed && info.resources_needed.length > 0) {
      items.push(`🚒 Needed: ${info.resources_needed.join(', ')}`);
    }

    return items.map((item) => `<span class="info-item">${item}</span>`).join('');
  }

  /**
   * Show error message
   */
  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
    }
    this.errorContainer?.classList.remove('hidden');
  }

  /**
   * Hide error message
   */
  hideError() {
    this.errorContainer?.classList.add('hidden');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.emergencyApp = new EmergencyCallApp();
});
