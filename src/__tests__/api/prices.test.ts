import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/prices/route'

// Mock database
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
}

jest.mock('@/lib/db', () => ({
  database: {
    connect: jest.fn(() => mockDb.connect()),
    getDb: () => mockDb
  }
}))

describe('/api/prices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return prices successfully', async () => {
      const mockPrices = [
        {
          timestamp: '2024-01-15T14:00:00.000Z',
          price_cents_kwh: 7.25,
          price_area: 'FI',
          forecast: false
        }
      ]
      
      mockDb.query.mockResolvedValue([mockPrices])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/prices?hours=24',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPrices)
      expect(data.count).toBe(1)
    })

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/prices',
      })

      const response = await GET(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to fetch electricity prices')
    })

    it('should limit hours parameter', async () => {
      mockDb.query.mockResolvedValue([[]])

      const { req } = createMocks({
        method: 'GET',
        url: '/api/prices?hours=1000', // Should be capped at 168
      })

      await GET(req as any)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('- 168h')
      )
    })
  })

  describe('POST', () => {
    const mockPrices = [
      {
        timestamp: '2024-01-15T14:00:00.000Z',
        price_cents_kwh: 7.25,
        price_area: 'FI',
        forecast: false
      }
    ]

    it('should save prices successfully', async () => {
      mockDb.query.mockResolvedValue([])

      const { req } = createMocks({
        method: 'POST',
        body: { prices: mockPrices },
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Inserted/updated 1 price records')
    })

    it('should validate prices array', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: { prices: 'invalid' },
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Prices must be an array')
    })

    it('should handle database errors during save', async () => {
      mockDb.query.mockRejectedValue(new Error('Database error'))

      const { req } = createMocks({
        method: 'POST',
        body: { prices: mockPrices },
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to save electricity prices')
    })
  })
})