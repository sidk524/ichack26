// WebSocket-based server communication module
// Simplified ONE-WAY: Client → Server only
import { CONFIG } from '../config.js';

/**
 * Lightweight WebSocket client for sending data TO server only.
 * No acknowledgments, no polling, no server responses.
 * Minimal memory footprint.
 */
class ServerClient {
  constructor() {
    this.personId = this.generatePersonId();
    this.chunkIndex = 0;
    this.isOnline = navigator.onLine;

    // WebSocket state
    this.ws = null;
    this.isConnected = false;
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;

    // Single callback for connection state
    this.onConnectionChange = null;

    // Device info
    this.deviceInfo = this.getDeviceInfo();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  // ==================== ID GENERATION ====================

  generateMessageId(prefix = 'msg') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generatePersonId() {
    let personId = sessionStorage.getItem('emergency_person_id');
    if (!personId) {
      personId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      sessionStorage.setItem('emergency_person_id', personId);
    }
    return personId;
  }

  resetPersonId() {
    sessionStorage.removeItem('emergency_person_id');
    this.personId = this.generatePersonId();
    this.chunkIndex = 0;
    return this.personId;
  }

  getDeviceInfo() {
    const ua = navigator.userAgent;
    let platform = 'unknown';
    let browser = 'unknown';

    if (/iPhone|iPad|iPod/.test(ua)) platform = 'iOS';
    else if (/Android/.test(ua)) platform = 'Android';
    else if (/Windows/.test(ua)) platform = 'Windows';
    else if (/Mac/.test(ua)) platform = 'macOS';
    else if (/Linux/.test(ua)) platform = 'Linux';

    if (/Chrome/.test(ua)) browser = 'Chrome';
    else if (/Safari/.test(ua)) browser = 'Safari';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Edge/.test(ua)) browser = 'Edge';

    return { platform, browser, user_agent: ua };
  }

  // ==================== WEBSOCKET CONNECTION ====================

  async connect(initialLocation = null) {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    return await this.establishConnection(initialLocation);
  }

  async establishConnection(initialLocation = null) {
    if (this.onConnectionChange) {
      this.onConnectionChange(false, 'connecting');
    }

    try {
      const serverUrl = CONFIG.SERVER_URL.replace(/^http/, 'ws');
      const wsUrl = `${serverUrl}/phone_client_in`;

      console.log('Connecting to server:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => this.handleOpen(initialLocation);
      this.ws.onmessage = (event) => {
        console.log('WS message from server:', event.data);
        if (window.debugLog) window.debugLog('ws', `Server: ${event.data.substring(0, 100)}`);
      };
      this.ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        if (window.debugLog) window.debugLog('error', `WS error: ${e.message || 'unknown'}`);
      };
      this.ws.onclose = (event) => {
        console.log('WS closed:', event.code, event.reason);
        if (window.debugLog) window.debugLog('ws', `Closed: ${event.code} ${event.reason}`);
        this.handleClose(event);
      };

      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      return false;
    }
  }

  handleOpen(initialLocation) {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    if (this.onConnectionChange) {
      this.onConnectionChange(true, 'connected');
    }

    // Send call_start
    this.sendCallStart(initialLocation);
  }

  handleClose(event) {
    console.log('WebSocket closed:', event.code);
    this.isConnected = false;

    if (this.onConnectionChange) {
      this.onConnectionChange(false, 'disconnected');
    }

    if (this.shouldReconnect && event.code !== 1000) {
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    const maxAttempts = 5;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    if (this.reconnectAttempts >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      if (this.onConnectionChange) {
        this.onConnectionChange(false, 'failed');
      }
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    if (this.onConnectionChange) {
      this.onConnectionChange(false, 'reconnecting');
    }

    this.reconnectTimer = setTimeout(() => this.establishConnection(), delay);
  }

  async disconnect(finalLocation = null, durationSeconds = 0) {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.isConnected) {
      // Send final transcript with is_final=true to properly close server session
      this.sendFinalTranscript('Call ended', finalLocation);
      await new Promise(r => setTimeout(r, 200)); // Let message send
    }

    if (this.ws) {
      this.ws.close(1000, 'User ended call');
      this.ws = null;
    }

    this.isConnected = false;
  }

  // ==================== SEND MESSAGES (Fire & Forget) ====================

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const json = JSON.stringify(message);
        console.log('WS sending:', message.type, json.substring(0, 200));
        if (window.debugLog) window.debugLog('ws', `Send: ${message.type}`);
        this.ws.send(json);
        return true;
      } catch (error) {
        console.error('Send error:', error);
        if (window.debugLog) window.debugLog('error', `Send fail: ${error.message}`);
        return false;
      }
    }
    return false;
  }

  formatLocation(location) {
    if (!location) return null;
    return {
      lat: location.lat,
      lng: location.lng,
      altitude: location.altitude ?? null,
      accuracy: location.accuracy ?? null,
      timestamp: location.timestamp || new Date().toISOString(),
      source: location.source || 'gps',
    };
  }

  sendCallStart(initialLocation) {
    this.send({
      type: 'call_start',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        device: this.deviceInfo,
        initial_location: this.formatLocation(initialLocation),
      },
    });
  }

  sendTranscript(transcript, location, isFinal = false, elevenLabsData = {}) {
    const chunkIndex = this.chunkIndex++;

    // IMPORTANT: Never send is_final=true during call - server closes connection on is_final!
    // Only send is_final=true when explicitly ending the call
    this.send({
      type: 'transcript_chunk',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        chunk_index: chunkIndex,
        transcript: {
          text: transcript,
          is_final: false,  // Always false during active call
          language: elevenLabsData.language || 'en',
        },
        location: this.formatLocation(location),
      },
    });

    return chunkIndex;
  }

  // Send final transcript to close the call properly
  sendFinalTranscript(transcript, location) {
    this.send({
      type: 'transcript_chunk',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        chunk_index: this.chunkIndex++,
        transcript: {
          text: transcript || 'Call ended',
          is_final: true,  // This will close the server connection
          language: 'en',
        },
        location: this.formatLocation(location),
      },
    });
  }

  sendAgentResponse(agentText, location, conversationId) {
    this.send({
      type: 'agent_response',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        text: agentText,
        conversation_id: conversationId || null,
        location: this.formatLocation(location),
      },
    });
  }

  sendLocationUpdate(location) {
    this.send({
      type: 'location_update',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        location: this.formatLocation(location),
      },
    });
  }

  sendCallEnd(finalLocation, durationSeconds = 0) {
    this.send({
      type: 'call_end',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        duration_seconds: durationSeconds,
        total_chunks: this.chunkIndex,
        final_location: this.formatLocation(finalLocation),
      },
    });
  }

  // ==================== LOCATION UPDATES ====================

  startLocationUpdates(getLocationFn, intervalMs = 10000) {
    this.stopLocationUpdates();
    this._locationInterval = setInterval(() => {
      const location = getLocationFn();
      if (location && this.isConnected) {
        this.sendLocationUpdate(location);
      }
    }, intervalMs);
  }

  stopLocationUpdates() {
    if (this._locationInterval) {
      clearInterval(this._locationInterval);
      this._locationInterval = null;
    }
  }

  // ==================== SIMPLIFIED INTERFACE ====================

  async endCall(finalLocation = null, durationSeconds = 0) {
    await this.disconnect(finalLocation, durationSeconds);
  }

  async healthCheck() {
    const url = `${CONFIG.SERVER_URL}/health`;
    console.log('Health check URL:', url);
    if (window.debugLog) window.debugLog('info', `Health check: ${url}`);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      console.log('Health check response:', response.status);
      if (window.debugLog) window.debugLog('info', `Health response: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error('Health check error:', error);
      if (window.debugLog) window.debugLog('error', `Health error: ${error.message}`);
      return false;
    }
  }

  handleOnline() {
    this.isOnline = true;
    if (this.shouldReconnect && !this.isConnected) {
      this.establishConnection();
    }
  }

  handleOffline() {
    this.isOnline = false;
  }

  // ==================== CALLBACKS & GETTERS ====================

  setOnConnectionChange(callback) {
    this.onConnectionChange = callback;
  }

  // Stubs for compatibility with app.js
  setOnSummaryUpdate() {}
  setOnCallerUpdate() {}
  setOnExtractedInfo() {}
  setOnError() {}
  startSummaryPolling() {}
  stopSummaryPolling() {}

  getPersonId() { return this.personId; }
  getQueueSize() { return 0; }
  getIsConnected() { return this.isConnected; }
  getIsOnline() { return this.isOnline; }
}

// Export singleton
export const serverClient = new ServerClient();
