import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.SURREALDB_URL = 'http://localhost:8000'
process.env.ENTSOE_API_KEY = 'test-api-key'
process.env.GOOGLE_AI_API_KEY = 'test-ai-key'
process.env.CRON_SECRET = 'test-secret'

// Mock fetch globally
global.fetch = jest.fn()

// Mock ResizeObserver for recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.gtag for Google Analytics
Object.defineProperty(window, 'gtag', {
  value: jest.fn(),
  writable: true,
})

// Mock window.adsbygoogle for Google AdSense
Object.defineProperty(window, 'adsbygoogle', {
  value: [],
  writable: true,
})