import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Header } from '@/components/layout/Header'
import { AuthProvider } from '@/components/providers/AuthProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TaalAI - AI Financial Coach for India',
  description: 'Master your irregular income with AI-powered insights, smart predictions, and personalized financial coaching.',
  manifest: '/manifest.json',
  themeColor: '#1a1d29',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${poppins.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <div className="relative min-h-screen bg-background">
              {/* Sidebar Navigation */}
              <Sidebar />

              {/* Main Content */}
              <main className="min-h-screen pb-20 lg:pb-0">
                {/* Header Bar */}
                <Header />
                
                {children}
              </main>

              {/* Mobile Bottom Navigation */}
              <MobileNav />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
