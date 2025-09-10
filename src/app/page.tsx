'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PriceDisplay, StatsCards } from '@/components/price-display'
import { PriceChart } from '@/components/charts/price-chart'
import { BannerAd, SquareAd } from '@/components/analytics/adsense'
import { trackEvent } from '@/components/analytics/google-analytics'
import { ElectricityPrice, DailyStats, BlogPost } from '@/types/electricity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'
import { ArrowRight, TrendingUp, BarChart3, BookOpen, Zap } from 'lucide-react'

interface HomePageData {
  currentPrice?: ElectricityPrice
  previousPrice?: ElectricityPrice
  stats?: DailyStats
  priceHistory: ElectricityPrice[]
  recentPosts: BlogPost[]
}

export default function Home() {
  const [data, setData] = useState<HomePageData>({
    priceHistory: [],
    recentPosts: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch current price
        const currentResponse = await fetch('/api/prices/current')
        const currentData = await currentResponse.json()
        
        // Fetch price history (last 24 hours)
        const historyResponse = await fetch('/api/prices?hours=24')
        const historyData = await historyResponse.json()
        
        // Fetch today's stats
        const statsResponse = await fetch('/api/stats')
        const statsData = await statsResponse.json()
        
        // Fetch recent blog posts
        const blogResponse = await fetch('/api/blog?limit=3')
        const blogData = await blogResponse.json()
        
        setData({
          currentPrice: currentData.success ? currentData.data.current : undefined,
          previousPrice: currentData.success ? currentData.data.previous : undefined,
          stats: statsData.success ? statsData.data : undefined,
          priceHistory: historyData.success ? historyData.data : [],
          recentPosts: blogData.success ? blogData.data : []
        })
        
        // Track page view
        trackEvent('page_view', 'homepage', 'main')
        
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError('Tietojen lataus epäonnistui. Yritä päivittää sivu.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  const handleBlogClick = (slug: string) => {
    trackEvent('click', 'blog_post', slug)
  }

  const handleChartInteraction = () => {
    trackEvent('interaction', 'price_chart', 'view')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">SpottiSähkö.fi</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/blogi">
                <Button variant="ghost" size="sm">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Blogi
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Sähkön pörssihinta reaaliajassa
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Seuraa Suomen sähkön spot-hintaa tunneittain, analysoi trendejä ja säästä sähkölaskussa
          </p>
          
          {/* Banner Ad */}
          <BannerAd className="mb-8" />
        </div>

        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="text-center py-6">
              <p className="text-red-600">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="mt-4"
              >
                Päivitä sivu
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {/* Current Price Display */}
            <section>
              <PriceDisplay 
                currentPrice={data.currentPrice}
                previousPrice={data.previousPrice}
              />
            </section>

            {/* Statistics Cards */}
            <section>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Päivän tilastot
              </h3>
              <StatsCards stats={data.stats} />
            </section>

            {/* Price Chart */}
            <section onClick={handleChartInteraction}>
              <PriceChart data={data.priceHistory} />
            </section>

            {/* Recent Blog Posts */}
            {data.recentPosts.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-6 w-6" />
                    Ajankohtaista
                  </h3>
                  <Link href="/blogi">
                    <Button variant="outline" size="sm">
                      Kaikki artikkelit
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {data.recentPosts.map((post) => (
                    <Card key={post.slug} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg line-clamp-2">
                          <Link 
                            href={`/blogi/${post.slug}`}
                            onClick={() => handleBlogClick(post.slug)}
                            className="hover:text-blue-600 transition-colors"
                          >
                            {post.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {post.meta_description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <time dateTime={post.published_at}>
                            {format(new Date(post.published_at), 'dd.MM.yyyy', { locale: fi })}
                          </time>
                          <span>{post.views} katselua</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <SquareAd />
            
            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Säästövinkit</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>Käytä sähköä halvimpina tunteina (alle 5 c/kWh)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600">•</span>
                    <span>Vältä kalliimpia tunteja (yli 10 c/kWh)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span>Lataa ajastettavia laitteita yöllä</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600">•</span>
                    <span>Seuraa huomisen ennusteita</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Market Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tietoa pörssisähköstä</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Pörssisähkön hinta määräytyy Nord Pool -sähköpörssissä tunneittain.</p>
                <p>Hinta voi vaihdella merkittävästi päivän sisällä riippuen kysynnästä ja tarjonnasta.</p>
                <p>Edullisin aika on yleensä yöllä ja viikonloppuisin.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-4">
              © 2024 SpottiSähkö.fi - Sähkön pörssihinta reaaliajassa
            </p>
            <p className="text-sm">
              Hintatiedot haetaan ENTSO-E:n virallisesta rajapinnasta.
              Tiedot ovat viitteellisiä, todellinen hinta voi vaihdella sähkösopimuksesi mukaan.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}