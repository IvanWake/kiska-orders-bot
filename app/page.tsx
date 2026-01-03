"use client"

import type React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function HomePage() {
  const router = useRouter()
  const [items, setItems] = useState<string[]>([])
  const [currentItem, setCurrentItem] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentItem.trim()) {
      setItems([...items, currentItem.trim()])
      setCurrentItem("")
    }
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, comment }),
      })

      if (response.ok) {
        setItems([])
        setComment("")
        router.push("/orders")
      }
    } catch (error) {
      console.error("Failed to create order:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-40 right-20 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse delay-1000" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        <Card className="p-8 sm:p-12 border-border bg-card/80 backdrop-blur-sm shadow-2xl text-center">
          <div className="mb-6 sm:mb-8 flex justify-center">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 animate-bounce-slow">
              <Image
                src="/images/hello.jpg"
                alt="Hello Kitty"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground text-balance mb-4">
            Список вкусняшек
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground text-pretty mb-8 px-4">
            Это приложение работает только в <a href="https://t.me/hochuvkusnyashek_bot">Telegram</a>
          </p>

          <div className="space-y-4 text-left max-w-md mx-auto">
            <div className="p-4 bg-secondary rounded-lg border border-border">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">Шаг 1:</span> Найдите бота в <a href="https://t.me/hochuvkusnyashek_bot">Telegram</a>
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg border border-border">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">Шаг 2:</span> Запустите бота командой /start
              </p>
            </div>

            <div className="p-4 bg-secondary rounded-lg border border-border">
              <p className="text-sm text-foreground">
                <span className="font-semibold text-primary">Шаг 3:</span> Откройте Mini App и добавляйте вкусняшки
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-8">Приложение создано с любовью для заказа вкусняшек 💕</p>
        </Card>
      </div>
    </div>
  )
}
