# SpottiSähkö.fi - Development Guide

## 🚀 Quick Start

### Option 1: Local Development (Recommended)
```bash
# 1. Clone and setup
git clone <repository-url>
cd spottisahko-fi
npm install

# 2. Start SurrealDB in Docker
npm run db:start

# 3. Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Start development server
npm run dev
```

### Option 2: Full Docker Development
```bash
# Start everything with Docker Compose
npm run docker:dev:build

# Or without rebuild
npm run docker:dev

# Stop all services
npm run docker:down
```

## 🗄️ Database Options

### SurrealDB in Docker (Default)
```bash
# Start in-memory database (fastest, data lost on restart)
npm run db:start

# Start persistent database (data saved to disk)
docker-compose -f docker-compose.dev.yml --profile persistent up db-persistent -d

# Stop database
npm run db:stop
```

### Manual SurrealDB Installation
```bash
# Install SurrealDB locally (alternative to Docker)
curl -sSf https://install.surrealdb.com | sh

# Start local instance
surreal start --log info --user root --pass root memory
```

## 🔧 Development Scripts

```bash
# Development
npm run dev          # Start dev server (localhost:3000)
npm run db:start     # Start SurrealDB in Docker
npm run db:stop      # Stop SurrealDB container

# Docker Development
npm run docker:dev          # Start full stack with Docker
npm run docker:dev:build    # Rebuild and start Docker stack
npm run docker:down         # Stop all Docker services

# Code Quality
npm run lint         # ESLint code checking
npm run type-check   # TypeScript validation
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:ci      # CI tests with coverage

# Production
npm run build        # Build for production
npm run start        # Start production server
```

## 🔑 Environment Setup

### Required Environment Variables
Copy `.env.example` to `.env.local` and configure:

```env
# Database (Auto-configured for Docker)
SURREALDB_URL=http://localhost:8000
SURREALDB_USER=root
SURREALDB_PASS=root
SURREALDB_NS=spottisahko
SURREALDB_DB=main

# Essential APIs
ENTSOE_API_KEY=your_entsoe_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Optional Services
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxx
CRON_SECRET=your_secure_secret

# Development
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Getting API Keys

#### ENTSO-E API (Required for real price data)
1. Visit [transparency.entsoe.eu](https://transparency.entsoe.eu)
2. Create account and apply for API access
3. Add key to `.env.local`

#### Google AI API (Required for blog generation)
1. Visit [ai.google.dev](https://ai.google.dev)
2. Create project and enable Gemini API
3. Generate API key and add to `.env.local`

> **Note**: The app works with mock data if API keys are missing

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI**: shadcn/ui components (Radix UI + Tailwind)
- **Database**: SurrealDB (graph database)
- **Charts**: Recharts for price visualization
- **AI**: Google Gemini for content generation
- **Analytics**: Google Analytics 4, AdSense

### Key Components
```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API endpoints
│   ├── blogi/          # Blog pages
│   └── page.tsx        # Homepage
├── components/         # React components
│   ├── ui/             # shadcn/ui base components
│   ├── charts/         # Price chart components
│   └── analytics/      # GA4 & AdSense components
├── lib/                # Core libraries
│   ├── db.ts           # SurrealDB client
│   ├── entso-e.ts      # Electricity price API
│   └── gemini.ts       # AI content generation
└── types/              # TypeScript definitions
```

### API Endpoints
- `GET /api/prices` - Historical price data
- `GET /api/prices/current` - Current price with trend
- `GET /api/stats` - Daily statistics
- `GET /api/blog` - Blog posts list
- `GET /api/health` - Application health
- `POST /api/cron/*` - Automated tasks (protected)

## 🔄 Data Flow

### Price Data Pipeline
1. **Cron Job** (every 5 min) → **ENTSO-E API** → **SurrealDB**
2. **Frontend** → **API Routes** → **SurrealDB** → **Components**
3. **Mock Fallback** when database unavailable

### Content Generation
1. **Daily Cron** → **Price Analysis** → **Gemini AI** → **Blog Post**
2. **SEO Optimization** → **Finnish Keywords** → **Metadata**

## 🧪 Testing

### Running Tests
```bash
# All tests
npm test

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage

# CI tests (no watch, with coverage)
npm run test:ci
```

### Test Structure
- **Unit Tests**: `src/__tests__/lib/` - Core logic
- **Component Tests**: `src/__tests__/components/` - React components  
- **API Tests**: `src/__tests__/api/` - API endpoints
- **Mock Data**: Comprehensive fallbacks for offline development

## 🔍 Debugging

### Development Tools
```bash
# View SurrealDB logs
docker logs surrealdb-dev -f

# Check database connection
curl http://localhost:8000/health

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/prices/current
```

### Common Issues

#### Database Connection
- Ensure SurrealDB container is running: `docker ps`
- Check network connectivity: `curl localhost:8000/health`
- Verify environment variables in `.env.local`

#### API Errors
- Mock data fallbacks prevent 500 errors during development
- Check API keys are properly set in `.env.local`  
- ENTSO-E API has rate limits - don't hammer it

#### Build Issues
- Run `npm run type-check` for TypeScript errors
- Clear Next.js cache: `rm -rf .next`
- Check for syntax errors in configuration files

## 🚀 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete production setup instructions.

## 🐛 Troubleshooting

### Docker Issues
```bash
# Remove all containers and rebuild
docker-compose -f docker-compose.dev.yml down --volumes
npm run docker:dev:build

# Check container status
docker ps
docker logs <container-name>
```

### Performance Tips
- Use `npm run docker:dev` (no rebuild) for faster restarts
- SurrealDB memory mode is fastest for development
- Enable persistent mode only when testing data persistence

### IDE Setup
- VS Code: Install recommended extensions (TypeScript, Tailwind CSS, Docker)
- TypeScript strict mode enabled for better code quality
- ESLint and Prettier for consistent code formatting

## 📚 Learning Resources
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [SurrealDB Documentation](https://surrealdb.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Finnish Electricity Market](https://www.entsoe.eu/)

Happy coding! ⚡