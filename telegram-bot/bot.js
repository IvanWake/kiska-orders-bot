const TelegramBot = require("node-telegram-bot-api")
const { MongoClient, ObjectId } = require("mongodb")

// Конфигурация
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN"
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://Vercel-Admin-support-applocation:OqTExNvBbS2PZQVl@support-applocation.3tzo10r.mongodb.net/?retryWrites=true&w=majority"
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "YOUR_ADMIN_CHAT_ID" // Ваш Telegram chat ID

// Создаем бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true })

// Подключение к MongoDB
let db
let ordersCollection

async function connectDB() {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  db = client.db("wishlist")
  ordersCollection = db.collection("orders")
  console.log("✅ Connected to MongoDB")
}

// Хранилище временных данных пользователей
const userSessions = {}

// Статусы заказов
const ORDER_STATUSES = {
  pending: "Заказано 💝",
  processing: "В процессе 🛒",
  delivered: "Доставлено 🎁",
}

// Стартовая команда
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const userName = msg.from.first_name || "друг"

  const welcomeMessage = `
💖 Привет, ${userName}! 

Я бот для создания заказов вкусняшек! 🍰🍭

Используй команды:
📝 /new - Создать новый заказ
📋 /orders - Посмотреть все заказы
❓ /help - Помощь

Давай начнем! 🎀`

  bot.sendMessage(chatId, welcomeMessage)
})

// Помощь
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id

  const helpMessage = `
🎀 Доступные команды:

📝 /new - Создать новый заказ
📋 /orders - Посмотреть все заказы
❌ /cancel - Отменить текущее действие
❓ /help - Показать это сообщение

${chatId === Number.parseInt(ADMIN_CHAT_ID) ? "\n🔧 Админ команды:\n📊 /admin - Управление заказами\n✏️ /status [id] [статус] - Изменить статус" : ""}`

  bot.sendMessage(chatId, helpMessage)
})

// Создание нового заказа
bot.onText(/\/new/, (msg) => {
  const chatId = msg.chat.id

  userSessions[chatId] = {
    action: "creating_order",
    step: "items",
    items: [],
    comment: "",
  }

  bot.sendMessage(
    chatId,
    "💝 Создаем новый заказ!\n\nДобавь вкусняшки по одной. Когда закончишь, отправь /done\n\n🍰 Напиши название первой вкусняшки:",
  )
})

// Отмена
bot.onText(/\/cancel/, (msg) => {
  const chatId = msg.chat.id

  if (userSessions[chatId]) {
    delete userSessions[chatId]
    bot.sendMessage(chatId, "❌ Действие отменено")
  } else {
    bot.sendMessage(chatId, "Нечего отменять 🤷‍♀️")
  }
})

// Завершение добавления элементов
bot.onText(/\/done/, async (msg) => {
  const chatId = msg.chat.id

  if (!userSessions[chatId] || userSessions[chatId].action !== "creating_order") {
    bot.sendMessage(chatId, "❌ Сначала начни создание заказа с /new")
    return
  }

  if (userSessions[chatId].items.length === 0) {
    bot.sendMessage(chatId, "❌ Добавь хотя бы одну вкусняшку!")
    return
  }

  userSessions[chatId].step = "comment"
  bot.sendMessage(chatId, "💬 Отлично! Теперь добавь комментарий к заказу (или отправь /skip чтобы пропустить):")
})

// Пропустить комментарий
bot.onText(/\/skip/, async (msg) => {
  const chatId = msg.chat.id

  if (!userSessions[chatId] || userSessions[chatId].step !== "comment") {
    return
  }

  await createOrder(chatId, "")
})

// Просмотр всех заказов
bot.onText(/\/orders/, async (msg) => {
  const chatId = msg.chat.id

  try {
    const orders = await ordersCollection.find({ userId: chatId }).sort({ createdAt: -1 }).toArray()

    if (orders.length === 0) {
      bot.sendMessage(chatId, "📭 У тебя пока нет заказов. Создай первый с помощью /new")
      return
    }

    let message = `📋 Твои заказы (${orders.length}):\n\n`

    orders.forEach((order, index) => {
      const statusEmoji = order.status === "delivered" ? "🎁" : order.status === "processing" ? "🛒" : "💝"
      const date = new Date(order.createdAt).toLocaleDateString("ru-RU")

      message += `${index + 1}. ${statusEmoji} ${ORDER_STATUSES[order.status]}\n`
      message += `   📅 ${date}\n`
      message += `   🍰 ${order.items.length} вкусняшек\n`
      message += `   🔗 /view_${order._id}\n\n`
    })

    bot.sendMessage(chatId, message)
  } catch (error) {
    console.error("Error fetching orders:", error)
    bot.sendMessage(chatId, "❌ Ошибка при загрузке заказов")
  }
})

// Просмотр конкретного заказа
bot.onText(/\/view_(.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const orderId = match[1]

  try {
    const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) })

    if (!order) {
      bot.sendMessage(chatId, "❌ Заказ не найден")
      return
    }

    const statusEmoji = order.status === "delivered" ? "🎁" : order.status === "processing" ? "🛒" : "💝"
    const date = new Date(order.createdAt).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    let message = `${statusEmoji} *Заказ #${orderId.slice(-6)}*\n\n`
    message += `📅 Создан: ${date}\n`
    message += `📊 Статус: ${ORDER_STATUSES[order.status]}\n\n`
    message += `🍰 *Вкусняшки:*\n`

    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item}\n`
    })

    if (order.comment) {
      message += `\n💬 *Комментарий:*\n${order.comment}`
    }

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
  } catch (error) {
    console.error("Error fetching order:", error)
    bot.sendMessage(chatId, "❌ Ошибка при загрузке заказа")
  }
})

// Админ панель
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id

  if (chatId !== Number.parseInt(ADMIN_CHAT_ID)) {
    bot.sendMessage(chatId, "❌ У тебя нет доступа к этой команде")
    return
  }

  try {
    const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).limit(10).toArray()

    if (orders.length === 0) {
      bot.sendMessage(chatId, "📭 Заказов пока нет")
      return
    }

    let message = `🔧 *Админ панель*\n\n📋 Последние заказы:\n\n`

    orders.forEach((order, index) => {
      const statusEmoji = order.status === "delivered" ? "🎁" : order.status === "processing" ? "🛒" : "💝"
      const date = new Date(order.createdAt).toLocaleDateString("ru-RU")

      message += `${index + 1}. ${statusEmoji} ID: \`${order._id}\`\n`
      message += `   📅 ${date}\n`
      message += `   🍰 ${order.items.length} вкусняшек\n`
      message += `   📊 ${ORDER_STATUSES[order.status]}\n\n`
    })

    message += `\nИзменить статус: /status [id] [pending|processing|delivered]`

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" })
  } catch (error) {
    console.error("Error in admin panel:", error)
    bot.sendMessage(chatId, "❌ Ошибка при загрузке админ панели")
  }
})

// Изменение статуса (только для админа)
bot.onText(/\/status (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id

  if (chatId !== Number.parseInt(ADMIN_CHAT_ID)) {
    bot.sendMessage(chatId, "❌ У тебя нет доступа к этой команде")
    return
  }

  const orderId = match[1]
  const newStatus = match[2]

  if (!["pending", "processing", "delivered"].includes(newStatus)) {
    bot.sendMessage(chatId, "❌ Неверный статус. Используй: pending, processing или delivered")
    return
  }

  try {
    const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) })

    if (!order) {
      bot.sendMessage(chatId, "❌ Заказ не найден")
      return
    }

    await ordersCollection.updateOne({ _id: new ObjectId(orderId) }, { $set: { status: newStatus } })

    // Отправляем уведомление заказчику
    const statusEmoji = newStatus === "delivered" ? "🎁" : newStatus === "processing" ? "🛒" : "💝"
    const notification = `${statusEmoji} *Статус твоего заказа изменился!*\n\n📊 Новый статус: ${ORDER_STATUSES[newStatus]}\n\n🔗 Посмотреть: /view_${orderId}`

    bot.sendMessage(order.userId, notification, { parse_mode: "Markdown" })
    bot.sendMessage(chatId, `✅ Статус заказа обновлен на: ${ORDER_STATUSES[newStatus]}`)
  } catch (error) {
    console.error("Error updating status:", error)
    bot.sendMessage(chatId, "❌ Ошибка при обновлении статуса")
  }
})

// Обработка текстовых сообщений
bot.on("message", async (msg) => {
  const chatId = msg.chat.id
  const text = msg.text

  // Игнорируем команды
  if (text && text.startsWith("/")) {
    return
  }

  // Обрабатываем сессии пользователей
  if (userSessions[chatId]) {
    const session = userSessions[chatId]

    if (session.action === "creating_order") {
      if (session.step === "items") {
        // Добавляем элемент в заказ
        session.items.push(text)
        bot.sendMessage(chatId, `✅ Добавлено: ${text}\n\n🍰 Добавь еще вкусняшку или отправь /done чтобы закончить:`)
      } else if (session.step === "comment") {
        // Сохраняем комментарий и создаем заказ
        await createOrder(chatId, text)
      }
    }
  }
})

// Функция создания заказа
async function createOrder(chatId, comment) {
  const session = userSessions[chatId]

  try {
    const order = {
      userId: chatId,
      items: session.items,
      comment: comment || "",
      status: "pending",
      createdAt: new Date(),
    }

    const result = await ordersCollection.insertOne(order)
    const orderId = result.insertedId

    // Отправляем уведомление пользователю
    let userMessage = `🎉 *Заказ создан!*\n\n`
    userMessage += `🍰 *Вкусняшки (${order.items.length}):*\n`
    order.items.forEach((item, index) => {
      userMessage += `${index + 1}. ${item}\n`
    })
    if (comment) {
      userMessage += `\n💬 *Комментарий:* ${comment}`
    }
    userMessage += `\n\n📊 Статус: ${ORDER_STATUSES["pending"]}\n🔗 Посмотреть: /view_${orderId}`

    bot.sendMessage(chatId, userMessage, { parse_mode: "Markdown" })

    // Отправляем уведомление админу
    const userName = userSessions[chatId].userName || "Пользователь"
    let adminMessage = `💝 *Новый заказ!*\n\n`
    adminMessage += `👤 От: ${userName} (ID: ${chatId})\n`
    adminMessage += `🆔 Заказ: \`${orderId}\`\n\n`
    adminMessage += `🍰 *Вкусняшки (${order.items.length}):*\n`
    order.items.forEach((item, index) => {
      adminMessage += `${index + 1}. ${item}\n`
    })
    if (comment) {
      adminMessage += `\n💬 *Комментарий:* ${comment}`
    }
    adminMessage += `\n\n✏️ Изменить статус:\n/status ${orderId} processing\n/status ${orderId} delivered`

    bot.sendMessage(ADMIN_CHAT_ID, adminMessage, { parse_mode: "Markdown" })

    // Очищаем сессию
    delete userSessions[chatId]
  } catch (error) {
    console.error("Error creating order:", error)
    bot.sendMessage(chatId, "❌ Ошибка при создании заказа. Попробуй еще раз с /new")
  }
}

// Сохраняем имя пользователя при первом контакте
bot.on("message", (msg) => {
  const chatId = msg.chat.id
  if (userSessions[chatId] && !userSessions[chatId].userName) {
    userSessions[chatId].userName = msg.from.first_name || "Пользователь"
  }
})

// Запуск бота
;(async () => {
  try {
    await connectDB()
    console.log("🤖 Telegram бот запущен!")
    console.log("💝 Готов принимать заказы!")
  } catch (error) {
    console.error("❌ Ошибка запуска:", error)
    process.exit(1)
  }
})()

// Обработка ошибок
bot.on("polling_error", (error) => {
  console.error("Polling error:", error)
})

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error)
})
