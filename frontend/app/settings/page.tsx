'use client'

import { motion } from 'framer-motion'

const sections = [
  {
    title: 'Profile',
    description: 'Update your name, notification preferences, and security settings.',
  },
  {
    title: 'Connected Accounts',
    description: 'Link bank accounts, UPI IDs, and bookkeeping tools coming soon.',
  },
  {
    title: 'Coach Preferences',
    description: 'Tell TaalAI how often to nudge you and what topics you care about most.',
  },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
          <h1 className="text-3xl md:text-4xl font-semibold">Tune your TaalAI experience</h1>
          <p className="text-sm text-muted-foreground">
            Personalise the coach and manage account details. More controls are on the way.
          </p>
        </motion.div>

        <div className="grid gap-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
              className="neuro-card rounded-3xl p-6"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
