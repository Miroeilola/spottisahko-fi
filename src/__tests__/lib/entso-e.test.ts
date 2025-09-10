import { EntsoEClient } from '@/lib/entso-e'

// Mock environment
const originalEnv = process.env.ENTSOE_API_KEY
beforeAll(() => {
  process.env.ENTSOE_API_KEY = 'test-api-key'
})

afterAll(() => {
  process.env.ENTSOE_API_KEY = originalEnv
})

describe('EntsoEClient', () => {
  let client: EntsoEClient

  beforeEach(() => {
    client = new EntsoEClient()
    // Reset fetch mock
    jest.resetAllMocks()
  })

  it('should initialize with API key from environment', () => {
    expect(() => new EntsoEClient()).not.toThrow()
  })

  it('should throw error if API key is missing', () => {
    const originalKey = process.env.ENTSOE_API_KEY
    delete process.env.ENTSOE_API_KEY
    
    expect(() => new EntsoEClient()).toThrow('ENTSO-E API key is required')
    
    process.env.ENTSOE_API_KEY = originalKey
  })

  describe('fetchDayAheadPrices', () => {
    const mockXmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Publication_MarketDocument>
        <TimeSeries>
          <Period>
            <timeInterval>
              <start>2024-01-15T00:00Z</start>
              <end>2024-01-16T00:00Z</end>
            </timeInterval>
            <resolution>PT1H</resolution>
            <Point>
              <position>1</position>
              <price.amount>75.50</price.amount>
            </Point>
            <Point>
              <position>2</position>
              <price.amount>65.25</price.amount>
            </Point>
          </Period>
        </TimeSeries>
      </Publication_MarketDocument>`

    it('should fetch and parse day-ahead prices successfully', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse),
      } as Response)

      const date = new Date('2024-01-15')
      const prices = await client.fetchDayAheadPrices(date)

      expect(prices).toHaveLength(2)
      expect(prices[0]).toEqual({
        timestamp: '2024-01-15T00:00:00.000Z',
        price_cents_kwh: 7.55, // 75.50 EUR/MWh = 7.55 c/kWh
        price_area: 'FI',
        forecast: false // Current date/time for testing
      })
      expect(prices[1]).toEqual({
        timestamp: '2024-01-15T01:00:00.000Z',
        price_cents_kwh: 6.53, // 65.25 EUR/MWh = 6.525 c/kWh rounded to 6.53
        price_area: 'FI',
        forecast: false // Current date/time for testing
      })
    })

    it('should handle API errors gracefully', async () => {
      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      const date = new Date('2024-01-15')
      
      await expect(client.fetchDayAheadPrices(date)).rejects.toThrow(
        'ENTSO-E API error: 500 Internal Server Error'
      )
    })

    it('should handle empty XML response', async () => {
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
        <Publication_MarketDocument>
        </Publication_MarketDocument>`

      const mockFetch = jest.mocked(fetch)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(emptyXml),
      } as Response)

      const date = new Date('2024-01-15')
      const prices = await client.fetchDayAheadPrices(date)

      expect(prices).toEqual([])
    })
  })
})