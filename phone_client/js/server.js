// WebSocket-based server communication module
// Implements SCHEMA.md for real-time bidirectional communication
import { CONFIG } from '../config.js';

/**
 * Robust WebSocket client with:
 * - Real-time transcript streaming (transcript_chunk)
 * - Live location updates (location_update)
 * - Agent response forwarding (agent_response)
 * - Auto-reconnection with exponential backoff
 * - Offline queue with persistence
 * - Heartbeat for connection health
 */
class ServerClient {
  constructor() {
    this.personId = this.generatePersonId();
    this.chunkIndex = 0;
    this.messageQueue = [];
    this.unackedMessages = new Map(); // Track unacknowledged messages
    this.isOnline = navigator.onLine;

    // WebSocket state
    this.ws = null;
    this.isConnected = false;
    this.shouldReconnect = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;

    // Heartbeat
    this.heartbeatInterval = null;
    this.lastServerTime = null;

    // Callbacks for data updates
    this.onSummaryUpdate = null;
    this.onCallerUpdate = null;
    this.onConnectionChange = null;
    this.onExtractedInfo = null;
    this.onChunkAck = null;
    this.onError = null;

    // Device info
    this.deviceInfo = this.getDeviceInfo();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Load any persisted queue
    this.loadQueue();
  }

  // ==================== MESSAGE ID GENERATION ====================

  /**
   * Generate message ID with prefix
   */
  generateMessageId(prefix = 'msg') {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return `${prefix}_${uuid}`;
  }

  /**
   * Generate a unique person ID for this session
   */
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

  /**
   * Reset person ID for new call session
   */
  resetPersonId() {
    sessionStorage.removeItem('emergency_person_id');
    this.personId = this.generatePersonId();
    this.chunkIndex = 0;
    return this.personId;
  }

  /**
   * Get device info for call_start
   */
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

  /**
   * Connect to central server via WebSocket
   */
  async connect(initialLocation = null) {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    return await this.establishConnection(initialLocation);
  }

  /**
   * Establish WebSocket connection
   */
  async establishConnection(initialLocation = null) {
    if (this.onConnectionChange) {
      this.onConnectionChange(false, 'connecting');
    }

    try {
      // Build WebSocket URL
      const serverUrl = CONFIG.SERVER_URL.replace(/^http/, 'ws');
      const wsUrl = `${serverUrl}/ws/call/${this.personId}`;

      console.log('Connecting to server:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      // Setup event handlers
      this.ws.onopen = () => this.handleOpen(initialLocation);
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (event) => this.handleWebSocketError(event);
      this.ws.onclose = (event) => this.handleClose(event);

      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      if (this.onError) {
        this.onError({ code: 'CONNECTION_FAILED', message: error.message });
      }
      return false;
    }
  }

  /**
   * Handle WebSocket open
   */
  handleOpen(initialLocation) {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    if (this.onConnectionChange) {
      this.onConnectionChange(true, 'connected');
    }

    // Send call_start message
    this.sendCallStart(initialLocation);

    // Start heartbeat
    this.startHeartbeat();

    // Process any queued messages
    this.processQueue();
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('Server message:', data.type, data);

      switch (data.type) {
        case 'connection_ack':
          console.log('Connection acknowledged by server');
          break;

        case 'chunk_ack':
          this.handleChunkAck(data);
          break;

        case 'extracted_info':
          this.handleExtractedInfo(data);
          break;

        case 'summary_update':
          this.handleSummaryUpdate(data);
          break;

        case 'heartbeat_ack':
          this.lastServerTime = data.data?.server_time;
          break;

        case 'error':
          this.handleServerError(data);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing server message:', error, event.data);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleWebSocketError(event) {
    console.error('WebSocket error:', event);
  }

  /**
   * Handle WebSocket close
   */
  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();

    if (this.onConnectionChange) {
      this.onConnectionChange(false, 'disconnected');
    }

    // Attempt reconnection if appropriate
    if (this.shouldReconnect && event.code !== 1000) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    const maxAttempts = CONFIG.RECONNECT?.MAX_ATTEMPTS || 5;
    const initialDelay = CONFIG.RECONNECT?.INITIAL_DELAY || 1000;
    const maxDelay = CONFIG.RECONNECT?.MAX_DELAY || 30000;

    if (this.reconnectAttempts >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      if (this.onConnectionChange) {
        this.onConnectionChange(false, 'failed');
      }
      if (this.onError) {
        this.onError({ code: 'MAX_RECONNECT', message: 'Connection lost. Please refresh.' });
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(initialDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})`);

    if (this.onConnectionChange) {
      this.onConnectionChange(false, 'reconnecting');
    }

    this.reconnectTimer = setTimeout(async () => {
      await this.establishConnection();
    }, delay);
  }

  /**
   * Disconnect from server
   */
  async disconnect(finalLocation = null, durationSeconds = 0, totalChunks = 0) {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    // Send call_end if connected
    if (this.isConnected) {
      this.sendCallEnd(finalLocation, durationSeconds, totalChunks);
      // Give time for message to send
      await this.sleep(100);
    }

    if (this.ws) {
      this.ws.close(1000, 'User ended call');
      this.ws = null;
    }

    this.isConnected = false;
  }

  // ==================== HEARTBEAT ====================

  /**
   * Start heartbeat to keep connection alive
   */
  startHeartbeat() {
    this.stopHeartbeat();

    const interval = CONFIG.PING_TIMEOUT || 10000;
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          message_id: this.generateMessageId('hb'),
          timestamp: new Date().toISOString(),
          data: {
            person_id: this.personId,
          },
        });
      }
    }, interval);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ==================== SEND MESSAGES (Client → Server) ====================

  /**
   * Send message via WebSocket
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      this.queueMessage(message);
      return false;
    }
  }

  /**
   * Format location object according to SCHEMA.md
   */
  formatLocation(location) {
    if (!location) return null;

    return {
      lat: location.lat,
      lng: location.lng,
      altitude: location.altitude ?? null,
      accuracy: location.accuracy ?? null,
      altitude_accuracy: location.altitudeAccuracy ?? null,
      heading: location.heading ?? null,
      speed: location.speed ?? null,
      timestamp: location.timestamp || new Date().toISOString(),
      source: location.source || 'gps',
    };
  }

  /**
   * Send call_start message
   */
  sendCallStart(initialLocation) {
    const message = {
      type: 'call_start',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        device: this.deviceInfo,
        initial_location: this.formatLocation(initialLocation),
      },
    };

    this.send(message);
  }

  /**
   * Send transcript_chunk message
   * @param {string} transcript - The transcribed text
   * @param {Object} location - Full location object from geoMarker
   * @param {boolean} isFinal - Whether transcript is final
   * @param {string} conversationId - ElevenLabs conversation ID
   * @param {string} language - Detected language
   * @param {number} confidence - Transcript confidence
   */
  sendTranscriptChunk(transcript, location, isFinal = false, elevenLabsData = {}) {
    const messageId = this.generateMessageId('msg');
    const chunkIndex = this.chunkIndex++;

    const message = {
      type: 'transcript_chunk',
      message_id: messageId,
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        chunk_index: chunkIndex,
        transcript: {
          text: transcript,
          is_final: isFinal,
          language: elevenLabsData.language || 'en',
          confidence: elevenLabsData.confidence || null,
        },
        location: this.formatLocation(location),
        elevenlabs: {
          conversation_id: elevenLabsData.conversationId || null,
          user_transcript: transcript,
          is_final: isFinal,
        },
      },
    };

    // Track unacked messages for potential resend
    this.unackedMessages.set(messageId, {
      message,
      timestamp: Date.now(),
      retries: 0,
    });

    const sent = this.send(message);

    // If not sent (offline), queue will handle it
    if (!sent) {
      console.log(`Transcript queued (offline): chunk ${chunkIndex}`);
    }

    return messageId;
  }

  /**
   * Send agent_response message (for logging AI responses to server)
   */
  sendAgentResponse(agentText, location, conversationId) {
    const chunkIndex = this.chunkIndex++;

    const message = {
      type: 'agent_response',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        chunk_index: chunkIndex,
        agent: {
          text: agentText,
          conversation_id: conversationId || null,
        },
        location: this.formatLocation(location),
      },
    };

    this.send(message);
  }

  /**
   * Send location_update message (periodic location without speech)
   */
  sendLocationUpdate(location, movement = null) {
    const message = {
      type: 'location_update',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        location: this.formatLocation(location),
        movement: movement
          ? {
              distance_from_start: movement.distanceFromStart || 0,
              total_distance: movement.totalDistance || 0,
              average_speed: movement.averageSpeed || 0,
            }
          : null,
      },
    };

    this.send(message);
  }

  /**
   * Send call_end message
   */
  sendCallEnd(finalLocation, durationSeconds = 0, totalChunks = 0, conversationId = null) {
    const message = {
      type: 'call_end',
      message_id: this.generateMessageId('msg'),
      timestamp: new Date().toISOString(),
      data: {
        person_id: this.personId,
        duration_seconds: durationSeconds,
        total_chunks: totalChunks || this.chunkIndex,
        final_location: this.formatLocation(finalLocation),
        elevenlabs: {
          conversation_id: conversationId,
        },
      },
    };

    this.send(message);
  }

  // ==================== HANDLE SERVER MESSAGES (Server → Client) ====================

  /**
   * Handle chunk acknowledgment
   */
  handleChunkAck(data) {
    const { chunk_index, status } = data.data || {};
    console.log(`Chunk ${chunk_index} acknowledged: ${status}`);

    // Remove from unacked messages
    // Find by chunk_index since we don't track message_id → chunk_index mapping
    for (const [messageId, entry] of this.unackedMessages) {
      if (entry.message?.data?.chunk_index === chunk_index) {
        this.unackedMessages.delete(messageId);
        break;
      }
    }

    if (this.onChunkAck) {
      this.onChunkAck(chunk_index, status);
    }
  }

  /**
   * Handle extracted info from LLM analysis
   */
  handleExtractedInfo(data) {
    const extraction = data.data?.extraction;
    if (!extraction) return;

    console.log('Extracted info:', extraction);

    if (this.onExtractedInfo) {
      this.onExtractedInfo(extraction);
    }

    // Also update caller callback if set
    if (this.onCallerUpdate) {
      this.onCallerUpdate({ extracted_info: extraction });
    }
  }

  /**
   * Handle summary update broadcast
   */
  handleSummaryUpdate(data) {
    const summary = data.data?.summary;
    if (!summary) return;

    console.log('Summary update:', summary);

    if (this.onSummaryUpdate) {
      this.onSummaryUpdate(summary);
    }
  }

  /**
   * Handle server error
   */
  handleServerError(data) {
    const error = data.data || {};
    console.error('Server error:', error);

    if (this.onError) {
      this.onError(error);
    }
  }

  // ==================== OFFLINE SUPPORT ====================

  /**
   * Queue message for later sending
   */
  queueMessage(message) {
    this.messageQueue.push({
      ...message,
      queued_at: new Date().toISOString(),
    });
    this.saveQueue();
    console.log(`Message queued. Queue size: ${this.messageQueue.length}`);
  }

  /**
   * Save queue to localStorage
   */
  saveQueue() {
    try {
      localStorage.setItem('emergency_message_queue', JSON.stringify(this.messageQueue));
    } catch (e) {
      console.error('Failed to save queue:', e);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    try {
      const saved = localStorage.getItem('emergency_message_queue');
      if (saved) {
        this.messageQueue = JSON.parse(saved);
      }
    } catch (e) {
      this.messageQueue = [];
    }
  }

  /**
   * Handle coming back online
   */
  handleOnline() {
    this.isOnline = true;
    console.log('Back online');

    // If we should be connected, try to reconnect
    if (this.shouldReconnect && !this.isConnected) {
      this.establishConnection();
    }
  }

  /**
   * Handle going offline
   */
  handleOffline() {
    this.isOnline = false;
    console.log('Offline. Messages will be queued.');
  }

  /**
   * Process queued messages
   */
  async processQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue[0];
      const sent = this.send(message);

      if (sent) {
        this.messageQueue.shift();
        this.saveQueue();
        console.log(`Queued message sent. ${this.messageQueue.length} remaining.`);
        // Small delay between messages
        await this.sleep(50);
      } else {
        break;
      }
    }
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Send transcript (simplified interface matching old API)
   */
  sendTranscript(transcript, location, isFinal = false, elevenLabsData = {}) {
    return this.sendTranscriptChunk(transcript, location, isFinal, elevenLabsData);
  }

  /**
   * Upload location update (simplified interface)
   */
  uploadLocation(location, movement = null) {
    if (!this.isConnected) return;
    this.sendLocationUpdate(location, movement);
  }

  /**
   * Start periodic location updates
   */
  startLocationUpdates(getLocationFn, intervalMs = 10000) {
    this.stopLocationUpdates();

    this._locationUpdateInterval = setInterval(() => {
      const location = getLocationFn();
      if (location) {
        this.uploadLocation(location);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic location updates
   */
  stopLocationUpdates() {
    if (this._locationUpdateInterval) {
      clearInterval(this._locationUpdateInterval);
      this._locationUpdateInterval = null;
    }
  }

  /**
   * End call (simplified interface)
   */
  async endCall(finalLocation = null, durationSeconds = 0, conversationId = null) {
    await this.disconnect(finalLocation, durationSeconds, this.chunkIndex, conversationId);
  }

  // ==================== HTTP FALLBACK FOR DOWNLOADS ====================

  /**
   * Get disaster summary via HTTP (fallback/polling)
   */
  async getSummary() {
    try {
      const url = `${CONFIG.SERVER_URL}/summary`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to get summary: ${response.status}`);
      }

      const summary = await response.json();

      if (this.onSummaryUpdate) {
        this.onSummaryUpdate(summary);
      }

      return summary;
    } catch (error) {
      console.error('Error fetching summary:', error);
      return null;
    }
  }

  /**
   * Get caller data via HTTP
   */
  async getCallerData(personId = null) {
    try {
      const id = personId || this.personId;
      const url = `${CONFIG.SERVER_URL}/caller/${encodeURIComponent(id)}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get caller: ${response.status}`);
      }

      const callerData = await response.json();

      if (this.onCallerUpdate && (!personId || personId === this.personId)) {
        this.onCallerUpdate(callerData);
      }

      return callerData;
    } catch (error) {
      console.error('Error fetching caller data:', error);
      return null;
    }
  }

  /**
   * Health check via HTTP
   */
  async healthCheck() {
    try {
      const url = `${CONFIG.SERVER_URL}/health`;
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Start polling for summary updates (fallback)
   */
  startSummaryPolling(intervalMs = 5000) {
    this.stopSummaryPolling();
    this.getSummary();
    this._summaryPollInterval = setInterval(() => {
      this.getSummary();
    }, intervalMs);
  }

  /**
   * Stop polling for summary updates
   */
  stopSummaryPolling() {
    if (this._summaryPollInterval) {
      clearInterval(this._summaryPollInterval);
      this._summaryPollInterval = null;
    }
  }

  // ==================== CALLBACKS ====================

  setOnSummaryUpdate(callback) {
    this.onSummaryUpdate = callback;
  }

  setOnCallerUpdate(callback) {
    this.onCallerUpdate = callback;
  }

  setOnConnectionChange(callback) {
    this.onConnectionChange = callback;
  }

  setOnExtractedInfo(callback) {
    this.onExtractedInfo = callback;
  }

  setOnError(callback) {
    this.onError = callback;
  }

  // ==================== UTILITIES ====================

  getPersonId() {
    return this.personId;
  }

  getQueueSize() {
    return this.messageQueue.length;
  }

  getIsConnected() {
    return this.isConnected;
  }

  getIsOnline() {
    return this.isOnline;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const serverClient = new ServerClient();
