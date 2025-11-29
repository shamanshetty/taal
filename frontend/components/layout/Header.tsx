'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Bell, User, Settings, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/store/useUserStore'

export function Header() {
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)

  const displayName =
    user?.full_name?.split(' ')[0] ??
    (user?.email ? user.email.split('@')[0] : 'there')

  const userEmail = user?.email ?? '—'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsProfileOpen(false)
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 glass backdrop-blur-xl">
      <div className="flex items-center justify-between h-16 px-4 md:px-6 lg:px-8 lg:ml-[280px]">
        {/* Logo (visible on mobile, hidden on desktop where sidebar shows it) */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-neon">
            <span className="text-white font-bold text-xl">T</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient-primary">TaalAI</h1>
          </div>
        </div>

        {/* Desktop: Just show spacer */}
        <div className="hidden lg:block" />

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search transactions, goals, insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background/50 border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-theme-green/50 transition-all"
            />
          </div>
        </div>

        {/* Right Section: Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Search Icon (Mobile) */}
          <button className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-theme-green rounded-full" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full gradient-secondary flex items-center justify-center ring-2 ring-sage-500/20">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-semibold capitalize">{displayName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileOpen(false)}
                  />

                  {/* Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 neuro-card rounded-2xl p-2 z-50"
                  >
                    <div className="px-3 py-2 border-b border-white/10 mb-2">
                      <p className="text-sm font-semibold capitalize">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{userEmail}</p>
                    </div>

                    <Link href="/settings" onClick={() => setIsProfileOpen(false)}>
                      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Settings</span>
                      </button>
                    </Link>

                    <Link href="/onboarding" onClick={() => setIsProfileOpen(false)}>
                      <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Profile</span>
                      </button>
                    </Link>

                    <div className="border-t border-white/10 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-left text-destructive"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
