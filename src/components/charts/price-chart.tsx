'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ElectricityPrice } from '@/types/electricity'
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import { fi } from 'date-fns/locale'
import { getPriceColor } from '@/lib/utils'

interface PriceChartProps {
  data: ElectricityPrice[]
  className?: string
}

type TimeRange = '24h' | '7d' | '30d'

export function PriceChart({ data, className }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')

  const getFilteredData = () => {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case '24h':
        startDate = subDays(now, 1)
        break
      case '7d':
        startDate = subDays(now, 7)
        break
      case '30d':
        startDate = subDays(now, 30)
        break
      default:
        startDate = subDays(now, 1)
    }

    return data
      .filter(price => {
        const priceDate = new Date(price.timestamp)
        return isAfter(priceDate, startDate) && isBefore(priceDate, now)
      })
      .map(price => ({
        ...price,
        timestamp: new Date(price.timestamp).getTime(),
        displayTime: format(new Date(price.timestamp), 
          timeRange === '24h' ? 'HH:mm' : 'dd.MM HH:mm', 
          { locale: fi }
        ),
        color: price.price_cents_kwh < 5 ? '#22c55e' : 
               price.price_cents_kwh <= 10 ? '#eab308' : '#ef4444'
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  const chartData = getFilteredData()
  
  // Calculate average for reference line
  const averagePrice = chartData.length > 0 
    ? chartData.reduce((sum, item) => sum + item.price_cents_kwh, 0) / chartData.length
    : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.displayTime}</p>
          <p className={`text-lg font-bold ${getPriceColor(data.price_cents_kwh)}`}>
            {data.price_cents_kwh.toFixed(2)} c/kWh
          </p>
          {data.forecast && (
            <p className="text-sm text-gray-500">Ennuste</p>
          )}
        </div>
      )
    }
    return null
  }

  const formatXAxisTick = (tickItem: number) => {
    const date = new Date(tickItem)
    return timeRange === '24h' 
      ? format(date, 'HH:mm', { locale: fi })
      : format(date, 'dd.MM', { locale: fi })
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Sähkön hintatrendi</CardTitle>
            <CardDescription>
              Pörssisähkön hinnan kehitys ajan kuluessa
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Ei hintatietoja valitulta aikaväliltä
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatXAxisTick}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'c/kWh', angle: -90, position: 'insideLeft' }}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Average price reference line */}
              <ReferenceLine 
                y={averagePrice} 
                stroke="#6b7280" 
                strokeDasharray="5 5"
                label={{ value: `Keskiarvo: ${averagePrice.toFixed(2)} c/kWh`, position: 'top' }}
              />
              
              {/* Price thresholds */}
              <ReferenceLine y={5} stroke="#22c55e" strokeDasharray="3 3" opacity={0.5} />
              <ReferenceLine y={10} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} />
              
              <Line
                type="monotone"
                dataKey="price_cents_kwh"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', r: 3 }}
                activeDot={{ r: 5, fill: '#1d4ed8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-price-low rounded-full"></div>
            <span>Halpa (&lt; 5 c/kWh)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-price-medium rounded-full"></div>
            <span>Normaali (5-10 c/kWh)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-price-high rounded-full"></div>
            <span>Kallis (&gt; 10 c/kWh)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}