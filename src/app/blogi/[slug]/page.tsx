import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BlogPost } from '@/types/electricity'
import { format } from 'date-fns'
import { fi } from 'date-fns/locale'
import { ArrowLeft, Eye, Calendar, Tag } from 'lucide-react'

interface BlogPostPageProps {
  params: { slug: string }
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/blog/${slug}`, {
      cache: 'no-store',
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data.success ? data.data : null
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return null
  }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    return {
      title: 'Artikkelia ei löytynyt - SpottiSähkö.fi',
      description: 'Etsimääsi artikkelia ei löytynyt.',
    }
  }

  return {
    title: `${post.title} - SpottiSähkö.fi`,
    description: post.meta_description,
    keywords: post.keywords.join(', '),
    authors: [{ name: 'SpottiSähkö.fi' }],
    openGraph: {
      title: post.title,
      description: post.meta_description,
      type: 'article',
      publishedTime: post.published_at,
      authors: ['SpottiSähkö.fi'],
    },
    // JSON-LD structured data for articles
    other: {
      'application/ld+json': JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.meta_description,
        author: {
          '@type': 'Organization',
          name: 'SpottiSähkö.fi',
        },
        publisher: {
          '@type': 'Organization',
          name: 'SpottiSähkö.fi',
        },
        datePublished: post.published_at,
        dateModified: post.published_at,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${process.env.NEXT_PUBLIC_APP_URL}/blogi/${post.slug}`,
        },
      }),
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const post = await getBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  // Convert markdown to HTML (basic implementation)
  const htmlContent = post.content
    .replace(/# (.*$)/gim, '<h1>$1</h1>')
    .replace(/## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(/### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n\n/gim, '</p><p class="mb-4">')
    .replace(/\n/gim, '<br>')
    .replace(/^(.+)/, '<p class="mb-4">$1')
    .concat('</p>')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <article className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Navigation */}
          <div className="mb-8">
            <Link href="/blogi">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Takaisin blogiin
              </Button>
            </Link>
          </div>

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.published_at}>
                  {format(new Date(post.published_at), 'dd.MM.yyyy HH:mm', { locale: fi })}
                </time>
              </div>
              
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views} katselukertaa</span>
              </div>
            </div>

            {/* Keywords */}
            {post.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <Tag className="h-4 w-4 text-gray-500 mt-1" />
                {post.keywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Article Content */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div 
              className="prose prose-lg max-w-none
                prose-headings:text-gray-900 
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-strong:text-gray-900
                prose-em:text-gray-600
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>

          {/* Footer */}
          <footer className="mt-12 text-center">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Kiinnostaako sähkön hinta?</h3>
              <p className="text-gray-600 mb-4">
                Seuraa reaaliaikaista pörssisähkön hintaa ja säästä sähkölaskussa.
              </p>
              <Link href="/">
                <Button>
                  Katso nykyinen hinta
                </Button>
              </Link>
            </div>
          </footer>
        </div>
      </article>
    </div>
  )
}