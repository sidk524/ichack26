"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"

export default function TestWebSocket() {
  const [status, setStatus] = useState("disconnected")
  const [logs, setLogs] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${time}] ${msg}`])
    console.log(msg)
  }

  const connect = () => {
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "wss://drdatabackend.ngrok.dev"
    const url = `${wsBase}/phone_location_in`
    addLog(`Connecting to ${url}...`)
    setStatus("connecting")

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      addLog("Connected!")
      setStatus("connected")
    }

    ws.onmessage = (event) => {
      addLog(`Received: ${event.data}`)
    }

    ws.onerror = () => {
      addLog("WebSocket error")
      setStatus("error")
    }

    ws.onclose = (event) => {
      addLog(`Disconnected: code=${event.code}, reason=${event.reason}`)
      setStatus("disconnected")
    }
  }

  const sendLocation = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = {
        user_id: "test_user_frontend",
        lat: 51.4988,  // Imperial College London
        lon: -0.1749,
        timestamp: Date.now(),
        accuracy: 10,
      }
      addLog(`Sending: ${JSON.stringify(payload)}`)
      wsRef.current.send(JSON.stringify(payload))
    } else {
      addLog("Not connected!")
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      addLog("Closing connection...")
      wsRef.current.close()
      wsRef.current = null
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebSocket Test</h1>

      <div className="mb-4">
        <span className="font-medium">Status: </span>
        <span
          className={
            status === "connected"
              ? "text-green-600"
              : status === "error"
                ? "text-red-600"
                : "text-gray-600"
          }
        >
          {status}
        </span>
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={connect} disabled={status === "connected"}>
          Connect
        </Button>
        <Button onClick={sendLocation} disabled={status !== "connected"}>
          Send Location
        </Button>
        <Button onClick={disconnect} variant="outline">
          Disconnect
        </Button>
      </div>

      <div className="bg-gray-100 dark:bg-gray-900 rounded p-4 h-80 overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <p className="text-gray-500">Logs will appear here...</p>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>
    </div>
  )
}
