'use client'

import Script from 'next/script'
import { useEffect } from 'react'

export function GoogleAdSense() {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  if (!adsenseClientId) {
    return null
  }

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}

interface AdUnitProps {
  slot: string
  style?: React.CSSProperties
  className?: string
  format?: 'auto' | 'fluid' | 'rectangle'
}

export function AdUnit({ slot, style, className, format = 'auto' }: AdUnitProps) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  useEffect(() => {
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        window.adsbygoogle.push({})
      } catch (error) {
        console.error('AdSense error:', error)
      }
    }
  }, [])

  if (!adsenseClientId) {
    // Development placeholder
    return (
      <div 
        className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center p-4 ${className}`}
        style={style}
      >
        <span className="text-gray-500 text-sm">AdSense Placeholder</span>
      </div>
    )
  }

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block', ...style }}
      data-ad-client={adsenseClientId}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  )
}

// Banner ad for above the fold
export function BannerAd({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AdUnit
        slot="1234567890" // Replace with actual slot ID
        style={{ height: '90px' }}
        className="w-full"
      />
    </div>
  )
}

// Square ad for sidebar or between content
export function SquareAd({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AdUnit
        slot="0987654321" // Replace with actual slot ID
        style={{ width: '300px', height: '250px' }}
        className="mx-auto"
      />
    </div>
  )
}

// Responsive ad that adapts to container
export function ResponsiveAd({ className }: { className?: string }) {
  return (
    <div className={className}>
      <AdUnit
        slot="1122334455" // Replace with actual slot ID
        format="fluid"
        className="w-full"
      />
    </div>
  )
}

// Extend Window interface for AdSense
declare global {
  interface Window {
    adsbygoogle: any[]
  }
}