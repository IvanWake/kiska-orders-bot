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
        const [, orderId, newStatus] = data.split("_")

        const client = await connectToDatabase()
        const db = client.db(DB_NAME)

        const order = await db
          .collection(COLLECTION_NAME)
          .findOneAndUpdate(
            { _id: new ObjectId(orderId) },
            { $set: { status: newStatus } },
            { returnDocument: "after" },
          )

        if (order && order.userId) {
          const statusEmoji = newStatus === "ordered" ? "📦" : newStatus === "in_progress" ? "🚀" : "✅"
          const statusText =
            newStatus === "ordered" ? "Заказано" : newStatus === "in_progress" ? "В процессе" : "Доставлено"

          await sendTelegramMessage(
            order.userId,
            `${statusEmoji} <b>Обновление статуса заказа!</b>\n\n` +
              `Статус: <b>${statusText}</b>\n\n` +
              `<a href="${process.env.NEXT_PUBLIC_URL || "https://your-app.vercel.app"}/orders/${orderId}">Посмотреть заказ</a>`,
          )
        }

        await sendTelegramMessage(callbackChatId, `✅ Статус обновлен на: ${newStatus}`)
      }

      return NextResponse.json({ ok: true })
    }

    if (text.startsWith("/")) {
      if (text === "/start") {
        await sendTelegramMessage(
          chatId,
          `🎀 <b>Привет! Добро пожаловать в Wishlist App!</b>\n\n` +
            `💕 Это приложение для заказа вкусняшек\n\n` +
            `<b>Команды:</b>\n` +
            `/new - Создать новый заказ\n` +
            `/orders - Мои заказы\n` +
            `/help - Помощь` +
            (userId === ADMIN_TELEGRAM_ID ? `\n\n👑 <b>Админ команды:</b>\n/admin - Все заказы` : ""),
        )
        return NextResponse.json({ ok: true })
      }

      if (text === "/new") {
        await setUserState(userId, { action: "create_order", items: [], step: "add_items" })
        await sendTelegramMessage(
          chatId,
          `🍰 <b>Создание нового заказа</b>\n\n` +
            `Отправь мне название вкусняшки, которую хочешь заказать.\n\n` +
            `Когда закончишь добавлять - отправь /done`,
        )
        return NextResponse.json({ ok: true })
      }

      if (text === "/done") {
        const state = await getUserState(userId)
        if (state?.action === "create_order" && state.items?.length > 0) {
          await setUserState(userId, { ...state, step: "add_comment" })
          await sendTelegramMessage(
            chatId,
            `💬 <b>Добавь комментарий к заказу</b>\n\n` + `Или отправь /skip чтобы пропустить`,
          )
        } else {
          await sendTelegramMessage(chatId, `❌ Сначала добавь хотя бы одну вкусняшку!`)
        }
        return NextResponse.json({ ok: true })
      }

      if (text === "/skip") {
        const state = await getUserState(userId)
        if (state?.action === "create_order" && state.step === "add_comment") {
          // Create order without comment
          const client = await connectToDatabase()
          const db = client.db(DB_NAME)

          const newOrder = {
            items: state.items,
            comment: "",
            status: "ordered",
            createdAt: new Date().toISOString(),
            userId: userId,
          }

          const result = await db.collection(COLLECTION_NAME).insertOne(newOrder)
          const orderId = result.insertedId.toString()

          await clearUserState(userId)

          // Send to admin
          if (ADMIN_TELEGRAM_ID) {
            const itemsList = state.items.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")
            await sendTelegramMessage(
              ADMIN_TELEGRAM_ID,
              `🎀 <b>Новый заказ!</b>\n\n` +
                `📝 Список:\n${itemsList}\n\n` +
                `<a href="${process.env.NEXT_PUBLIC_URL || "https://your-app.vercel.app"}/orders/${orderId}">Посмотреть заказ</a>`,
              "HTML",
              {
                inline_keyboard: [
                  [
                    { text: "📦 Заказано", callback_data: `status_${orderId}_ordered` },
                    { text: "🚀 В процессе", callback_data: `status_${orderId}_in_progress` },
                  ],
                  [{ text: "✅ Доставлено", callback_data: `status_${orderId}_delivered` }],
                ],
              },
            )
          }

          await sendTelegramMessage(
            chatId,
            `✅ <b>Заказ создан!</b>\n\n` +
              `<a href="${process.env.NEXT_PUBLIC_URL || "https://your-app.vercel.app"}/orders/${orderId}">Посмотреть заказ</a>`,
          )
        }
        return NextResponse.json({ ok: true })
      }

      if (text === "/cancel") {
        await clearUserState(userId)
        await sendTelegramMessage(chatId, `❌ Действие отменено`)
        return NextResponse.json({ ok: true })
      }

      if (text === "/orders") {
        const client = await connectToDatabase()
        const db = client.db(DB_NAME)
        const orders = await db.collection(COLLECTION_NAME).find({ userId }).sort({ createdAt: -1 }).toArray()

        if (orders.length === 0) {
          await sendTelegramMessage(chatId, `📭 У тебя пока нет заказов`)
          return NextResponse.json({ ok: true })
        }

        const ordersList = orders
          .map((order: any) => {
            const statusEmoji = order.status === "ordered" ? "📦" : order.status === "in_progress" ? "🚀" : "✅"
            const date = new Date(order.createdAt).toLocaleDateString("ru-RU")
            return `${statusEmoji} <a href="${process.env.NEXT_PUBLIC_URL || "https://your-app.vercel.app"}/orders/${order._id}">${date}</a>`
          })
          .join("\n")

        await sendTelegramMessage(chatId, `📋 <b>Твои заказы:</b>\n\n${ordersList}`)
        return NextResponse.json({ ok: true })
      }

      if (text === "/admin" && userId === ADMIN_TELEGRAM_ID) {
        const client = await connectToDatabase()
        const db = client.db(DB_NAME)
        const orders = await db.collection(COLLECTION_NAME).find({}).sort({ createdAt: -1 }).limit(10).toArray()

        if (orders.length === 0) {
          await sendTelegramMessage(chatId, `📭 Заказов пока нет`)
          return NextResponse.json({ ok: true })
        }

        const ordersList = orders
          .map((order: any) => {
            const statusEmoji = order.status === "ordered" ? "📦" : order.status === "in_progress" ? "🚀" : "✅"
            const date = new Date(order.createdAt).toLocaleDateString("ru-RU")
            const items = order.items.slice(0, 2).join(", ") + (order.items.length > 2 ? "..." : "")
            return `${statusEmoji} ${date}: ${items}\n<a href="${process.env.NEXT_PUBLIC_URL || "https://your-app.vercel.app"}/orders/${order._id}">Открыть</a>`
          })
          .join("\n\n")

        await sendTelegramMessage(chatId, `👑 <b>Все заказы (последние 10):</b>\n\n${ordersList}`)
        return NextResponse.json({ ok: true })
      }

      if (text === "/help") {
        await sendTelegramMessage(
          chatId,
          `💕 <b>Помощь по боту</b>\n\n` +
            `<b>Основные команды:</b>\n` +
            `/new - Создать новый заказ\n` +
            `/orders - Посмотреть свои заказы\n` +
            `/cancel - Отменить текущее действие\n` +
            `/help - Показать эту справку`,
        )
        return NextResponse.json({ ok: true })
      }

      return NextResponse.json({ ok: true })
    }

    const state = await getUserState(userId)

    if (state?.action === "create_order") {
      if (state.step === "add_items") {
        const items = state.items || []
        items.push(text)
        await setUserState(userId, { ...state, items })

        await sendTelegramMessage(
          chatId,
          `✅ Добавлено: <b>${text}</b>\n\n` +
            `Всего в списке: ${items.length}\n\n` +
            `Добавляй еще или отправь /done когда закончишь`,
        )
      } else if (state.step === "add_comment") {
        // Create order with comment
        const client = await connectToDatabase()
        const db = client.db(DB_NAME)

        const newOrder = {
          items: state.items,
          comment: text,
          status: "ordered",
          createdAt: new Date().toISOString(),
          userId: userId,
        }

        const result = await db.collection(COLLECTION_NAME).insertOne(newOrder)
        const orderId = result.insertedId.toString()

        await clearUserState(userId)

        // Send to admin
        if (ADMIN_TELEGRAM_ID) {
          const itemsList = state.items.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")
          await sendTelegramMessage(
            ADMIN_TELEGRAM_ID,
            `🎀 <b>Новый заказ!</b>\n\n` +
              `📝 Список:\n${itemsList}\n\n` +
              `💬 Комментарий: ${text}\n\n` +
              `<a href="${process.env.NEXT_PUBLIC_URL || "https://your-app.vercel.app"}/orders/${orderId}">Посмотреть заказ</a>`,
            "HTML",
            {
              inline_keyboard: [
                [
                  { text: "📦 Заказано", callback_data: `status_${orderId}_ordered` },
                  { text: "🚀 В процессе", callback_data: `status_${orderId}_in_progress` },
                ],
                [{ text: "✅ Доставлено", callback_data: `status_${orderId}_delivered` }],
              ],
            },
          )
        }

        await sendTelegramMessage(
          chatId,
          `✅ <b>Заказ создан!</b>\n\n` +
            `<a href="${process.env.NEXT_PUBLIC_URL || "https://your-app.vercel.app"}/orders/${orderId}">Посмотреть заказ</a>`,
        )
      }
    } else {
      await sendTelegramMessage(chatId, `👋 Привет! Используй /start чтобы начать или /help для помощи`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
