import { getPriceColor, formatPrice, formatTimestamp } from '@/lib/utils'

describe('Utils', () => {
  describe('getPriceColor', () => {
    it('should return low price color for prices under 5', () => {
      expect(getPriceColor(3.5)).toBe('text-price-low')
      expect(getPriceColor(4.99)).toBe('text-price-low')
    })

    it('should return medium price color for prices between 5-10', () => {
      expect(getPriceColor(5)).toBe('text-price-medium')
      expect(getPriceColor(7.5)).toBe('text-price-medium')
      expect(getPriceColor(10)).toBe('text-price-medium')
    })

    it('should return high price color for prices over 10', () => {
      expect(getPriceColor(10.01)).toBe('text-price-high')
      expect(getPriceColor(15)).toBe('text-price-high')
    })
  })

  describe('formatPrice', () => {
    it('should format price with 2 decimal places', () => {
      expect(formatPrice(5)).toBe('5.00 c/kWh')
      expect(formatPrice(7.567)).toBe('7.57 c/kWh')
      expect(formatPrice(12.999)).toBe('13.00 c/kWh')
    })
  })

  describe('formatTimestamp', () => {
    it('should format string timestamp in Finnish locale', () => {
      const timestamp = '2024-01-15T14:30:00.000Z'
      const result = formatTimestamp(timestamp)
      expect(result).toContain('15.01.2024')
      expect(result).toMatch(/\d{2}[:\.]30/)
    })

    it('should format Date object in Finnish locale', () => {
      const date = new Date('2024-01-15T14:30:00.000Z')
      const result = formatTimestamp(date)
      expect(result).toContain('15.01.2024')
      expect(result).toMatch(/\d{2}[:\.]30/)
    })
  })
})