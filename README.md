# SpottiSähkö.fi

Real-time Finnish electricity spot price monitoring and analysis platform.

## Features

- ⚡ Real-time electricity spot price monitoring
- 📊 Historical data and statistics 
- 📝 Automated SEO-optimized blog content generation
- 📈 Interactive price charts and trends
- 🎯 Google AdSense monetization
- 📱 Responsive design

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Database**: SurrealDB
- **Deployment**: Railway
- **Analytics**: Google Analytics 4
- **AI Content**: Google Gemini AI

## Getting Started

### Prerequisites

- Node.js 18+ 
- SurrealDB
- ENTSO-E API key
- Google AI API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/spottisahko-fi.git
cd spottisahko-fi
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Start SurrealDB
```bash
surreal start --log trace --user root --pass root memory
```

5. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## API Integrations

### ENTSO-E API
- Get API key from [transparency.entsoe.eu](https://transparency.entsoe.eu)
- Document type: A44 (Day-ahead prices)
- Area code: 10YFI-1--------U (Finland)

### Google Gemini AI
- Get API key from [ai.google.dev](https://ai.google.dev)
- Model: gemini-1.5-flash
- Used for automated blog content generation

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   └── blogi/          # Blog pages
├── components/         # React components
│   ├── ui/             # shadcn/ui components
│   ├── charts/         # Chart components
│   └── analytics/      # Analytics components
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.