'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff, Sparkles, ChevronRight, Volume2 } from 'lucide-react'

import { useUserStore } from '@/store/useUserStore'
import type { ChatMessage } from '@/types'

type Message = ChatMessage

interface QuickPrompt {
  id: string
  label: string
  description: string
  prefill: string
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'budget',
    label: 'Tune my monthly budget',
    description: 'Spot the three biggest leaks in my spending.',
    prefill: 'Can you review my monthly budget and point out the top three leaks?',
  },
  {
    id: 'tax',
    label: 'Prep for advance tax',
    description: 'Estimate how much to set aside this quarter.',
    prefill: 'Help me estimate how much advance tax I should set aside this quarter given variable income.',
  },
  {
    id: 'savings',
    label: 'Automate my savings',
    description: 'Draft SIP amounts so I hit my short term goals.',
    prefill: 'Design an automated SIP plan so I reach my short term goals without hurting cash flow.',
  },
  {
    id: 'credit',
    label: 'Improve my credit readiness',
    description: 'List the steps before applying for a home loan.',
    prefill: 'What should I do over the next three months to be ready for a home loan application?',
  },
]

const VOICE_TIPS = [
  'Keep the microphone close and speak at a steady pace.',
  'You can say "pause voice mode" anytime to switch back to typing.',
  'TaalAI can summarise the reply and send an audio note.',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const user = useUserStore((state) => state.user)

  const showIntro = messages.length === 0 && input.trim().length === 0
  const quickPrompts = QUICK_PROMPTS


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    if (!user?.id) {
      setErrorMessage('Select a profile to start chatting with TaalAI.')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    const historyPayload = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }))

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setErrorMessage(null)
    setIsLoading(true)

    const apiBase = process.env.NEXT_PUBLIC_API_URL
    if (!apiBase) {
      setErrorMessage('Chat service not configured. Set NEXT_PUBLIC_API_URL in your environment.')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/chat/message?user_id=${encodeURIComponent(user.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          use_voice: isVoiceMode,
          language: 'hinglish',
          history: historyPayload,
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        const detail = errorPayload?.detail || response.statusText || 'Unknown error'
        throw new Error(detail)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm syncing data right now. Give me a fuller question and I'll jump back in.",
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat request failed', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Unexpected error while contacting the coach.'
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I couldn't reach the coach just now: ${errorMessage}. Try again in a bit or tweak the question.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                <span>Coach Console</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-grotesk">Chat with TaalAI</h1>
              <p className="text-sm text-muted-foreground max-w-xl">Ask your money questions and I will respond with clear steps, trade-offs, and calculators when you need them.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVoiceMode(!isVoiceMode)}
              aria-pressed={isVoiceMode}
              aria-label={isVoiceMode ? 'Disable voice mode' : 'Enable voice mode'}
              className={`p-3 rounded-full border transition-colors ${
                isVoiceMode
                  ? 'border-theme-green bg-theme-green/20 text-theme-green'
                  : 'border-white/10 text-muted-foreground hover:border-theme-green/40 hover:text-theme-green'
              }`}
              title={isVoiceMode ? 'Voice mode enabled' : 'Enable voice mode'}
            >
              {isVoiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="neuro-card relative rounded-3xl p-6 h-[500px]"
        >
          <div className="h-full overflow-y-auto space-y-4 pr-1">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-green text-white'
                        : 'neuro-card text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {message.role === 'assistant' ? (
                      <div className="mt-2 flex justify-start">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full border border-white/10 p-1.5 text-muted-foreground transition hover:border-theme-green hover:text-theme-green"
                          aria-label="Play voice reply"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="neuro-card rounded-2xl px-4 py-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-theme-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-theme-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-theme-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <AnimatePresence>
            {showIntro && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-3xl border border-white/10 bg-background/80 backdrop-blur-sm p-6 flex flex-col justify-center gap-6 text-center pointer-events-auto"
              >
                <div className="space-y-2 pointer-events-auto">
                  <div className="flex justify-center">
                    <Sparkles className="w-6 h-6 text-theme-green" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask a question or pick a prompt to kick things off. The overlay will fade once you start typing.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 pointer-events-auto sm:grid-cols-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => setInput(prompt.prefill)}
                      className="rounded-2xl border border-white/20 bg-background/60 px-4 py-3 text-left text-sm transition hover:border-theme-green hover:text-theme-green"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{prompt.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">{prompt.description}</p>
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="neuro-card rounded-2xl p-4"
        >
          <div className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your finances..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-background/50 border border-white/10 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-theme-green/50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !user?.id}
              className="neuro-button px-6 py-3 bg-gradient-green text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {isVoiceMode && (
            <div className="mt-4 rounded-xl border border-theme-green/20 bg-theme-green/5 p-4">
              <p className="text-xs font-semibold text-theme-green">Voice mode guidelines</p>
              <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                {VOICE_TIPS.map((tip, index) => (
                  <li key={index} className="leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
