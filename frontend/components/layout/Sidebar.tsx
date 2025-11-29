'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageCircle,
  Calculator,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Target,
  Bell,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/store/useUserStore'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: Wallet,
  },
  {
    title: 'Goals',
    href: '/goals',
    icon: Target,
  },
  {
    title: 'Chat Coach',
    href: '/chat',
    icon: MessageCircle,
  },
  {
    title: 'What If',
    href: '/simulator',
    icon: Calculator,
  },
  {
    title: 'Tax Insights',
    href: '/tax',
    icon: FileText,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: TrendingUp,
  },
]

const bottomNavItems: NavItem[] = [
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
  {
    title: 'Help',
    href: '/help',
    icon: HelpCircle,
  },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const setUser = useUserStore((state) => state.setUser)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.replace('/login')
  }

  // Don't show sidebar on landing/auth pages
  if (pathname === '/' || pathname === '/login' || pathname === '/onboarding') {
    return null
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 80 : 280,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen glass border-r border-white/10 z-50"
      >
        {/* Header */}
        <div className="px-6 pt-4 pb-4 mb-2 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 -mt-1"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-neon border border-white/10">
                  <Image
                    src="/taalai.png"
                    alt="TaalAI logo"
                    width={40}
                    height={40}
                    priority
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'center' }}
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gradient-primary leading-tight">TaalAI</h1>
                  <p className="mt-1 text-xs text-muted-foreground">Financial Coach</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group',
                    isActive
                      ? 'bg-theme-green/20 shadow-inner-glow'
                      : 'hover:bg-white/5',
                    isCollapsed && 'justify-center px-0'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full gradient-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <div className="relative">
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isActive
                          ? 'text-saffron-500'
                          : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {item.badge && !isCollapsed && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-saffron-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className={cn(
                          'font-medium text-sm transition-colors',
                          isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground group-hover:text-foreground'
                        )}
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {item.badge && isCollapsed && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-saffron-500 rounded-full" />
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 space-y-2 border-t border-white/10">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    isActive ? 'bg-white/5' : 'hover:bg-white/5',
                    isCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-medium text-sm text-muted-foreground"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            )
          })}

          {/* Logout */}
          <motion.button
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-destructive/10 text-destructive',
              isCollapsed && 'justify-center px-0'
            )}
          >
            <LogOut className="w-5 h-5" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-medium text-sm"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* Spacer for content */}
      <div
        className={cn(
          'hidden lg:block transition-all duration-300',
          isCollapsed ? 'w-20' : 'w-[280px]'
        )}
      />
    </>
  )
}
