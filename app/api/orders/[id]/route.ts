import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://Vercel-Admin-support-applocation:OqTExNvBbS2PZQVl@support-applocation.3tzo10r.mongodb.net/?retryWrites=true&w=majority"
const DB_NAME = "wishlist"
const COLLECTION_NAME = "orders"

let cachedClient: MongoClient | null = null

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient
  }

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  cachedClient = client
  return client
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    const client = await connectToDatabase()
    const db = client.db(DB_NAME)
    const order = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Failed to fetch order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    if (!status || !["ordered", "inProgress", "delivered"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const client = await connectToDatabase()
    const db = client.db(DB_NAME)

    const result = await db
      .collection(COLLECTION_NAME)
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { status } }, { returnDocument: "after" })

    if (!result) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (result.telegramUserId) {
      console.log("[v0] Sending status update notification to user:", result.telegramUserId)
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
      if (TELEGRAM_BOT_TOKEN) {
        const statusEmoji = status === "ordered" ? "📦" : status === "inProgress" ? "🚀" : "✅"
        const statusText = status === "ordered" ? "Заказано" : status === "inProgress" ? "В процессе" : "Доставлено"

        const appUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin
        const message =
          `💕 ${statusEmoji} <b>Обновление статуса заказа!</b>\n\n` +
          `Статус изменен на: <b>${statusText}</b>\n\n` +
          `Нажми на кнопку ниже чтобы посмотреть детали заказа 💖`

        try {
          const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: result.telegramUserId,
              text: message,
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🎀 Открыть заказ",
                      web_app: { url: `${appUrl}/tg/orders/${id}` },
                    },
                  ],
                ],
              },
            }),
          })

          const responseData = await response.json()
          console.log("[v0] Telegram notification response:", responseData)

          if (!response.ok) {
            console.error("[v0] Failed to send telegram notification:", responseData)
          } else {
            console.log("[v0] Notification sent successfully")
          }
        } catch (telegramError) {
          console.error("[v0] Failed to send telegram notification:", telegramError)
        }
      } else {
        console.log("[v0] TELEGRAM_BOT_TOKEN not found")
      }
    } else {
      console.log("[v0] No telegramUserId found for order:", id)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to update order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 })
    }

    const client = await connectToDatabase()
    const db = client.db(DB_NAME)
    const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete order:", error)
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
  }
}
