import { type NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

const MONGODB_URI =
    process.env.MONGODB_URI ||
    "mongodb+srv://Vercel-Admin-support-applocation:OqTExNvBbS2PZQVl@support-applocation.3tzo10r.mongodb.net/?retryWrites=true&w=majority"
const DB_NAME = "wishlist"
const COLLECTION_NAME = "orders"
const USERS_COLLECTION = "telegram_users"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID

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

async function sendTelegramMessage(chatId: string, text: string, parseMode = "HTML", replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  }
  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

async function getUserState(userId: string) {
  const client = await connectToDatabase()
  const db = client.db(DB_NAME)
  const user = await db.collection(USERS_COLLECTION).findOne({ userId })
  return user?.state || null
}

async function setUserState(userId: string, state: any) {
  const client = await connectToDatabase()
  const db = client.db(DB_NAME)
  await db.collection(USERS_COLLECTION).updateOne({ userId }, { $set: { userId, state } }, { upsert: true })
}

async function clearUserState(userId: string) {
  const client = await connectToDatabase()
  const db = client.db(DB_NAME)
  await db.collection(USERS_COLLECTION).deleteOne({ userId })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const message = body.message || body.callback_query?.message
    const callbackQuery = body.callback_query

    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id.toString()
    const userId = message.from?.id?.toString() || chatId
    const text = message.text || ""

    if (callbackQuery) {
      const data = callbackQuery.data
      const callbackChatId = callbackQuery.message.chat.id.toString()

      if (data.startsWith("status_")) {
        const parts = data.split("_")
        const orderId = parts[1]
        const newStatus = parts.slice(2).join("_") // объединяем обратно части после orderId (in_progress)

        console.log("[v0] Updating order status:", orderId, "to", newStatus)

        const client = await connectToDatabase()
        const db = client.db(DB_NAME)

        const order = await db
            .collection(COLLECTION_NAME)
            .findOneAndUpdate(
                { _id: new ObjectId(orderId) },
                { $set: { status: newStatus } },
                { returnDocument: "after" },
            )

        console.log("[v0] Order updated:", order)

        if (order && order.telegramUserId) {
          console.log("[v0] Sending status update to user:", order.telegramUserId)
          const statusEmoji = newStatus === "ordered" ? "📦" : newStatus === "in_progress" ? "🚀" : "✅"
          const statusText =
              newStatus === "ordered" ? "Заказано" : newStatus === "in_progress" ? "В процессе" : "Доставлено"

          const appUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin
          const notificationText =
              `💕 ${statusEmoji} <b>Обновление статуса заказа!</b>\n\n` +
              `Статус изменен на: <b>${statusText}</b>\n\n` +
              `Нажми на кнопку ниже чтобы посмотреть детали заказа 💖`

          try {
            await sendTelegramMessage(order.telegramUserId.toString(), notificationText, "HTML", {
              inline_keyboard: [
                [
                  {
                    text: "🎀 Открыть заказ",
                    web_app: { url: `${appUrl}/tg/orders/${orderId}` },
                  },
                ],
              ],
            })
            console.log("[v0] User notification sent successfully")
          } catch (error) {
            console.error("[v0] Failed to send user notification:", error)
          }
        } else {
          console.log("[v0] No telegramUserId found in order")
        }

        const statusText =
            newStatus === "ordered" ? "Заказано 📦" : newStatus === "in_progress" ? "В процессе 🚀" : "Доставлено ✅"
        await sendTelegramMessage(callbackChatId, `✅ Статус обновлен на: ${statusText}`)
      }

      return NextResponse.json({ ok: true })
    }

    const miniAppUrl = `${process.env.NEXT_PUBLIC_URL || request.nextUrl.origin}/tg`

    await sendTelegramMessage(
        chatId,
        `🎀 <b>Привет! Добро пожаловать в Wishlist App!</b>\n\n` +
        `💕 Это приложение для заказа вкусняшек\n\n` +
        `Нажми на кнопку ниже чтобы открыть приложение:`,
        "HTML",
        {
          inline_keyboard: [
            [
              {
                text: "🎀 Открыть приложение",
                web_app: { url: miniAppUrl },
              },
            ],
          ],
        },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
