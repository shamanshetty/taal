import Link from 'next/link'
import { ArrowRight, Sparkles, TrendingUp, Shield } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto space-y-8">
          <div className="inline-block">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-saffron-200 dark:border-saffron-800">
              <Sparkles className="w-4 h-4 text-saffron-500" />
              <span className="text-sm font-medium text-saffron-700 dark:text-saffron-400">
                AI-Powered Financial Coach
              </span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent gradient-saffron">
              TaalAI
            </span>
            <br />
            <span className="text-gray-900 dark:text-white">
              Master Your Money
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Built for Indians with irregular incomes - freelancers, gig workers, and influencers.
            Understand your income rhythm, get personalized advice, and achieve your financial goals.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link
              href="/login?mode=signup"
              className="group px-8 py-4 rounded-full gradient-saffron text-white font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-700 hover:border-saffron-500 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8" />}
            title="Income Rhythm Engine"
            description="Track and learn your income volatility patterns. Get a dynamic financial pulse score that adapts to your unique rhythm."
            gradient="gradient-saffron"
          />
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="Smart Decisions"
            description="Simulate 'What if I buy this?' scenarios. See how purchases impact your savings and goals in real-time."
            gradient="gradient-sage"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Tax Insights"
            description="Auto-classify transactions and get quarterly tax estimates. Stay compliant without the complexity."
            gradient="gradient-saffron"
          />
        </div>
      </div>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="glass-card rounded-2xl p-6 hover:shadow-xl transition-shadow">
      <div className={`w-16 h-16 rounded-xl ${gradient} flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}
