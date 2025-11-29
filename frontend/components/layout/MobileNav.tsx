'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessageCircle,
  Calculator,
  Wallet,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Money',
    href: '/transactions',
    icon: Wallet,
  },
  {
    title: 'Simulate',
    href: '/simulator',
    icon: Calculator,
  },
  {
    title: 'Chat',
    href: '/chat',
    icon: MessageCircle,
  },
  {
    title: 'Profile',
    href: '/settings',
    icon: User,
  },
]

export function MobileNav() {
  const pathname = usePathname()

  // Don't show on landing/auth pages
  if (pathname === '/' || pathname === '/login' || pathname === '/onboarding') {
    return null
  }

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 safe-area-bottom"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 py-2"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveTab"
                    className="absolute inset-0 -m-2 rounded-2xl bg-theme-green/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <div
                  className={cn(
                    'relative w-12 h-12 flex items-center justify-center rounded-2xl transition-colors',
                    isActive ? 'text-saffron-500' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </motion.div>

              <span
                className={cn(
                  'text-[10px] font-medium mt-1 transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </motion.nav>
  )
}
