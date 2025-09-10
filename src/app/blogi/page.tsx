'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BlogPost } from '@/types/electricity'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'
import { Eye, ArrowRight, Loader2 } from 'lucide-react'

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/api/blog?limit=20', {
          cache: 'no-store',
        })
        
        if (response.ok) {
          const data = await response.json()
          setPosts(data.success ? data.data : [])
        }
      } catch (error) {
        console.error('Error fetching blog posts:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPosts()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Sähkön hinta -blogi
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ajankohtaisia analyysejä pörssisähkön hinnasta, säästövinkkejä ja 
              käytännön ohjeita sähkölaskun pienentämiseen
            </p>
          </div>

          {loading ? (
            <Card className="text-center py-12">
              <CardContent>
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Ladataan blogisivuja...</p>
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Blogisisältöä ei vielä saatavilla. Sisältöä generoidaan automaattisesti päivittäin.
                </p>
                <Link href="/">
                  <Button>
                    Takaisin etusivulle
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <Card key={post.slug} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2 hover:text-blue-600 transition-colors">
                          <Link href={`/blogi/${post.slug}`}>
                            {post.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="text-base">
                          {post.meta_description}
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
                      <time dateTime={post.published_at}>
                        {format(new Date(post.published_at), 'dd.MM.yyyy HH:mm', { locale: fi })}
                      </time>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{post.views} katselukertaa</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.keywords.slice(0, 4).map((keyword, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    
                    <Link href={`/blogi/${post.slug}`}>
                      <Button variant="outline" size="sm">
                        Lue lisää
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/">
              <Button variant="outline">
                ← Takaisin etusivulle
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}