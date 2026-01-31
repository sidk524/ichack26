// Web Speech API Speech-to-Text client
// Built-in browser STT - no auth required, works in Android WebView

/**
 * Web Speech API STT client
 * Uses the browser's built-in speech recognition
 */
class WebSpeechSTT {
  constructor() {
    this.recognition = null;
    this.isConnected = false;
    this.conversationId = null;

    // Track what we've already sent to avoid duplicates
    this.lastSentText = '';
    this.lastSentWords = 0;

    // Callbacks
    this.onTranscript = null;
    this.onPartialTranscript = null;
    this.onError = null;
    this.onStatusChange = null;

    // Check for support
    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  }

  // Stub for volume control (not applicable for STT)
  setVolume(value) {
    // No-op for STT-only mode
  }

  /**
   * Check if Web Speech API is supported
   */
  isSupported() {
    return !!this.SpeechRecognition;
  }

  /**
   * Connect to Web Speech API (start recognition)
   */
  async connect(callbacks = {}) {
    this.onTranscript = callbacks.onTranscript;
    this.onPartialTranscript = callbacks.onPartialTranscript;
    this.onError = callbacks.onError;
    this.onStatusChange = callbacks.onStatusChange;

    if (!this.SpeechRecognition) {
      const error = new Error('Web Speech API not supported in this browser');
      this.handleError(error);
      return false;
    }

    this.updateStatus('connecting');

    try {
      // Create recognition instance
      this.recognition = new this.SpeechRecognition();

      // Configure
      this.recognition.continuous = true;        // Keep listening
      this.recognition.interimResults = true;    // Get partial results
      this.recognition.lang = 'en-US';           // Language
      this.recognition.maxAlternatives = 1;

      // Generate conversation ID
      this.conversationId = 'webspeech_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      // Set up event handlers
      this.recognition.onstart = () => this.handleStart();
      this.recognition.onresult = (event) => this.handleResult(event);
      this.recognition.onerror = (event) => this.handleRecognitionError(event);
      this.recognition.onend = () => this.handleEnd();
      this.recognition.onspeechstart = () => console.log('Speech detected');
      this.recognition.onspeechend = () => console.log('Speech ended');

      // Start recognition
      this.recognition.start();
      console.log('Web Speech API started');

      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  /**
   * Handle recognition start
   */
  handleStart() {
    console.log('Web Speech recognition started');
    this.isConnected = true;
    this.updateStatus('connected');

    // Reset word tracking for new session
    this.lastSentWords = 0;
    this.lastSentText = '';

    // Brief delay then set to recording
    setTimeout(() => {
      if (this.isConnected) {
        this.updateStatus('recording');
      }
    }, 100);
  }

  /**
   * Handle recognition results - send only NEW words, not the whole sentence
   */
  handleResult(event) {
    if (!event.results) return;

    // Get the latest result
    const resultIndex = event.results.length - 1;
    const result = event.results[resultIndex];

    if (!result || !result[0]) return;

    const fullTranscript = result[0].transcript.trim();
    const isFinal = result.isFinal;

    // Split into words
    const allWords = fullTranscript.split(/\s+/).filter(w => w.length > 0);

    // Find new words (words we haven't sent yet)
    const newWords = allWords.slice(this.lastSentWords);

    if (newWords.length === 0) return;

    const newText = newWords.join(' ');
    console.log(`Web Speech ${isFinal ? 'FINAL' : 'partial'}: NEW="${newText}" (words ${this.lastSentWords}-${allWords.length})`);

    // Update tracking
    this.lastSentWords = allWords.length;

    // Call appropriate callback with only the NEW words
    if (isFinal) {
      if (this.onTranscript) {
        this.onTranscript(newText, true);
      }
      // Reset for next utterance
      this.lastSentWords = 0;
      this.lastSentText = '';
    } else {
      if (this.onPartialTranscript) {
        this.onPartialTranscript(newText, false);
      }
      if (this.onTranscript) {
        this.onTranscript(newText, false);
      }
    }
  }

  /**
   * Handle recognition errors
   */
  handleRecognitionError(event) {
    console.error('Web Speech error:', event.error, event.message);

    // Some errors are recoverable
    const recoverableErrors = ['no-speech', 'aborted'];

    if (recoverableErrors.includes(event.error)) {
      console.log('Recoverable error, continuing...');
      // Auto-restart on recoverable errors
      if (this.isConnected) {
        setTimeout(() => {
          if (this.isConnected && this.recognition) {
            try {
              this.recognition.start();
            } catch (e) {
              console.log('Could not restart:', e.message);
            }
          }
        }, 100);
      }
      return;
    }

    // Network or permission errors
    if (event.error === 'network') {
      this.handleError(new Error('Network error - check internet connection'));
    } else if (event.error === 'not-allowed') {
      this.handleError(new Error('Microphone permission denied'));
    } else if (event.error === 'service-not-allowed') {
      this.handleError(new Error('Speech recognition service not allowed'));
    } else {
      this.handleError(new Error(`Speech recognition error: ${event.error}`));
    }
  }

  /**
   * Handle recognition end
   */
  handleEnd() {
    console.log('Web Speech recognition ended');

    // Auto-restart if we're supposed to be connected
    if (this.isConnected) {
      console.log('Auto-restarting recognition...');
      setTimeout(() => {
        if (this.isConnected && this.recognition) {
          try {
            this.recognition.start();
            console.log('Recognition restarted');
          } catch (e) {
            console.log('Could not restart recognition:', e.message);
            // If we can't restart, we're disconnected
            this.isConnected = false;
            this.updateStatus('disconnected');
          }
        }
      }, 100);
    } else {
      this.updateStatus('disconnected');
    }
  }

  /**
   * Handle errors
   */
  handleError(error) {
    console.error('Web Speech STT error:', error);
    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Update status
   */
  updateStatus(status) {
    console.log('Web Speech Status:', status);
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  /**
   * Disconnect
   */
  async disconnect() {
    this.isConnected = false;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
      this.recognition = null;
    }

    this.updateStatus('disconnected');
  }

  getIsConnected() {
    return this.isConnected;
  }
}

export const webSpeechSTT = new WebSpeechSTT();
