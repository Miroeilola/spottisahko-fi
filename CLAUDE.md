# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpottiSähkö.fi is a Finnish electricity spot price monitoring platform built with Next.js 14 App Router. The application fetches real-time electricity prices from ENTSO-E API, stores data in SurrealDB, and generates automated blog content using Google Gemini AI.

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Database (SurrealDB)
surreal start --log trace --user root --pass root memory  # Start local SurrealDB
```

## Architecture and Data Flow

### Core Data Types
All electricity-related types are defined in `src/types/electricity.ts`:
- `ElectricityPrice`: Real-time and forecast price data with Finnish area code
- `DailyStats`: Aggregated daily statistics (min/max/avg/median prices)
- `BlogPost`: SEO-optimized blog content with metadata
- `PageView`: Analytics tracking for user behavior

### Price Color System
The application uses a three-tier color system for electricity prices (defined in `tailwind.config.js` and `src/lib/utils.ts`):
- **Green** (`price-low`): < 5 cents/kWh - cheap electricity
- **Yellow** (`price-medium`): 5-10 cents/kWh - moderate pricing  
- **Red** (`price-high`): > 10 cents/kWh - expensive electricity

### Directory Structure
- `src/app/` - Next.js App Router pages and API routes
  - `api/` - Backend API endpoints for price data and cron jobs
  - `blogi/` - Blog pages for SEO content
- `src/components/` - React components organized by purpose:
  - `ui/` - shadcn/ui base components
  - `charts/` - Interactive price charts (Recharts)
  - `analytics/` - Google Analytics integration
- `src/lib/` - Utility functions and configurations
- `src/types/` - TypeScript interfaces and types

## External API Integration

### ENTSO-E API
- **Purpose**: Fetch Finnish electricity spot prices  
- **API Key**: Required from transparency.entsoe.eu
- **Document Type**: A44 (Day-ahead prices)
- **Area Code**: 10YFI-1--------U (Finland)
- **Data Format**: XML → converted to EUR/MWh → stored as cents/kWh

### Google Gemini AI
- **Purpose**: Automated SEO blog content generation
- **Model**: gemini-1.5-flash (cost-efficient)
- **Input**: Current prices, trends, statistics
- **Output**: JSON with title, content (markdown), meta description, keywords, slug

### Database Schema (SurrealDB)
- `electricity_price`: Price data with timestamp, price_cents_kwh, forecast flag
- `daily_stats`: Aggregated statistics per date
- `blog_posts`: Generated content with SEO metadata  
- `page_views`: Analytics data for tracking user behavior

## Styling and UI Framework

Uses shadcn/ui (Radix UI + Tailwind CSS) with custom electricity pricing theme. The `cn()` utility in `src/lib/utils.ts` combines clsx and tailwind-merge for conditional styling.

Key utility functions:
- `getPriceColor()`: Returns appropriate color class based on price
- `formatPrice()`: Formats price as "X.XX c/kWh"  
- `formatTimestamp()`: Finnish locale date/time formatting

## Environment Configuration

Required environment variables (see `.env.example`):
- `SURREALDB_*`: Database connection settings
- `ENTSOE_API_KEY`: ENTSO-E API access
- `GOOGLE_AI_API_KEY`: Gemini AI integration
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: Google Analytics
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`: AdSense monetization
- `CRON_SECRET`: Authentication for scheduled tasks

## Development Notes

### Planned Architecture
The application is designed for Railway deployment with three main services:
1. **Next.js app**: Frontend and API endpoints
2. **SurrealDB**: Centralized database
3. **Cron service**: Scheduled data fetching and content generation

### SEO Strategy
- ISR (Incremental Static Regeneration) for caching
- Automated blog content targeting Finnish electricity keywords
- Structured data (JSON-LD) for price information
- Meta tags optimized for Finnish search terms

### Price Update Flow
1. Cron job fetches prices every 5 minutes from ENTSO-E
2. Data processed and stored in SurrealDB
3. WebSocket updates pushed to frontend
4. Statistics recalculated and cached
5. Daily blog content generated at 10:00 AM

When working with this codebase, always consider the Finnish context (language, currency, time zones) and electricity market specifics. The application targets Finnish users searching for "sähkön hinta", "pörssisähkö", and related terms.