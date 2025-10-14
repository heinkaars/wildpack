# Wildlife Explorer 🦅

A beautiful, modern web application for discovering and exploring wildlife species around the world. Built with React, TypeScript, and Lovable Cloud.

![Wildlife Explorer](https://images.unsplash.com/photo-1484406566174-9da000fda645?w=1200&h=400&fit=crop)

## ✨ Features

### 🌍 Location-Based Discovery
- **Smart Location Detection**: Automatically detects your location and shows relevant species nearby
- **City-Based Display**: Shows your current city/region (e.g., "277 species likely today near San Francisco, CA")
- **Adjustable Distance**: Search radius from 5 to 1000 km
- **Offline Fallback**: Works without location permissions, showing global species

### 🔍 Advanced Filtering
- **Category Filters**: Filter by Birds, Mammals, Reptiles, Amphibians, Insects, Fish, Arachnids, Plants, and Fungi
- **Region Selection**: Browse species by geographic region when not using location
- **Real-Time Search**: Instant search across species names and scientific names
- **Smart Filter Menu**: Merlin-inspired filter panel with badge indicators

### 📱 Beautiful UI/UX
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Smooth Animations**: Polished transitions and hover effects
- **Dark/Light Mode**: Adapts to system preferences
- **Loading States**: Skeleton screens for better perceived performance

### 🔗 Live Data Integration
- **Hybrid Data Source**: Combines cached database species with live iNaturalist API data
- **Species Details**: Rich information including images, scientific names, conservation status
- **Automatic Merging**: Deduplicates and prioritizes most recent data

### 🗺️ Interactive Features
- **Species Cards**: Beautiful cards with images, rarity badges, and key information
- **Detailed Views**: Click any species to see full details, description, and Wikipedia links
- **Location Toggle**: Quick bottom-right button to enable/disable location-based filtering

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Modern web browser with geolocation support (optional)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd wildlife-explorer

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Setup

This project uses Lovable Cloud for backend services. Environment variables are automatically configured:
- `VITE_SUPABASE_URL` - Backend API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **Lucide React** - Icon library

### Backend (Lovable Cloud)
- **Database** - PostgreSQL via Supabase
- **Edge Functions** - Serverless API endpoints
- **Real-time** - Live data synchronization
- **Authentication** - User management (ready to use)

### APIs & Services
- **iNaturalist API** - Live species observation data
- **OpenStreetMap Nominatim** - Reverse geocoding for city names

### State Management
- **TanStack Query (React Query)** - Server state management
- **React Router** - Client-side routing

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── FilterMenu.tsx  # Filter panel component
│   ├── SpeciesCard.tsx # Species card component
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useSpecies.tsx  # Species data fetching
│   ├── useGeolocation.tsx # Browser geolocation
│   └── useCityName.tsx # Reverse geocoding
├── pages/              # Route pages
│   ├── Explore.tsx     # Main species browser
│   ├── SpeciesDetail.tsx # Individual species view
│   └── ...
├── utils/              # Utility functions
│   ├── geocoding.ts    # Location utilities
│   └── locationUtils.ts # Distance calculations
└── data/              # Type definitions
    └── species.ts     # Species interface

supabase/
├── functions/         # Edge functions
│   └── fetch-species/ # iNaturalist API integration
└── migrations/       # Database schema
```

## 🎨 Design System

The app uses a semantic design system with HSL color tokens for theming:
- **Primary Colors**: Brand colors for main UI elements
- **Secondary Colors**: Supporting colors for accents
- **Semantic Tokens**: Card, background, foreground, muted, etc.
- **Responsive Breakpoints**: Mobile-first approach

## 🔧 Development

### Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Configuration

This project connects to Lovable Cloud automatically. To modify backend:
1. Use Lovable's built-in backend editor
2. Database migrations sync automatically
3. Edge functions deploy on save

## 🌐 Deployment

### Deploy with Lovable (Recommended)
1. Open [Lovable Project](https://lovable.dev/projects/9be553cc-0433-47fb-bc9a-bde16ec382a4)
2. Click **Share → Publish**
3. Your app will be live instantly

### Custom Domain
Navigate to **Project → Settings → Domains** to connect your custom domain.

[Learn more about custom domains](https://docs.lovable.dev/features/custom-domain)

### Self-Hosting
The codebase is standard React/Vite and can be deployed to:
- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting service

Note: You'll need to configure environment variables in your hosting platform.

## 🤝 Contributing

This project uses Lovable's GitHub integration with two-way sync:
- Changes in Lovable automatically push to GitHub
- Changes pushed to GitHub sync to Lovable

### Local Development Workflow
1. Clone the repository
2. Make changes in your IDE
3. Commit and push to GitHub
4. Changes automatically sync to Lovable

### Lovable Development Workflow
1. Edit in [Lovable](https://lovable.dev/projects/9be553cc-0433-47fb-bc9a-bde16ec382a4)
2. Changes automatically commit to GitHub
3. Pull changes to your local environment if needed

## 📝 License

This project was created with [Lovable](https://lovable.dev) and is available for modification and distribution.

## 🙏 Acknowledgments

- **iNaturalist** - For providing open biodiversity data
- **OpenStreetMap** - For reverse geocoding services
- **Lovable** - For the development platform
- **shadcn/ui** - For beautiful component primitives
- **Unsplash** - For high-quality wildlife photography

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Visit [Lovable Documentation](https://docs.lovable.dev)
- Join [Lovable Discord Community](https://discord.gg/lovable)

---

Built with ❤️ using [Lovable](https://lovable.dev)
