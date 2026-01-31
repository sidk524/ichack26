// ElevenLabs Conversational AI WebSocket handler with robust audio playback
import { CONFIG } from '../config.js';
import { audioCapture } from './audio.js';

/**
 * Robust audio player for streaming TTS responses
 * Handles chunked audio, buffering, and seamless playback
 */
class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentSource = null;
    this.gainNode = null;
    this.nextPlayTime = 0;
    this.onPlaybackStart = null;
    this.onPlaybackEnd = null;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  async init() {
    if (this.audioContext) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: CONFIG.AUDIO.OUTPUT_SAMPLE_RATE || 24000,
    });

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    this.gainNode.connect(this.audioContext.destination);

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('AudioPlayer initialized, sample rate:', this.audioContext.sampleRate);
  }

  /**
   * Add audio chunk to queue and play
   * @param {string} base64Audio - Base64 encoded audio (MP3 or PCM)
   * @param {string} format - Audio format ('mp3' or 'pcm')
   */
  async addChunk(base64Audio, format = 'mp3') {
    if (!this.audioContext) {
      await this.init();
    }

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer.slice(0));

      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playing if not already
      if (!this.isPlaying) {
        this.playQueue();
      }
    } catch (error) {
      console.error('Error decoding audio chunk:', error);
    }
  }

  /**
   * Play audio from queue with seamless transitions
   */
  async playQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.onPlaybackEnd) {
        this.onPlaybackEnd();
      }
      return;
    }

    this.isPlaying = true;
    if (this.onPlaybackStart && this.audioQueue.length === 1) {
      this.onPlaybackStart();
    }

    const audioBuffer = this.audioQueue.shift();
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    // Schedule playback
    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextPlayTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    source.start(startTime);
    this.currentSource = source;

    source.onended = () => {
      this.currentSource = null;
      // Continue playing queue
      setTimeout(() => this.playQueue(), 0);
    };
  }

  /**
   * Stop current playback and clear queue
   */
  stop() {
    this.audioQueue = [];
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Check if currently playing
   */
  getIsPlaying() {
    return this.isPlaying;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Robust ElevenLabs Conversational AI client with:
 * - Auto-reconnection with exponential backoff
 * - High-quality audio playback
 * - Interruption handling
 * - Connection health monitoring
 */
class ElevenLabsClient {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.conversationId = null;
    this.audioPlayer = new AudioPlayer();

    // Callbacks
    this.onTranscript = null;
    this.onStatusChange = null;
    this.onError = null;
    this.onAgentResponse = null;
    this.onAgentSpeaking = null;

    // Reconnection state
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = CONFIG.RECONNECT?.MAX_ATTEMPTS || 5;
    this.reconnectDelay = CONFIG.RECONNECT?.INITIAL_DELAY || 1000;
    this.maxReconnectDelay = CONFIG.RECONNECT?.MAX_DELAY || 30000;
    this.shouldReconnect = false;
    this.reconnectTimer = null;

    // Health monitoring
    this.pingInterval = null;
    this.lastPongTime = 0;
    this.pingTimeout = CONFIG.PING_TIMEOUT || 10000;

    // Audio state
    this.isAgentSpeaking = false;
    this.pendingAudioChunks = [];
  }

  /**
   * Connect to ElevenLabs Conversational AI WebSocket
   */
  async connect(callbacks = {}) {
    this.onTranscript = callbacks.onTranscript;
    this.onStatusChange = callbacks.onStatusChange;
    this.onError = callbacks.onError;
    this.onAgentResponse = callbacks.onAgentResponse;
    this.onAgentSpeaking = callbacks.onAgentSpeaking;

    const agentId = CONFIG.ELEVENLABS_AGENT_ID;
    if (!agentId || agentId === 'your-agent-id-here') {
      const error = new Error('ElevenLabs Agent ID not configured. Please update config.js');
      this.handleError(error);
      return false;
    }

    this.shouldReconnect = true;
    return await this.establishConnection();
  }

  /**
   * Establish WebSocket connection
   */
  async establishConnection() {
    this.updateStatus('connecting');

    try {
      // Initialize audio player (requires user interaction context)
      await this.audioPlayer.init();

      // Setup audio player callbacks
      this.audioPlayer.onPlaybackStart = () => {
        this.isAgentSpeaking = true;
        if (this.onAgentSpeaking) {
          this.onAgentSpeaking(true);
        }
      };

      this.audioPlayer.onPlaybackEnd = () => {
        this.isAgentSpeaking = false;
        if (this.onAgentSpeaking) {
          this.onAgentSpeaking(false);
        }
      };

      const agentId = CONFIG.ELEVENLABS_AGENT_ID;
      const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;

      console.log('Connecting to ElevenLabs:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      // Set up event handlers with proper error handling
      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (event) => this.handleWebSocketError(event);
      this.ws.onclose = (event) => this.handleClose(event);

      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  /**
   * Handle WebSocket open
   */
  async handleOpen() {
    console.log('ElevenLabs WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = CONFIG.RECONNECT?.INITIAL_DELAY || 1000;
    this.lastPongTime = Date.now();

    this.updateStatus('connected');

    // Start health monitoring
    this.startHealthMonitor();

    // Start capturing audio and streaming to WebSocket
    try {
      await audioCapture.startCapture((base64Audio) => {
        this.sendAudio(base64Audio);
      });
      this.updateStatus('recording');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      // Don't log audio chunks (too verbose)
      if (data.type !== 'audio') {
        console.log('ElevenLabs message:', data.type, data);
      }

      switch (data.type) {
        case 'conversation_initiation_metadata':
          // Conversation started
          this.conversationId = data.conversation_id;
          console.log('Conversation started:', this.conversationId);
          break;

        case 'user_transcript':
          // User's speech transcribed
          if (data.user_transcription && this.onTranscript) {
            this.onTranscript(data.user_transcription, data.is_final || false);
          }
          break;

        case 'agent_response':
          // Agent's response text (before audio)
          if (data.agent_response && this.onAgentResponse) {
            this.onAgentResponse(data.agent_response);
          }
          break;

        case 'audio':
          // Agent's audio response - play it!
          if (data.audio) {
            this.audioPlayer.addChunk(data.audio, data.format || 'mp3');
          }
          break;

        case 'interruption':
          // User interrupted agent - stop audio playback
          console.log('User interruption detected');
          this.audioPlayer.stop();
          this.isAgentSpeaking = false;
          if (this.onAgentSpeaking) {
            this.onAgentSpeaking(false);
          }
          break;

        case 'ping':
          // Respond to ping to keep connection alive
          this.send({ type: 'pong' });
          this.lastPongTime = Date.now();
          break;

        case 'pong':
          // Response to our ping
          this.lastPongTime = Date.now();
          break;

        case 'error':
          this.handleError(new Error(data.message || data.error || 'ElevenLabs error'));
          break;

        case 'conversation_ended':
          console.log('Conversation ended by server');
          this.shouldReconnect = false;
          break;

        default:
          // Log unknown message types for debugging
          console.log('Unknown message type:', data.type, data);
      }
    } catch (error) {
      console.error('Error parsing message:', error, event.data);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleWebSocketError(event) {
    console.error('WebSocket error:', event);
    // The close event will be triggered after this, so we handle reconnection there
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('ElevenLabs error:', error);
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Handle WebSocket close
   */
  handleClose(event) {
    console.log('ElevenLabs WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.stopHealthMonitor();
    audioCapture.stopCapture();
    this.audioPlayer.stop();

    // Attempt reconnection if appropriate
    if (this.shouldReconnect && event.code !== 1000) {
      this.attemptReconnect();
    } else {
      this.updateStatus('disconnected');
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateStatus('disconnected');
      this.handleError(new Error('Connection lost. Please refresh the page.'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.updateStatus('reconnecting');

    this.reconnectTimer = setTimeout(async () => {
      await this.establishConnection();
    }, delay);
  }

  /**
   * Start connection health monitoring
   */
  startHealthMonitor() {
    this.stopHealthMonitor();

    this.pingInterval = setInterval(() => {
      if (!this.isConnected) return;

      // Check if we've received a pong recently
      const timeSinceLastPong = Date.now() - this.lastPongTime;
      if (timeSinceLastPong > this.pingTimeout * 2) {
        console.warn('Connection appears dead, forcing reconnect');
        this.ws?.close();
        return;
      }

      // Send ping
      this.send({ type: 'ping' });
    }, this.pingTimeout);
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitor() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send audio chunk to ElevenLabs
   */
  sendAudio(base64Audio) {
    if (!this.isConnected || !this.ws) return;

    // Don't send audio while agent is speaking (unless interrupting)
    // ElevenLabs handles this, but we can optimize by not sending
    // Actually, we should send so user can interrupt

    this.send({
      user_audio_chunk: base64Audio,
    });
  }

  /**
   * Send message to WebSocket
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }

  /**
   * Update connection status
   */
  updateStatus(status) {
    console.log('Status:', status);
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Interrupt agent speech
   */
  interruptAgent() {
    this.audioPlayer.stop();
    this.send({ type: 'user_interrupt' });
  }

  /**
   * Set playback volume
   */
  setVolume(volume) {
    this.audioPlayer.setVolume(volume);
  }

  /**
   * Disconnect from ElevenLabs
   */
  async disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHealthMonitor();
    audioCapture.stopCapture();
    await this.audioPlayer.cleanup();

    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.isConnected = false;
    this.updateStatus('disconnected');
  }

  /**
   * Check if currently connected
   */
  getIsConnected() {
    return this.isConnected;
  }

  /**
   * Check if agent is currently speaking
   */
  getIsAgentSpeaking() {
    return this.isAgentSpeaking;
  }
}

// Export singleton instance
export const elevenLabsClient = new ElevenLabsClient();
