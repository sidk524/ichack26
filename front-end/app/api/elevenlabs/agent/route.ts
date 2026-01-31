import { NextResponse } from "next/server"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

export async function POST() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 500 }
    )
  }

  const agentConfig = {
    name: "Emergency Response Agent",
    conversation_config: {
      agent: {
        first_message:
          "Emergency services. I'm here to help you. Can you tell me what's happening and where you are?",
        language: "en",
        prompt: {
          prompt: `You are an AI emergency dispatcher for a disaster response system. Your primary goals are:

1. STAY CALM AND REASSURING - Speak clearly and calmly to help the caller stay composed
2. GATHER CRITICAL INFORMATION:
   - Location (address or landmarks if GPS unavailable)
   - Type of emergency (fire, flood, earthquake, medical, etc.)
   - Number of people affected
   - Injuries - how many and severity
   - Is anyone trapped?
   - Any medical conditions or special needs?
   - Hazards present (gas leak, downed power lines, etc.)

3. PROVIDE SURVIVAL INSTRUCTIONS based on the situation:
   - Fire: Stay low, cover mouth, get out if possible
   - Earthquake: Drop, cover, hold on
   - Flood: Move to higher ground
   - Medical: Basic first aid guidance
   - Trapped: Conserve energy, make noise periodically

4. KEEP CALLER INFORMED:
   - Confirm help is being dispatched
   - Provide estimated response time if available
   - Stay on the line until help arrives

Be concise but thorough. Prioritize life-threatening situations. If the caller seems confused or panicked, use simple, direct language.`,
          llm: "gpt-4o",
          temperature: 0.3,
          max_tokens: 150,
        },
      },
      tts: {
        model_id: "eleven_turbo_v2",
        voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel - clear, calm voice
        stability: 0.7,
        similarity_boost: 0.8,
        speed: 1.0,
      },
      asr: {
        quality: "high",
        provider: "elevenlabs",
      },
      turn: {
        turn_timeout: 10,
        silence_end_call_timeout: 60,
      },
      conversation: {
        max_duration_seconds: 600, // 10 minute max call
      },
    },
    platform_settings: {
      widget: {
        feedback_mode: "none",
      },
      privacy: {
        record_voice: true,
        retention_days: 30,
      },
    },
  }

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/agents/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify(agentConfig),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("ElevenLabs API error:", errorData)
      return NextResponse.json(
        { error: "Failed to create agent", details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
