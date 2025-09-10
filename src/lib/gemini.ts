import { GoogleGenerativeAI } from '@google/generative-ai'
import { BlogPost, ElectricityPrice, DailyStats } from '@/types/electricity'

export class GeminiAI {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      // Only warn during build, don't throw error
      if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
        console.warn('Google AI API key not configured - blog generation will be unavailable')
      }
      // Set dummy values to allow build to complete
      this.genAI = null as any
      this.model = null as any
      return
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  async generateBlogPost(
    currentPrice: ElectricityPrice,
    stats: DailyStats,
    recentPrices: ElectricityPrice[]
  ): Promise<Partial<BlogPost>> {
    if (!this.genAI || !this.model) {
      throw new Error('Google AI API key is required')
    }
    const prompt = this.createBlogPrompt(currentPrice, stats, recentPrices)
    
    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()
      
      return this.parseBlogResponse(text)
    } catch (error) {
      console.error('Failed to generate blog content:', error)
      throw new Error('Failed to generate blog content with Gemini AI')
    }
  }

  private createBlogPrompt(
    currentPrice: ElectricityPrice,
    stats: DailyStats,
    recentPrices: ElectricityPrice[]
  ): string {
    const trend = this.analyzeTrend(recentPrices)
    const priceLevel = this.categorizePriceLevel(currentPrice.price_cents_kwh)
    
    return `
Kirjoita SEO-optimoitu suomenkielinen blogipostaus sähkön pörssihinnasta. Käytä seuraavia tietoja:

NYKYINEN HINTA: ${currentPrice.price_cents_kwh.toFixed(2)} c/kWh (${priceLevel})
PÄIVÄN TILASTOT:
- Keskihinta: ${stats.avg_price.toFixed(2)} c/kWh
- Minimi: ${stats.min_price.toFixed(2)} c/kWh  
- Maksimi: ${stats.max_price.toFixed(2)} c/kWh
- Mediaani: ${stats.median_price.toFixed(2)} c/kWh

HINTATRENDI: ${trend}

Kirjoita vastaus JSON-muodossa seuraavilla kentillä:
{
  "title": "Houkutteleva otsikko (max 60 merkkiä)",
  "slug": "url-ystävällinen-slug",
  "meta_description": "SEO-kuvaus (max 160 merkkiä)",
  "keywords": ["avainsana1", "avainsana2", "avainsana3"],
  "content": "Markdown-muotoinen sisältö (500-800 sanaa)"
}

VAATIMUKSET:
- Sisällytä ajankohtainen hinta-analyysi ja käytännön vinkkejä
- Käytä avainsanoja: "sähkön hinta", "pörssisähkö", "sähkölasku", "energiasäästö"
- Kirjoita selkeää ja hyödyllistä sisältöä suomalaisille kuluttajille
- Sisällytä konkreettisia säästövinkkejä hintatason mukaan
- Mainitse ajankohta ja päivän hintatiedot
`
  }

  private analyzeTrend(prices: ElectricityPrice[]): string {
    if (prices.length < 2) return "Vakaa"
    
    const recent = prices.slice(-6) // Last 6 hours
    const older = prices.slice(-12, -6) // Previous 6 hours
    
    const recentAvg = recent.reduce((sum, p) => sum + p.price_cents_kwh, 0) / recent.length
    const olderAvg = older.reduce((sum, p) => sum + p.price_cents_kwh, 0) / older.length
    
    const change = recentAvg - olderAvg
    
    if (change > 1) return "Voimakkaasti nouseva"
    if (change > 0.5) return "Nouseva"
    if (change < -1) return "Voimakkaasti laskeva"
    if (change < -0.5) return "Laskeva"
    return "Vakaa"
  }

  private categorizePriceLevel(price: number): string {
    if (price < 3) return "Erittäin halpa"
    if (price < 5) return "Halpa"
    if (price < 8) return "Normaali"
    if (price < 12) return "Kallis"
    return "Erittäin kallis"
  }

  private parseBlogResponse(response: string): Partial<BlogPost> {
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response')
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        title: parsed.title,
        slug: this.generateSlug(parsed.title),
        meta_description: parsed.meta_description,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        content: parsed.content,
        published_at: new Date().toISOString(),
        views: 0
      }
    } catch (error) {
      console.error('Failed to parse Gemini response:', error)
      throw new Error('Invalid response format from Gemini AI')
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o')
      .replace(/å/g, 'a')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }
}

export const geminiAI = new GeminiAI()