import { render, screen } from '@testing-library/react'
import { PriceDisplay, StatsCards } from '@/components/price-display'
import { ElectricityPrice } from '@/types/electricity'

describe('PriceDisplay', () => {
  const mockCurrentPrice: ElectricityPrice = {
    timestamp: '2024-01-15T14:00:00.000Z',
    price_cents_kwh: 7.25,
    price_area: 'FI',
    forecast: false
  }

  const mockPreviousPrice: ElectricityPrice = {
    timestamp: '2024-01-15T13:00:00.000Z',
    price_cents_kwh: 6.50,
    price_area: 'FI',
    forecast: false
  }

  it('should render loading state when no price data', () => {
    render(<PriceDisplay />)
    
    expect(screen.getByText('--.- c/kWh')).toBeInTheDocument()
    expect(screen.getByText('Ladataan hintatietoja...')).toBeInTheDocument()
  })

  it('should render current price correctly', () => {
    render(<PriceDisplay currentPrice={mockCurrentPrice} />)
    
    expect(screen.getByText('7.25 c/kWh')).toBeInTheDocument()
    expect(screen.getByText('Toteutunut hinta')).toBeInTheDocument()
  })

  it('should show forecast when price is forecast', () => {
    const forecastPrice = { ...mockCurrentPrice, forecast: true }
    render(<PriceDisplay currentPrice={forecastPrice} />)
    
    expect(screen.getByText('Ennuste')).toBeInTheDocument()
  })

  it('should show price trend when previous price available', () => {
    render(
      <PriceDisplay 
        currentPrice={mockCurrentPrice} 
        previousPrice={mockPreviousPrice} 
      />
    )
    
    // Difference: 7.25 - 6.50 = 0.75, should show increase
    expect(screen.getByText('+0.75 c/kWh')).toBeInTheDocument()
  })

  it('should apply correct price color classes', () => {
    const lowPrice = { ...mockCurrentPrice, price_cents_kwh: 3.0 }
    const { rerender } = render(<PriceDisplay currentPrice={lowPrice} />)
    
    expect(screen.getByText('3.00 c/kWh')).toHaveClass('text-price-low')
    
    const mediumPrice = { ...mockCurrentPrice, price_cents_kwh: 7.0 }
    rerender(<PriceDisplay currentPrice={mediumPrice} />)
    
    expect(screen.getByText('7.00 c/kWh')).toHaveClass('text-price-medium')
    
    const highPrice = { ...mockCurrentPrice, price_cents_kwh: 12.0 }
    rerender(<PriceDisplay currentPrice={highPrice} />)
    
    expect(screen.getByText('12.00 c/kWh')).toHaveClass('text-price-high')
  })
})

describe('StatsCards', () => {
  const mockStats = {
    avg_price: 6.75,
    min_price: 3.25,
    max_price: 12.50,
    median_price: 6.00
  }

  it('should render loading state when no stats', () => {
    render(<StatsCards />)
    
    expect(screen.getAllByText('--.-')).toHaveLength(4)
    expect(screen.getByText('Keskihinta')).toBeInTheDocument()
    expect(screen.getByText('Minimi')).toBeInTheDocument()
    expect(screen.getByText('Maksimi')).toBeInTheDocument()
    expect(screen.getByText('Mediaani')).toBeInTheDocument()
  })

  it('should render stats correctly when data available', () => {
    render(<StatsCards stats={mockStats} />)
    
    expect(screen.getByText('6.75')).toBeInTheDocument()
    expect(screen.getByText('3.25')).toBeInTheDocument()
    expect(screen.getByText('12.50')).toBeInTheDocument()
    expect(screen.getByText('6.00')).toBeInTheDocument()
  })

  it('should apply correct color classes to stats', () => {
    render(<StatsCards stats={mockStats} />)
    
    expect(screen.getByText('6.75')).toHaveClass('text-blue-600') // avg
    expect(screen.getByText('3.25')).toHaveClass('text-green-600') // min
    expect(screen.getByText('12.50')).toHaveClass('text-red-600') // max
    expect(screen.getByText('6.00')).toHaveClass('text-purple-600') // median
  })
})