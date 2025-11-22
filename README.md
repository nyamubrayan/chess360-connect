# 🧠♟️ Chessafari — Learn, Play & Grow in the Journey of Chess

A next-generation chess platform blending AI-powered learning, real-time gameplay, and smart coaching.

## 🌍 About Chessafari

Chessafari is a global chess experience inspired by the word "Safari" — a journey. Just like a safari, every player begins a path of discovery: learning, practicing, and mastering the game step by step.

This platform empowers players to:
- ♟️ **Play real-time chess** with friends or matched opponents
- 🧩 **Improve through AI analysis** and personalized training
- 📊 **Analyze games** to identify strengths and weaknesses
- 🎯 **Train smarter** with AI-powered insights and lessons
- 🌐 **Connect with players** worldwide in the Networking Zone
- 🏆 **Compete in tournaments** with various formats
- 📚 **Learn openings and endgames** through interactive lessons

## 🚀 Key Features

### ♟️ Real-Time Multiplayer Chess
- Smart matchmaking system (Bullet, Blitz, Rapid, Classical)
- Live game synchronization with Supabase Realtime
- Complete chess rules enforcement (castling, en passant, promotion)
- In-game chat and move takeback requests
- ELO rating system with rating changes

### 🤖 AI-Powered Training
- **AI Mentor Mode** - Real-time move analysis during gameplay
- **Smart Training** - Personalized learning paths based on your play
- **Post-Game Analysis** - Detailed breakdown of every game
- **AI Coach Training** - Solo and multiplayer practice with instant feedback
- Move quality classification (good, questionable, mistake, blunder)

### 🧩 Comprehensive Learning
- **Chess Puzzles** - Tactical training with difficulty levels
- **Opening Theory** - Interactive lessons on popular openings
- **Endgame Training** - Master essential endgame techniques
- **Chess Basics** - Learn piece movement and fundamentals
- **Progress Tracking** - Monitor improvement with stats and streaks

### 🌐 Social & Networking
- **Networking Zone** - Discover and connect with players worldwide
- **ChessMates System** - Friend requests with puzzle verification
- **Private Messaging** - Chat with connected friends
- **Online Status** - See which friends are active
- **Profile System** - Showcase your achievements and stats

### 🏆 Competitive Features
- **Tournament System** - Single-elimination, Round-robin, Swiss
- **Tournament Schedule** - View match times and standings
- **Leaderboards** - Compete for top rankings
- **Game Highlights** - Generate shareable video clips of your games
- **Game History** - Complete record of all your matches

### 📊 Analytics & Insights
- **Deep Analytics** - Track performance trends over time
- **Move-by-move Analysis** - Understand every decision
- **Performance Graphs** - Visualize rating progression
- **Heatmaps** - See move distribution patterns
- **Statistics Dashboard** - Comprehensive game metrics

## 🏗️ Tech Stack

### Frontend
- **React 18** + **TypeScript** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling
- **Shadcn UI** + **Radix UI** - Beautiful, accessible components
- **React Router v6** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Zustand** - Lightweight state management
- **chess.js** - Chess engine and move validation
- **react-chessboard** - Interactive chessboard component

### Backend & Database
- **Supabase (PostgreSQL)** - Database and authentication
- **Supabase Realtime** - WebSocket-based live updates
- **Supabase Storage** - File storage (avatars, lessons)
- **Supabase Edge Functions** - Serverless backend logic (Deno)
- **Row-Level Security (RLS)** - Database-level authorization

### AI & External Services
- **Lovable AI** - Game analysis and insights (Gemini/GPT)
- **OpenAI API** - Optional AI integration
- **Google Gemini** - Alternative AI backend

## 📁 Project Structure

```
chessafari/
├── src/
│   ├── components/          # React components
│   │   ├── chess/          # Chess game components
│   │   ├── training/       # Training module UI
│   │   ├── tournaments/    # Tournament components
│   │   └── ui/            # Reusable UI components (Shadcn)
│   ├── pages/              # Page routes
│   │   ├── Index.tsx      # Landing page
│   │   ├── ChessGame.tsx  # Live game interface
│   │   ├── Training.tsx   # Training dashboard
│   │   ├── Connect.tsx    # Networking zone
│   │   ├── Tournaments.tsx
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── integrations/       
│   │   └── supabase/      # Supabase client & types
│   └── lib/               # Utility functions
├── supabase/
│   ├── functions/          # Edge functions (backend)
│   │   ├── analyze-game/
│   │   ├── analyze-move/
│   │   ├── chess-game-action/
│   │   ├── create-chess-game/
│   │   ├── find-match/
│   │   └── ...
│   ├── migrations/         # Database schema & migrations
│   └── config.toml        # Supabase configuration
├── public/                 # Static assets
│   ├── _headers           # Caching & security headers
│   └── ...
├── netlify.toml           # Netlify deployment config
├── NETLIFY_DEPLOYMENT.md  # Deployment guide
└── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for backend)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd chessafari
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=your-project-ref
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Open browser:**
   Navigate to `http://localhost:5173`

### Database Setup

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Link to your Supabase project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Push database migrations:**
   ```bash
   supabase db push
   ```

4. **Deploy edge functions:**
   ```bash
   supabase functions deploy analyze-game
   supabase functions deploy analyze-move
   supabase functions deploy chess-game-action
   # ... deploy other functions
   ```

5. **Configure authentication:**
   - Enable email authentication in Supabase Dashboard
   - Set up email templates
   - Enable auto-confirm for testing

## 📦 Deployment

### Deploy to Netlify

See **[NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)** for complete deployment instructions.

**Quick Deploy:**
1. Export project to GitHub
2. Connect repository to Netlify
3. Set environment variables
4. Deploy!

### Deploy to Vercel

1. Import GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables
5. Deploy

### Deploy to Custom Server

1. Build the project: `npm run build`
2. Serve the `dist` folder with any static host
3. Configure redirects for client-side routing
4. Set up environment variables

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project reference ID | ✅ |

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🔧 Configuration Files

- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `netlify.toml` - Netlify deployment settings
- `supabase/config.toml` - Supabase configuration

## 🎨 Design System

The project uses a comprehensive design system defined in:
- `src/index.css` - CSS variables and design tokens
- `tailwind.config.ts` - Extended Tailwind theme
- `src/components/ui/` - Shadcn UI components

### Color Palette
- **Primary:** Blue (#3B82F6) - Main brand color
- **Accent:** Purple (#A855F7) - Highlights and CTAs
- **Success:** Green - Positive actions
- **Destructive:** Red - Warnings and errors
- **Muted:** Gray tones - Secondary UI elements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

## 🐛 Known Issues & Limitations

- **Lovable AI Migration:** When self-hosting, you'll need to replace Lovable AI with your own AI solution (OpenAI, Gemini, etc.)
- **Edge Function Secrets:** Configure secrets in Supabase for production
- **Email Templates:** Customize Supabase email templates for your domain

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev)
- Chess engine: [chess.js](https://github.com/jhlywa/chess.js)
- Chessboard: [react-chessboard](https://github.com/Clariity/react-chessboard)
- UI components: [shadcn/ui](https://ui.shadcn.com)
- Backend: [Supabase](https://supabase.com)
- Icons: [Lucide Icons](https://lucide.dev)

## 📧 Support & Community

- **Website:** [chessafari.com](https://chessafari.com)
- **Discord:** Join our community server
- **Email:** support@chessafari.com
- **GitHub Issues:** Report bugs and request features

---

**Made with ♟️ and ❤️ by the Chessafari team**

*Start your chess safari today!*
