import { NextResponse } from "next/server"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Cache the agent ID after creation
let cachedAgentId: string | null = process.env.ELEVENLABS_AGENT_ID || null

async function createEmergencyAgent(): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured")
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
    console.error("ElevenLabs agent creation error:", errorData)
    throw new Error(`Failed to create agent: ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()
  console.log("Created emergency agent with ID:", data.agent_id)
  return data.agent_id
}

export async function GET() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 500 }
    )
  }

  try {
    // Auto-create the emergency agent if we don't have one cached
    if (!cachedAgentId) {
      console.log("No agent ID found, creating emergency agent...")
      cachedAgentId = await createEmergencyAgent()
    }

    // Get signed URL for the agent
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${cachedAgentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("ElevenLabs signed URL error:", errorData)

      // If agent not found, try to recreate it
      if (response.status === 404 || response.status === 400) {
        console.log("Agent not found, recreating...")
        cachedAgentId = await createEmergencyAgent()

        // Retry getting signed URL
        const retryResponse = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${cachedAgentId}`,
          {
            method: "GET",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
            },
          }
        )

        if (!retryResponse.ok) {
          const retryError = await retryResponse.json()
          return NextResponse.json(
            { error: "Failed to get signed URL after agent recreation", details: retryError },
            { status: retryResponse.status }
          )
        }

        const retryData = await retryResponse.json()
        return NextResponse.json(retryData)
      }

      return NextResponse.json(
        { error: "Failed to get signed URL", details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in signed-url endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
