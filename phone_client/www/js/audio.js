// Microphone capture utilities
import { CONFIG } from '../config.js';

class AudioCapture {
  constructor() {
    this.mediaStream = null;
    this.audioContext = null;
    this.processor = null;
    this.source = null;
    this.onAudioData = null;
    this.isCapturing = false;
  }

  /**
   * Check if audio capture is supported
   */
  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Request microphone access and start capturing audio
   * @param {Function} onAudioData - Callback with base64 PCM audio chunks
   * @returns {Promise<boolean>} Success status
   */
  async startCapture(onAudioData) {
    if (!this.isSupported()) {
      throw new Error('Audio capture is not supported by this browser');
    }

    if (this.isCapturing) {
      console.warn('Audio capture already in progress');
      return true;
    }

    this.onAudioData = onAudioData;

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: CONFIG.AUDIO.SAMPLE_RATE,
          channelCount: CONFIG.AUDIO.CHANNELS,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context with target sample rate
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: CONFIG.AUDIO.SAMPLE_RATE,
      });

      // Create source from microphone stream
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for raw audio access
      // Note: ScriptProcessorNode is deprecated but widely supported
      // AudioWorklet is the modern alternative but requires separate file
      this.processor = this.audioContext.createScriptProcessor(
        CONFIG.AUDIO.CHUNK_SIZE,
        CONFIG.AUDIO.CHANNELS,
        CONFIG.AUDIO.CHANNELS
      );

      this.processor.onaudioprocess = (event) => {
        if (!this.isCapturing) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM 16-bit)
        const pcmData = this.float32ToInt16(inputData);

        // Convert to base64
        const base64 = this.arrayBufferToBase64(pcmData.buffer);

        if (this.onAudioData) {
          this.onAudioData(base64);
        }
      };

      // Connect the audio graph
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isCapturing = true;
      console.log('Audio capture started');
      return true;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop capturing audio
   */
  stopCapture() {
    this.isCapturing = false;
    this.cleanup();
    console.log('Audio capture stopped');
  }

  /**
   * Clean up audio resources
   */
  cleanup() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Convert Float32Array audio samples to Int16Array (PCM 16-bit)
   * @param {Float32Array} float32Array - Audio samples in range [-1, 1]
   * @returns {Int16Array} PCM 16-bit samples
   */
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and scale to Int16 range
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Convert ArrayBuffer to base64 string
   * @param {ArrayBuffer} buffer
   * @returns {string} Base64 encoded string
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// Export singleton instance
export const audioCapture = new AudioCapture();
