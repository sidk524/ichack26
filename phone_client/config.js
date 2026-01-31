// Configuration for the Emergency Call Client
export const CONFIG = {
  // ElevenLabs Conversational AI Agent ID
  // Create at: elevenlabs.io → Conversational AI → Create Agent
  ELEVENLABS_AGENT_ID: 'your-agent-id-here',

  // Central server URL for transcript submission
  SERVER_URL: 'http://localhost:8000',

  // How often to update location (milliseconds)
  LOCATION_UPDATE_INTERVAL: 5000,

  // Batch small transcripts to reduce server requests (milliseconds)
  TRANSCRIPT_BATCH_DELAY: 500,

  // Audio settings
  AUDIO: {
    // Input (microphone) settings
    SAMPLE_RATE: 16000,       // 16kHz required by ElevenLabs for input
    CHANNELS: 1,              // Mono
    CHUNK_SIZE: 4096,         // Audio chunk size in samples

    // Output (playback) settings
    OUTPUT_SAMPLE_RATE: 24000, // ElevenLabs outputs at 24kHz or 44.1kHz
  },

  // Reconnection settings for WebSocket
  RECONNECT: {
    MAX_ATTEMPTS: 5,          // Maximum reconnection attempts
    INITIAL_DELAY: 1000,      // Initial delay before first reconnect (ms)
    MAX_DELAY: 30000,         // Maximum delay between reconnect attempts (ms)
  },

  // Connection health monitoring
  PING_TIMEOUT: 10000,        // Send ping every 10 seconds

  // Retry settings for HTTP server communication
  RETRY: {
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: 1000,      // ms
    MAX_DELAY: 10000,         // ms
  },
};
