'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, MessageCircle, FileQuestion } from 'lucide-react'

const faqs = [
  {
    question: 'How does TaalAI understand irregular income?',
    answer: 'We look at your deposits, volatility, and pulse score to personalise nudges. The more data you share, the sharper the advice.',
  },
  {
    question: 'Can I speak to a human coach?',
    answer: 'Yes—hit the support form or drop us an email and we will schedule a call for complex questions.',
  },
  {
    question: 'Where do I update my tax info?',
    answer: 'Head to Tax Insights → Settings. You can declare deductions, advance tax payments, and business expenses there.',
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-5xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Help & support</p>
          <h1 className="text-3xl md:text-4xl font-semibold">How can we make TaalAI work better for you?</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Browse quick answers, reach out to the team, or jump into the chat coach for instant guidance.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-3">
          <SupportCard
            icon={<Mail className="w-5 h-5" />}
            title="Email support"
            description="support@taalai.app"
            href="mailto:support@taalai.app"
          />
          <SupportCard
            icon={<MessageCircle className="w-5 h-5" />}
            title="Chat coach"
            description="Ask the coach a quick question"
            href="/chat"
          />
          <SupportCard
            icon={<FileQuestion className="w-5 h-5" />}
            title="Product guide"
            description="Learn how goals, tax, and what-if work"
            href="#faq"
          />
        </div>

        <div id="faq" className="space-y-4">
          <h2 className="text-xl font-semibold">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="neuro-card rounded-3xl p-5"
              >
                <p className="font-medium text-sm">{faq.question}</p>
                <p className="text-xs text-muted-foreground mt-1">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SupportCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href} className="neuro-card rounded-3xl p-5 flex flex-col gap-2 hover:border-theme-green/40 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-theme-green/15 text-theme-green flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  )
}
