# SpottiSähkö.fi - Deployment Guide

## 🚀 Production Deployment on Railway

### 1. Prerequisites
- Railway account at [railway.app](https://railway.app)
- GitHub repository with this code
- API keys for external services

### 2. Required Environment Variables
Set these in Railway dashboard:

```env
# Database
SURREALDB_URL=http://surrealdb-service:8000
SURREALDB_USER=root
SURREALDB_PASS=your_secure_password
SURREALDB_NS=spottisahko
SURREALDB_DB=main

# API Keys (Required)
ENTSOE_API_KEY=your_entsoe_api_key
GOOGLE_AI_API_KEY=your_google_ai_key

# Analytics & Monetization (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxx

# Security
CRON_SECRET=your_secure_random_string

# Production URL
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
NODE_ENV=production
```

### 3. API Key Setup

#### ENTSO-E API Key
1. Visit [transparency.entsoe.eu](https://transparency.entsoe.eu)
2. Create account and request API access
3. Add key to `ENTSOE_API_KEY` environment variable

#### Google AI API Key
1. Visit [ai.google.dev](https://ai.google.dev) 
2. Create project and enable Gemini API
3. Generate API key and add to `GOOGLE_AI_API_KEY`

#### Google Analytics (Optional)
1. Set up GA4 property at [analytics.google.com](https://analytics.google.com)
2. Add measurement ID to `NEXT_PUBLIC_GA_MEASUREMENT_ID`

#### Google AdSense (Optional)
1. Apply for AdSense at [adsense.google.com](https://adsense.google.com)
2. Add client ID to `NEXT_PUBLIC_ADSENSE_CLIENT_ID`

### 4. Railway Deployment Steps

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```

2. **Configure Services**
   - Web service will auto-deploy from `railway.toml`
   - SurrealDB service will be created automatically
   - Cron jobs will be scheduled for data fetching

3. **Verify Deployment**
   - Check `/api/health` endpoint
   - Monitor logs for any errors
   - Test price data fetching

## 🐳 Docker Deployment

### Local Docker Setup
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t spottisahko-fi .
docker run -p 3000:3000 --env-file .env.local spottisahko-fi
```

### Production Docker
```bash
# Build production image
docker build -t spottisahko-fi:prod .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e SURREALDB_URL=your_db_url \
  -e ENTSOE_API_KEY=your_key \
  -e GOOGLE_AI_API_KEY=your_key \
  spottisahko-fi:prod
```

## 📊 Monitoring & Maintenance

### Health Checks
- `/api/health` - Application health status
- Monitor response times and error rates
- Set up uptime monitoring (e.g., BetterUptime)

### Automated Tasks
- **Price fetching**: Every 5 minutes via cron
- **Blog generation**: Daily at 10:00 AM via cron
- **Database cleanup**: Consider adding monthly cleanup job

### Performance Optimization
- Enable Redis for caching (future enhancement)
- Monitor database query performance
- Optimize image loading and bundle size

## 🔧 Development Setup

### Local Development
```bash
# Clone repository
git clone <repository-url>
cd spottisahko-fi

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### Available Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run type-check   # TypeScript validation
npm run test         # Jest tests
npm run test:ci      # Tests with coverage
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify SurrealDB is running
   - Check connection string format
   - Ensure network connectivity

2. **API Rate Limits**
   - ENTSO-E API has rate limits
   - Implement exponential backoff
   - Cache responses appropriately

3. **Build Failures**
   - Run `npm run type-check` to identify TypeScript errors
   - Ensure all environment variables are set
   - Check for syntax errors in configuration files

4. **Performance Issues**
   - Enable production optimizations
   - Monitor bundle size with `npm run build`
   - Use caching strategies for API responses

### Support
- Check GitHub issues for known problems
- Review Railway logs for deployment issues
- Monitor application metrics and error rates

## 📈 Post-Deployment Checklist

- [ ] Health check endpoint responding
- [ ] Price data fetching successfully
- [ ] Blog generation working
- [ ] Google Analytics tracking
- [ ] AdSense ads displaying (if configured)
- [ ] SEO meta tags and structured data
- [ ] Site performance meets standards (Lighthouse)
- [ ] Error monitoring configured
- [ ] Backup strategy implemented