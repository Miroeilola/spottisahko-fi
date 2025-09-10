'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, getPriceColor, formatPrice, formatTimestamp } from '@/lib/utils'
import { ElectricityPrice } from '@/types/electricity'
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'

interface PriceDisplayProps {
  currentPrice?: ElectricityPrice
  previousPrice?: ElectricityPrice
  className?: string
}

export function PriceDisplay({ currentPrice, previousPrice, className }: PriceDisplayProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    if (currentPrice) {
      setLastUpdated(new Date())
    }
  }, [currentPrice])

  if (!currentPrice) {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Zap className="h-6 w-6" />
            Sähkön hinta
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold text-muted-foreground mb-2">
            --.- c/kWh
          </div>
          <CardDescription>
            Ladataan hintatietoja...
          </CardDescription>
        </CardContent>
      </Card>
    )
  }

  const priceColorClass = getPriceColor(currentPrice.price_cents_kwh)
  
  // Calculate trend
  let trendIcon = <Minus className="h-5 w-5" />
  let trendText = "Vakaa"
  let trendColor = "text-muted-foreground"

  if (previousPrice) {
    const difference = currentPrice.price_cents_kwh - previousPrice.price_cents_kwh
    if (difference > 0.1) {
      trendIcon = <TrendingUp className="h-5 w-5" />
      trendText = `+${difference.toFixed(2)} c/kWh`
      trendColor = "text-red-500"
    } else if (difference < -0.1) {
      trendIcon = <TrendingDown className="h-5 w-5" />
      trendText = `${difference.toFixed(2)} c/kWh`
      trendColor = "text-green-500"
    }
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          <Zap className="h-6 w-6" />
          Sähkön pörssihinta
        </CardTitle>
        <CardDescription>
          {currentPrice.forecast ? 'Ennuste' : 'Toteutunut hinta'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className={cn("text-5xl font-bold mb-2", priceColorClass)}>
          {formatPrice(currentPrice.price_cents_kwh)}
        </div>
        
        <div className={cn("flex items-center justify-center gap-2 mb-4", trendColor)}>
          {trendIcon}
          <span className="text-sm font-medium">{trendText}</span>
        </div>

        <CardDescription className="text-xs">
          Päivitetty: {formatTimestamp(lastUpdated)}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

interface StatsCardsProps {
  stats?: {
    avg_price: number
    min_price: number  
    max_price: number
    median_price: number
  }
  className?: string
}

export function StatsCards({ stats, className }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
        {['Keskihinta', 'Minimi', 'Maksimi', 'Mediaani'].map((title) => (
          <Card key={title} className="text-center">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                --.-
              </div>
              <p className="text-xs text-muted-foreground">c/kWh</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const cards = [
    { title: 'Keskihinta', value: stats.avg_price, color: 'text-blue-600' },
    { title: 'Minimi', value: stats.min_price, color: 'text-green-600' },
    { title: 'Maksimi', value: stats.max_price, color: 'text-red-600' },
    { title: 'Mediaani', value: stats.median_price, color: 'text-purple-600' }
  ]

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {cards.map((card) => (
        <Card key={card.title} className="text-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", card.color)}>
              {card.value.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">c/kWh</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}