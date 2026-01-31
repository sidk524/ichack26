// ElevenLabs Speech-to-Text WebSocket client
// Uses the realtime STT API (not Conversational AI)
import { CONFIG } from '../config.js';

/**
 * ElevenLabs Speech-to-Text client
 * Streams audio to ElevenLabs and receives transcriptions
 */
class ElevenLabsSTT {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.conversationId = null;

    // Callbacks
    this.onTranscript = null;
    this.onPartialTranscript = null;
    this.onError = null;
    this.onStatusChange = null;
  }

  // Stub for volume control (not applicable for STT-only)
  setVolume(value) {
    // No-op for STT-only mode
  }

  /**
   * Connect to ElevenLabs STT WebSocket
   */
  async connect(callbacks = {}) {
    this.onTranscript = callbacks.onTranscript;
    this.onPartialTranscript = callbacks.onPartialTranscript;
    this.onError = callbacks.onError;
    this.onStatusChange = callbacks.onStatusChange;

    const apiKey = CONFIG.ELEVENLABS_API_KEY;
    if (!apiKey || apiKey === 'your-api-key-here') {
      const error = new Error('ElevenLabs API Key not configured. Please update config.js');
      this.handleError(error);
      return false;
    }

    this.updateStatus('connecting');

    try {
      // Connect to ElevenLabs STT WebSocket with API key in URL
      const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v1&language_code=en&xi-api-key=${apiKey}`;

      this.ws = new WebSocket(wsUrl);

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
   * Handle WebSocket open - start audio capture
   */
  async handleOpen() {
    console.log('ElevenLabs STT WebSocket connected');
    this.isConnected = true;
    this.updateStatus('connected');

    // Generate a conversation ID for tracking
    this.conversationId = 'stt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Start capturing audio
    try {
      await this.startAudioCapture();
      this.updateStatus('recording');
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Start capturing audio from microphone
   */
  async startAudioCapture() {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      }
    });

    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create script processor for audio chunks
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Convert Float32 to Int16
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const base64Audio = this.arrayBufferToBase64(int16Data.buffer);

      // Send to ElevenLabs
      this.ws.send(JSON.stringify({
        message_type: 'input_audio_chunk',
        audio_base_64: base64Audio,
        commit: false,
        sample_rate: 16000
      }));
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Handle incoming WebSocket message
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('STT message:', data.message_type, data);

      switch (data.message_type) {
        case 'session_started':
          console.log('STT session started');
          break;

        case 'partial_transcript':
          // Streaming partial result
          if (data.text && this.onPartialTranscript) {
            this.onPartialTranscript(data.text, false);
          }
          if (data.text && this.onTranscript) {
            this.onTranscript(data.text, false);
          }
          break;

        case 'committed_transcript':
          // Final transcript for this utterance
          if (data.text && this.onTranscript) {
            this.onTranscript(data.text, true);
          }
          break;

        case 'committed_transcript_with_timestamps':
          // Final transcript with word-level timestamps
          if (data.words && this.onTranscript) {
            const text = data.words.map(w => w.word).join(' ');
            this.onTranscript(text, true, data.words);
          }
          break;

        default:
          if (data.message_type && data.message_type.includes('error')) {
            this.handleError(new Error(data.message || data.message_type));
          }
      }
    } catch (error) {
      console.error('Error parsing STT message:', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleWebSocketError(event) {
    console.error('STT WebSocket error:', event);
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('ElevenLabs STT error:', error);
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Handle WebSocket close
   */
  handleClose(event) {
    console.log('STT WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.stopAudioCapture();
    this.updateStatus('disconnected');
  }

  /**
   * Stop audio capture
   */
  stopAudioCapture() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Update status
   */
  updateStatus(status) {
    console.log('STT Status:', status);
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Disconnect
   */
  async disconnect() {
    this.stopAudioCapture();

    if (this.ws) {
      // Send final commit
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          message_type: 'input_audio_chunk',
          audio_base_64: '',
          commit: true,
          sample_rate: 16000
        }));
      }
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.isConnected = false;
    this.updateStatus('disconnected');
  }

  getIsConnected() {
    return this.isConnected;
  }
}

export const elevenLabsSTT = new ElevenLabsSTT();
