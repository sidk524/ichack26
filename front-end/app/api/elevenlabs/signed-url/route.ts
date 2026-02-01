import { NextRequest, NextResponse } from "next/server"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Agent IDs from environment
const AGENT_IDS = {
  "civilian-dispatcher": process.env.ELEVENLABS_AGENT_CIVILIAN_DISPATCHER,
  "field-coordinator": process.env.ELEVENLABS_AGENT_FIELD_COORDINATOR,
  "patient-bystander": process.env.ELEVENLABS_AGENT_PATIENT_BYSTANDER,
  "field-responder": process.env.ELEVENLABS_AGENT_FIELD_RESPONDER,
} as const

type AgentType = keyof typeof AGENT_IDS

export async function GET(request: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY not configured" },
      { status: 500 }
    )
  }

  // Get agent type from query param, default to civilian-dispatcher
  const searchParams = request.nextUrl.searchParams
  const agentType = (searchParams.get("agent") || "civilian-dispatcher") as AgentType

  const agentId = AGENT_IDS[agentType]

  if (!agentId) {
    return NextResponse.json(
      { error: `Agent ID not configured for type: ${agentType}` },
      { status: 500 }
    )
  }

  try {
    // Get signed URL for the agent
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
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
