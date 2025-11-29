# TaalAI - Quick Start (5 Minutes)

Get TaalAI running on your machine in 5 minutes!

## ⚡ Prerequisites

Before starting, make sure you have:
- ✅ Node.js v18+ installed
- ✅ Python 3.11+ installed
- ✅ A Google account (for Gemini API)
- ✅ A Supabase account (free tier is fine)

## 🚀 5-Minute Setup

### Step 1: Get API Keys (2 minutes)

#### Gemini API Key
1. Visit https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key → Save it somewhere

#### Supabase Setup
1. Visit https://supabase.com/
2. Sign in with GitHub/Google
3. Click "New Project"
4. Fill in:
   - Name: `TaalAI`
   - Database Password: (create one)
   - Region: (choose closest)
5. Wait ~2 minutes for setup
6. Go to Settings → API
7. Copy:
   - Project URL
   - anon public key

### Step 2: Setup Database (1 minute)

1. In Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Open `fintech/shared/supabase-schema.sql` in text editor
4. Copy everything → Paste in Supabase
5. Click "Run"

### Step 3: Configure Environment (30 seconds)

```bash
cd fintech

# Create environment files
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```bash
GEMINI_API_KEY=paste-your-gemini-key-here
SECRET_KEY=any-random-long-string-here
```

Edit `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=paste-your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-your-supabase-anon-key
```

### Step 4: Install & Run (1.5 minutes)

**Terminal 1 - Backend:**
```bash
cd fintech/backend
python -m venv venv

# Activate venv:
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd fintech/frontend
npm install
npm run dev
```

### Step 5: Open & Test! 🎉

1. Open http://localhost:3000
2. You should see the TaalAI landing page
3. Click "Get Started" to try onboarding
4. Test the dashboard, chat, and simulator

## 🎯 What You Get

✅ **Landing Page** - Beautiful intro page
✅ **Onboarding** - Multi-step setup flow
✅ **Dashboard** - Financial pulse & income visualization
✅ **AI Chat** - Talk to TaalAI coach
✅ **What-If Simulator** - Test purchase decisions
✅ **Tax Insights** - Quarterly estimates
✅ **WhatsApp Bot** - (Optional, needs Twilio setup)

## 🐛 Quick Troubleshooting

**Backend not starting?**
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

**Frontend errors?**
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Can't connect to API?**
- Make sure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL=http://localhost:8000` in frontend/.env.local
- Try accessing http://localhost:8000/docs directly

**Database errors?**
- Verify Supabase schema was run successfully
- Check Supabase project URL is correct
- Make sure anon key is pasted correctly

## 📚 Next Steps

1. **Explore the Code**
   - Backend agents in `backend/app/agents/`
   - Frontend pages in `frontend/app/`
   - UI components in `frontend/components/`

2. **Customize**
   - Change colors in `frontend/tailwind.config.ts`
   - Modify AI prompts in `backend/app/agents/coach_agent.py`
   - Add new features!

3. **Deploy**
   - Frontend → Vercel (free)
   - Backend → Render/Railway (free tier)
   - Database → Already on Supabase!

4. **Read Full Docs**
   - [README.md](README.md) - Full project overview
   - [SETUP.md](SETUP.md) - Detailed setup guide

## 🆘 Need Help?

- 📖 Read [SETUP.md](SETUP.md) for detailed instructions
- 🐛 Check GitHub issues
- 💬 Ask in discussions

## ✨ Pro Tips

**Want faster development?**
- Use Docker: `docker-compose up -d`
- VS Code extensions: Python, ESLint, Tailwind CSS IntelliSense
- Enable hot reload for both frontend & backend

**Testing features:**
- Use mock data (already built in)
- Test with different scenarios
- Try all agent interactions

**Performance:**
- Backend usually starts in ~5 seconds
- Frontend first build takes ~30 seconds
- Subsequent reloads are instant

---

**That's it! You now have TaalAI running locally.** 🎉

Start building amazing financial experiences for users with irregular incomes!
