'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface HeartbeatPulseProps {
  data: Array<{ month: string; income: number; expense: number }>
}

export function HeartbeatPulse({ data }: HeartbeatPulseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Calculate net income (income - expense) for heartbeat effect
    const netValues = data.map((d) => d.income - d.expense)
    const maxAbsValue = netValues.length > 0 ? Math.max(...netValues.map(Math.abs), 1) : 1

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw center line (neutral - 0)
    const centerY = rect.height / 2
    ctx.strokeStyle = 'rgba(176, 179, 184, 0.2)' // Cool gray
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(0, centerY)
    ctx.lineTo(rect.width, centerY)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw heartbeat line
    const segmentWidth = data.length > 1 ? rect.width / (data.length - 1) : rect.width

    // Create gradient for the line based on overall performance
    const totalNet = netValues.reduce((sum, val) => sum + val, 0)
    const avgNet = netValues.length > 0 ? totalNet / netValues.length : 0

    const gradient = ctx.createLinearGradient(0, 0, rect.width, 0)
    if (avgNet > 0) {
      // Pure green for profit
      gradient.addColorStop(0, '#16A34A')
      gradient.addColorStop(1, '#22C55E')
    } else if (avgNet < 0) {
      // Pure red for debt
      gradient.addColorStop(0, '#EF4444')
      gradient.addColorStop(1, '#DC2626')
    } else {
      // Grey for neutral
      gradient.addColorStop(0, '#6B7280')
      gradient.addColorStop(1, '#9CA3AF')
    }

    ctx.strokeStyle = gradient
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Draw the heartbeat path
    ctx.beginPath()

    data.forEach((point, index) => {
      const x = index * segmentWidth
      const netValue = point.income - point.expense
      const normalizedValue = (netValue / maxAbsValue) * (rect.height * 0.35)
      const y = centerY - normalizedValue // Negative because canvas Y is inverted

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        // Create smooth curve with control points for heartbeat effect
        const prevX = (index - 1) * segmentWidth
        const prevNetValue = netValues[index - 1]
        const prevNormalizedValue = (prevNetValue / maxAbsValue) * (rect.height * 0.35)
        const prevY = centerY - prevNormalizedValue

        const cpX = prevX + segmentWidth / 2
        ctx.quadraticCurveTo(cpX, prevY, x, y)
      }
    })

    ctx.stroke()

    // Draw data points
    data.forEach((point, index) => {
      const x = index * segmentWidth
      const netValue = point.income - point.expense
      const normalizedValue = (netValue / maxAbsValue) * (rect.height * 0.35)
      const y = centerY - normalizedValue

      // Determine color based on positive/negative
      let pointColor
      if (netValue > 0) {
        pointColor = '#16A34A' // Green for positive
      } else if (netValue < 0) {
        pointColor = '#EF4444' // Red for negative
      } else {
        pointColor = '#999999' // Grey for neutral
      }

      // Draw point
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = pointColor
      ctx.shadowBlur = 0
      ctx.fill()

      // Draw inner dot
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fillStyle = '#1C2532'
      ctx.fill()
    })

  }, [data])

  // Calculate current stats
  const latestData = data[data.length - 1] || { income: 0, expense: 0 }
  const netIncome = latestData.income - latestData.expense
  const savingsRate = latestData.income > 0 ? ((netIncome / latestData.income) * 100).toFixed(1) : 0

  return (
    <div className="relative">
      {/* Reversed card - lighter background */}
      <div className="neuro-card rounded-3xl p-6 relative overflow-hidden">
        {/* Header */}
        <div className="relative z-10 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-muted-foreground">Financial Rhythm</h3>
              <p className="text-sm text-muted-foreground/60 mt-1">Income pulse over time</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-grotesk text-gradient-green-gold">
                {netIncome >= 0 ? '+' : ''}₹{Math.abs(netIncome).toLocaleString('en-IN')}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {savingsRate}% savings rate
              </div>
            </div>
          </div>
        </div>

        {/* Heartbeat Canvas */}
        <div className="relative h-48 mb-4">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-theme-green" />
            <span className="text-muted-foreground">Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-theme-grey" />
            <span className="text-muted-foreground">Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Negative</span>
          </div>
        </div>

        {/* Pulse indicator */}
        <motion.div
          className="absolute bottom-6 left-6 flex items-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-2 h-2 rounded-full bg-theme-green pulse-green" />
          <span className="text-xs text-theme-green font-medium">Live</span>
        </motion.div>
      </div>
    </div>
  )
}
