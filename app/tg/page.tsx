"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Plus, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        MainButton: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          showProgress: () => void
          hideProgress: () => void
          enable: () => void
          disable: () => void
        }
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
        close: () => void
        themeParams: {
          bg_color?: string
          text_color?: string
          hint_color?: string
          link_color?: string
          button_color?: string
          button_text_color?: string
        }
      }
    }
  }
}

export default function TelegramMiniApp() {
  const [items, setItems] = useState<string[]>([])
  const [currentItem, setCurrentItem] = useState("")
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tgUser, setTgUser] = useState<any>(null)

  const orderDataRef = { current: { items: [], comment: "" } }

  useEffect(() => {
    orderDataRef.current = { items, comment }
  }, [items, comment])

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()

      // Get user info
      if (tg.initDataUnsafe?.user) {
        setTgUser(tg.initDataUnsafe.user)
      }

      // Configure Main Button
      tg.MainButton.setText("Отправить заказ")
      tg.MainButton.hide()

      const handleMainButtonClick = async () => {
        const { items: currentItems, comment: currentComment } = orderDataRef.current

        if (currentItems.length === 0) return

        setIsSubmitting(true)
        tg.MainButton.showProgress()

        try {
          const orderData = {
            items: currentItems,
            comment: currentComment,
            telegramUserId: tg.initDataUnsafe?.user?.id,
            telegramUsername: tg.initDataUnsafe?.user?.username || tg.initDataUnsafe?.user?.first_name,
          }

          const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
          })

          if (response.ok) {
            setItems([])
            setComment("")
            tg.close()
          }
        } catch (error) {
          console.error("Failed to create order:", error)
        } finally {
          setIsSubmitting(false)
          tg.MainButton.hideProgress()
        }
      }

      tg.MainButton.onClick(handleMainButtonClick)
    }
  }, [])

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp

      if (items.length > 0) {
        tg.MainButton.setText(`Отправить заказ (${items.length})`)
        tg.MainButton.show()
        tg.MainButton.enable()
      } else {
        tg.MainButton.hide()
      }
    }
  }, [items])

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

  const handleSubmitViaTelegram = async () => {
    const { items: currentItems, comment: currentComment } = orderDataRef.current
    if (currentItems.length === 0) return

    setIsSubmitting(true)
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.MainButton.showProgress()
    }

    try {
      const orderData = {
        items: currentItems,
        comment: currentComment,
        telegramUserId: tgUser?.id,
        telegramUsername: tgUser?.username || tgUser?.first_name,
      }

      console.log("[v0] Sending order data:", orderData)
      console.log("[v0] Comment value:", currentComment)
      console.log("[v0] Comment length:", currentComment.length)

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      const responseData = await response.json()
      console.log("[v0] API response:", responseData)

      if (response.ok) {
        setItems([])
        setComment("")
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.close()
        }
      }
    } catch (error) {
      console.error("Failed to create order:", error)
    } finally {
      setIsSubmitting(false)
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.MainButton.hideProgress()
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { items: currentItems, comment: currentComment } = orderDataRef.current
    if (currentItems.length === 0) return

    // Вызываем ту же логику что и в MainButton
    handleSubmitViaTelegram()
  }

  return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-40 right-20 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse delay-1000" />
        </div>

        <div className="relative mx-auto max-w-2xl px-4 py-6 pb-24">
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative w-28 h-28 animate-bounce-slow">
                <Image
                    src="/images/hello.jpg"
                    alt="Hello Kitty"
                    fill
                    className="object-contain drop-shadow-2xl"
                    priority
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance mb-2">Список вкусняшек</h1>
            <p className="text-base text-muted-foreground text-pretty px-4">Добавь что хочешь, и я закажу для тебя ✨</p>
            {tgUser && <p className="text-sm text-primary mt-2">Привет, {tgUser.first_name}! 💕</p>}
          </div>

          <div className="mb-4">
            <a href="/tg/orders">
              <Button
                  variant="outline"
                  className="w-full border-primary/30 hover:border-primary hover:bg-primary/10 bg-transparent"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Все заказы
              </Button>
            </a>
          </div>

          <Card className="p-4 border-border bg-card/80 backdrop-blur-sm shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <label htmlFor="item" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Добавить вкусняшку
                </label>
                <div className="flex gap-2">
                  <Input
                      id="item"
                      placeholder="Например: шоколадка 🍫"
                      value={currentItem}
                      onChange={(e) => setCurrentItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddItem(e)
                        }
                      }}
                      className="border-border bg-secondary text-base"
                  />
                  <Button
                      type="button"
                      onClick={handleAddItem}
                      size="icon"
                      className="bg-primary hover:bg-primary/90 shrink-0 h-10 w-10"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Список заказа ({items.length})</label>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {items.map((item, index) => (
                          <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border group hover:border-primary/50 transition-all hover:shadow-md"
                          >
                      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-primary/20 text-primary rounded-full text-sm font-bold">
                        {index + 1}
                      </span>
                            <span className="flex-1 text-foreground text-sm break-words">{item}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                className="h-8 w-8 flex-shrink-0 hover:bg-destructive/20 hover:text-destructive transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                      ))}
                    </div>
                  </div>
              )}

              <div className="space-y-2">
                <label htmlFor="comment" className="text-sm font-medium text-foreground">
                  Комментарий 💕
                </label>
                <Textarea
                    id="comment"
                    placeholder="Добавь милый комментарий..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="border-border bg-secondary resize-none text-base"
                />
              </div>
            </form>
          </Card>

          <div className="mt-6 text-center text-xs text-muted-foreground">Используй кнопку внизу для отправки заказа</div>
        </div>
      </div>
  )
}
