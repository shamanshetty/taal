# TaalAI - AI-Powered Financial Coach for Indians

![TaalAI Banner](https://via.placeholder.com/1200x300/f97316/ffffff?text=TaalAI+-+Your+Financial+Coach)

TaalAI is an agentic AI-powered financial coach designed specifically for Indians with irregular incomes — freelancers, gig workers, and influencers. It helps users understand their income rhythm, receive personalized financial advice, and make smarter financial decisions.

## 🌟 Features

### 🎯 Core Features (MVP)

1. **Income Rhythm Engine (TaalSense)**
   - Tracks and learns income volatility trends
   - Builds a dynamic "financial pulse score" (0-100)
   - Suggests adaptive saving goals using AI reasoning

2. **"What If I Buy This?" Simulator**
   - Estimates impact on savings trajectory
   - Shows how purchases delay financial goals
   - Provides visual graph comparisons

3. **VoiceMint – Conversational Coach**
   - AI-powered chat in Hinglish or preferred language
   - Voice input/output support
   - 30-second advice clips and daily nudges

4. **WhatsApp Micro Coach**
   - Personalized savings nudges
   - Tax reminders and spending insights
   - Interactive prompts via WhatsApp

5. **TaxMate**
   - Auto-classifies income and expenses
   - Generates quarterly tax insights
   - TDS, GST, and advance tax guidance

## 🏗️ Architecture

```
fintech/
├── frontend/           # Next.js 14 + TailwindCSS
│   ├── app/           # App Router pages
│   ├── components/    # Reusable UI components
│   ├── lib/           # Utilities and helpers
│   ├── store/         # Zustand state management
│   └── types/         # TypeScript type definitions
├── backend/           # FastAPI Python
│   ├── app/
│   │   ├── agents/    # AI agents (TaalCore, Coach, Predictor, Tax)
│   │   ├── routes/    # API endpoints
│   │   ├── models/    # Data schemas
│   │   └── services/  # Business logic
│   └── requirements.txt
├── shared/            # Shared resources
│   └── supabase-schema.sql
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **Python** 3.11 or 3.12 ([Download](https://www.python.org/)) - **Note:** Python 3.14 may have compatibility issues
- **Docker** (optional, for containerized setup)
- **Supabase** account ([Sign up](https://supabase.com/))
- **Google AI Studio** API key for Gemini ([Get key](https://makersuite.google.com/app/apikey))

> **Windows Users:** See [WINDOWS_SETUP.md](WINDOWS_SETUP.md) for detailed Windows-specific instructions!

### Option 1: Docker Setup (Recommended)

1. **Clone and setup**
   ```bash
   cd fintech
   cp .env.example .env
   ```

2. **Edit `.env` file** with your API keys:
   ```bash
   GEMINI_API_KEY=your-gemini-api-key
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Local Development Setup

#### Backend Setup

1. **Create virtual environment**
   ```bash
   cd fintech/backend
   python -m venv venv

   # Windows
   venv\Scripts\activate

   # macOS/Linux
   source venv/bin/activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Run the backend**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### Frontend Setup

1. **Install dependencies**
   ```bash
   cd fintech/frontend
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Run the frontend**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs

## 📊 Database Setup (Supabase)

1. **Create a new project** on [Supabase](https://supabase.com/)

2. **Run the schema**
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents from `shared/supabase-schema.sql`
   - Run the query

3. **Get your credentials**
   - Go to Settings > API
   - Copy your project URL and anon key
   - Add them to your `.env` file

## 🤖 AI Agents

### TaalCore Agent
- **Purpose**: Central orchestrator for financial intelligence
- **Features**:
  - Income rhythm analysis
  - Financial pulse scoring (0-100)
  - Adaptive savings suggestions
- **Tech**: NumPy, scikit-learn

### Coach Agent
- **Purpose**: Conversational financial advisor
- **Features**:
  - Personalized advice in Hinglish
  - Daily nudges
  - Spending pattern analysis
- **Tech**: Google Gemini 1.5 Flash

### Predictor Agent
- **Purpose**: "What if" scenario simulation
- **Features**:
  - Purchase impact forecasting
  - Income prediction
  - Savings trajectory modeling
- **Tech**: Lightweight ML (scikit-learn)

### Tax Agent
- **Purpose**: Tax insights and compliance
- **Features**:
  - TDS/GST/advance tax calculation
  - Quarterly estimates
  - Tax-saving suggestions
- **Tech**: Rule-based + LLM hybrid

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, Framer Motion |
| **Backend** | FastAPI (Python), SQLAlchemy |
| **Database** | PostgreSQL (via Supabase) |
| **AI/ML** | Google Gemini 1.5 Flash, scikit-learn |
| **State** | Zustand |
| **Charts** | Recharts |
| **Auth** | Supabase Auth |
| **Messaging** | Twilio (WhatsApp) |
| **Hosting** | Vercel (frontend), Render/Railway (backend) |

## 🔐 Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SECRET_KEY=your-secret-key

# Optional (for WhatsApp features)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## 📱 WhatsApp Bot Setup

1. **Create Twilio account** at [twilio.com](https://www.twilio.com/)

2. **Join WhatsApp Sandbox**
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Follow instructions to connect

3. **Configure webhook**
   - Set webhook URL to: `https://your-backend-url/api/whatsapp/webhook`
   - Method: POST

4. **Add credentials to `.env`**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=your-token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

## 🎯 User Flow

1. **Sign up** → Email/Google OAuth
2. **Onboarding** → Add income sources, expenses, goals
3. **Dashboard** → View financial pulse, income rhythm, goals
4. **Chat with TaalAI** → Get advice, ask questions
5. **What-If Simulator** → Test purchase decisions
6. **WhatsApp Nudges** → Receive daily tips (optional)

## 🔧 Development

### Run tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Build for production
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm run build
npm start
```

## 📦 Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set environment variables
3. Deploy automatically on push

### Backend (Render/Railway)
1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Gemini API** by Google for AI capabilities
- **Supabase** for database and auth
- **Twilio** for WhatsApp integration
- Indian freelance community for inspiration

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/taalai/issues)
- Email: support@taalai.app

---

**Built with ❤️ for the Indian freelance community**
