"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, Sparkles } from "lucide-react"
import Image from "next/image"

interface Order {
  _id: string
  items: string[]
  comment?: string
  status: "ordered" | "inProgress" | "delivered"
  createdAt: string
  telegramUserId?: number
  telegramUsername?: string
}

const statusLabels = {
  ordered: "Заказано",
  in_progress: "В процессе",
  delivered: "Доставлено",
}

const statusColors = {
  ordered: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  delivered: "bg-green-500/20 text-green-500 border-green-500/30",
}

export default function TelegramOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tgUser, setTgUser] = useState<any>(null)

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()

      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user)
      }

      tg.BackButton.show()
      tg.BackButton.onClick(() => {
        window.location.href = "/tg"
      })
    }

    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders")
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image src="/images/hello.jpg" alt="Hello Kitty" fill className="object-contain drop-shadow-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Все заказы</h1>
              <p className="text-sm text-muted-foreground">
                <Sparkles className="inline h-4 w-4 mr-1 text-primary" />
                Всего заказов: {orders.length}
              </p>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="mb-6 rounded-full bg-primary/10 p-8">
              <Sparkles className="h-16 w-16 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Заказов пока нет</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm text-pretty">Создай первый заказ вкусняшек</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card
                key={order._id}
                className="group p-4 border-border bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="flex flex-col items-start gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-col items-start justify-between gap-3">
                      <div className="flex-1 w-full">
                        <div className="mb-3">
                          <span
                            className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium border ${statusColors[order.status]}`}
                          >
                            {statusLabels[order.status]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {order.items.map((item, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-primary/20 text-primary rounded-full text-xs font-medium border border-primary/30"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                        {order.comment && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{order.comment}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(order.createdAt).toLocaleString("ru-RU")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full">
                        <a href={`/tg/orders/${order._id}`} className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-primary/30 hover:border-primary hover:bg-primary/10 bg-transparent h-10"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            <span>Открыть</span>
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
