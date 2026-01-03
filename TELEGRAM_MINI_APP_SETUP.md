# Telegram Mini App Setup

Теперь приложение включает полноценный Telegram Mini App интерфейс! 🎀

## Что реализовано

### 1. Web интерфейс (доступен по основному URL)
- Главная страница: создание заказов
- Страница заказов: просмотр всех заказов
- Детальная страница заказа
- Админ-панель для управления заказами

### 2. Telegram Mini App (доступен по `/tg`)
- Полный интерфейс Hello Kitty внутри Telegram
- Интеграция с Telegram WebApp API
- Автоматическое определение пользователя из Telegram
- Нативные кнопки Telegram (MainButton, BackButton)

### 3. Telegram Bot (команды в чате)
- `/start` - приветствие и список команд
- `/new` - создать заказ через диалог
- `/orders` - посмотреть свои заказы
- `/admin` - все заказы (только для админа)
- `/help` - справка

## Настройка переменных окружения

Добавьте в настройки проекта Vercel:

```env
MONGODB_URI=mongodb+srv://Vercel-Admin-support-applocation:OqTExNvBbS2PZQVl@support-applocation.3tzo10r.mongodb.net/?retryWrites=true&w=majority
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_TELEGRAM_ID=your_telegram_user_id_here
NEXT_PUBLIC_URL=https://your-app.vercel.app
```

## Как получить токен бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям и получите токен
4. Сохраните токен в `TELEGRAM_BOT_TOKEN`

## Как узнать свой Telegram ID

1. Откройте [@userinfobot](https://t.me/userinfobot)
2. Отправьте `/start`
3. Скопируйте ваш ID в `ADMIN_TELEGRAM_ID`

## Настройка Webhook

После деплоя на Vercel:

1. Откройте в браузере:
```
https://your-app.vercel.app/api/telegram/set-webhook
```

2. Вы должны увидеть: `{"ok": true, "message": "Webhook set successfully"}`

## Настройка Mini App

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Нажмите `Bot Settings` → `Menu Button`
5. Выберите `Configure menu button`
6. Введите URL: `https://your-app.vercel.app/tg`
7. Введите текст кнопки: `Открыть приложение`

## Как использовать

### Для девушки (обычный пользователь):

**Вариант 1: Mini App**
1. Откройте бота в Telegram
2. Нажмите кнопку меню (рядом с полем ввода)
3. Откроется красивый интерфейс Hello Kitty
4. Добавляйте вкусняшки и отправляйте заказ

**Вариант 2: Команды в боте**
1. Отправьте `/new`
2. Пишите названия вкусняшек
3. Отправьте `/done` когда закончите
4. Добавьте комментарий или `/skip`

### Для вас (админ):

1. Вам придет уведомление в Telegram при новом заказе
2. Можете менять статус заказа прямо в сообщении (кнопки)
3. Или зайдите на сайт и управляйте через веб-интерфейс
4. Используйте пароль `admin123` для входа в админку
5. Используйте `/admin` в боте для просмотра всех заказов

## Уведомления

- **При создании заказа:** вам приходит уведомление в Telegram + письмо на почту
- **При изменении статуса:** заказчику приходит уведомление в Telegram

## Преимущества Mini App

- Нативный интерфейс внутри Telegram
- Не нужно переходить в браузер
- Автоматическая авторизация через Telegram
- Красивый дизайн Hello Kitty
- Быстрый доступ через кнопку меню

Приятного использования! 💕
