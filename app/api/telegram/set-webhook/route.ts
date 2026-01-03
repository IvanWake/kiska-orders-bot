import { NextResponse } from "next/server"

export async function GET() {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const WEBHOOK_URL = process.env.WEBHOOK_URL || `${process.env.NEXT_PUBLIC_URL}/api/telegram/webhook`

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 500 })
    }

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: WEBHOOK_URL }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to set webhook:", error)
    return NextResponse.json({ error: "Failed to set webhook" }, { status: 500 })
  }
}
