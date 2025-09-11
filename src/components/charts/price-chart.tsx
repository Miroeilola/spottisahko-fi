'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ElectricityPrice } from '@/types/electricity'
import { format, subDays, subYears, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import { fi } from 'date-fns/locale'
import { getPriceColor } from '@/lib/utils'
import { TrendingUp, BarChart3 } from 'lucide-react'

interface PriceChartProps {
  data: ElectricityPrice[] // Initial data for short periods
  className?: string
  includeVat?: boolean
  currentPrice?: number // Current price for reference line
}

type TimeRange = '24h' | '7d' | '30d' | '1y' | '5y'
type ChartType = 'line' | 'bar'

export function PriceChart({ data, className, includeVat = false, currentPrice }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartData, setChartData] = useState<ElectricityPrice[]>(data)
  const [loading, setLoading] = useState(false)

  // Fetch appropriate data based on time range
  useEffect(() => {
    const fetchDataForRange = async () => {
      if (timeRange === '1y' || timeRange === '5y') {
        setLoading(true)
        try {
          const days = timeRange === '1y' ? 365 : 1825
          const vatParam = includeVat ? '?vat=true' : ''
          const response = await fetch(`/api/prices/daily?days=${days}${includeVat ? '&vat=true' : ''}`)
          const result = await response.json()
          
          if (result.success) {
            setChartData(result.data)
          }
        } catch (error) {
          console.error('Failed to fetch long-term data:', error)
        } finally {
          setLoading(false)
        }
      } else {
        // Use provided data for short periods
        setChartData(data)
      }
    }

    fetchDataForRange()
  }, [timeRange, includeVat, data])

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
      case '1y':
        startDate = subYears(now, 1)
        break
      case '5y':
        startDate = subYears(now, 5)
        break
      default:
        startDate = subDays(now, 1)
    }

    // Filter data based on the time range, including future forecast data
    // For short periods (24h, 7d, 30d), include forecast data up to 2 days ahead
    const maxFutureDate = new Date(now)
    maxFutureDate.setDate(maxFutureDate.getDate() + (timeRange === '24h' || timeRange === '7d' || timeRange === '30d' ? 2 : 0))
    
    const filteredByRange = chartData.filter(price => {
      const priceDate = new Date(price.timestamp)
      return isAfter(priceDate, startDate) && isBefore(priceDate, maxFutureDate)
    })

    // For long periods, if no data in range, show all available data including forecasts
    const finalData = (timeRange === '1y' || timeRange === '5y') && filteredByRange.length === 0 
      ? chartData.filter(price => isBefore(new Date(price.timestamp), maxFutureDate))
      : filteredByRange

    return finalData
      .map(price => ({
        ...price,
        timestamp: new Date(price.timestamp).getTime(),
        displayTime: format(new Date(price.timestamp), 
          timeRange === '24h' ? 'HH:mm' : 
          timeRange === '7d' ? 'dd.MM HH:mm' :
          timeRange === '30d' ? 'dd.MM HH:mm' :
          'dd.MM.yyyy', 
          { locale: fi }
        ),
        color: price.price_cents_kwh < 5 ? '#22c55e' : 
               price.price_cents_kwh <= 10 ? '#eab308' : '#ef4444'
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  const filteredData = getFilteredData()
  
  // Calculate average for reference line
  const averagePrice = filteredData.length > 0 
    ? filteredData.reduce((sum, item) => sum + item.price_cents_kwh, 0) / filteredData.length
    : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.displayTime}</p>
          <p className={`text-lg font-bold ${getPriceColor(data.price_cents_kwh)}`}>
            {data.is_daily_avg ? 'Keskiarvo: ' : ''}{data.price_cents_kwh.toFixed(2)} c/kWh
          </p>
          {data.is_daily_avg && data.min_price && data.max_price && (
            <div className="text-sm text-gray-600 mt-1">
              <p>Min: {data.min_price.toFixed(2)} c/kWh</p>
              <p>Max: {data.max_price.toFixed(2)} c/kWh</p>
            </div>
          )}
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
      : timeRange === '7d' || timeRange === '30d'
      ? format(date, 'dd.MM', { locale: fi })
      : format(date, 'MM/yy', { locale: fi })
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
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Chart Type Selector */}
            <div className="flex gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                className="flex items-center gap-1"
              >
                <TrendingUp className="h-4 w-4" />
                Viiva
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="flex items-center gap-1"
              >
                <BarChart3 className="h-4 w-4" />
                Pylväs
              </Button>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex gap-2">
              {(['24h', '7d', '30d', '1y', '5y'] as TimeRange[]).map((range) => (
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
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Ladataan hintatietoja...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Ei hintatietoja valitulta aikaväliltä
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'line' ? (
              <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                
                {/* Current time and price indicator (vertical line) */}
                <ReferenceLine 
                  x={new Date().getTime()} 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  label={{ 
                    value: currentPrice ? `Nyt: ${currentPrice.toFixed(2)} c/kWh` : 'Nyt', 
                    position: 'topLeft', 
                    offset: 10 
                  }}
                />
                
                <Line
                  type="monotone"
                  dataKey="price_cents_kwh"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 3 }}
                  activeDot={{ r: 5, fill: '#1d4ed8' }}
                />
              </LineChart>
            ) : (
              <BarChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                
                {/* Current time and price indicator (vertical line) */}
                <ReferenceLine 
                  x={new Date().getTime()} 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  label={{ 
                    value: currentPrice ? `Nyt: ${currentPrice.toFixed(2)} c/kWh` : 'Nyt', 
                    position: 'topLeft', 
                    offset: 10 
                  }}
                />
                
                <Bar
                  dataKey="price_cents_kwh"
                  radius={[2, 2, 0, 0]}
                >
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.price_cents_kwh < 5 ? '#22c55e' : 
                            entry.price_cents_kwh <= 10 ? '#eab308' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
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