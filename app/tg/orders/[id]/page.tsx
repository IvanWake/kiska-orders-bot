"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"
import { use } from "react"
import Image from "next/image"

interface Order {
  _id: string
  items: string[]
  comment?: string
  status: "ordered" | "in_progress" | "delivered"
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

export default function TelegramOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()

      tg.BackButton.show()
      tg.BackButton.onClick(() => {
        window.location.href = "/tg/orders"
      })
    }

    fetchOrder()
  }, [])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
      } else {
        setOrder(null)
      }
    } catch (error) {
      console.error("Failed to fetch order:", error)
      setOrder(null)
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

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-2xl font-bold text-foreground mb-4">Заказ не найден</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-6">
        <Card className="p-5 border-border bg-card/80 backdrop-blur-sm shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image src="/images/hello.jpg" alt="Hello Kitty" fill className="object-contain drop-shadow-xl" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">Заказ</h1>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Статус заказа
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${statusColors[order.status]} shadow-md`}
                >
                  {statusLabels[order.status]}
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">Список вкусняшек</h2>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border shadow-sm"
                  >
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary/20 text-primary rounded-full text-sm font-bold shadow-md">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-foreground text-sm break-words">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {order.comment && (
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">Комментарий 💕</h2>
                <p className="text-foreground whitespace-pre-wrap p-4 bg-secondary rounded-xl border border-border shadow-sm text-sm">
                  {order.comment}
                </p>
              </div>
            )}

            <div className="border-t border-border pt-6 space-y-4">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-1">Дата создания</h2>
                <p className="text-foreground text-sm">{new Date(order.createdAt).toLocaleString("ru-RU")}</p>
              </div>

              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-1">ID заказа</h2>
                <p className="text-foreground font-mono text-xs break-all">{order._id}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
