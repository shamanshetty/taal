# TaalAI - Complete Setup Guide

This guide will walk you through setting up TaalAI from scratch on your local machine.

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Initial Setup](#initial-setup)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Setup](#database-setup)
6. [API Keys Setup](#api-keys-setup)
7. [Running the Application](#running-the-application)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 12+, or Linux (Ubuntu 20.04+)
- **RAM**: 8GB minimum (16GB recommended)
- **Disk Space**: 2GB free space
- **Internet**: Stable connection required

### Software Prerequisites
- **Node.js**: v18.17.0 or higher
- **Python**: 3.11 or higher
- **Git**: Latest version
- **Code Editor**: VS Code (recommended)

### Optional
- **Docker Desktop**: For containerized setup
- **PostgreSQL**: If not using Supabase

---

## Initial Setup

### 1. Check Prerequisites

```bash
# Check Node.js version
node --version
# Should output: v18.x.x or higher

# Check Python version
python --version
# Should output: Python 3.11.x or higher

# Check Git
git --version
```

### 2. Clone the Repository

```bash
# Navigate to your projects folder
cd ~/projects

# If using GitHub (replace with your repo URL)
git clone https://github.com/shamanshetty/taalai.git
cd taalai/fintech
```

---

## Backend Setup

### Step 1: Create Virtual Environment

**Windows:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

**macOS/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

### Step 2: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This will install:
- FastAPI
- Uvicorn
- SQLAlchemy
- Google Generative AI (Gemini)
- scikit-learn
- Twilio
- and more...

### Step 3: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env file
# Windows: notepad .env
# macOS: open .env
# Linux: nano .env
```

Add your credentials (we'll get these in the API Keys section):
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/taalai
GEMINI_API_KEY=your-gemini-key-here
SECRET_KEY=your-secret-key-here
```

### Step 4: Test Backend

```bash
# Make sure you're in backend/ directory
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000 in your browser. You should see:
```json
{
  "message": "TaalAI API",
  "version": "1.0.0",
  "status": "running"
}
```

Open http://localhost:8000/docs to see the interactive API documentation.

Press `Ctrl+C` to stop the server.

---

## Frontend Setup

### Step 1: Install Dependencies

```bash
# Open a NEW terminal (keep backend running if you want)
cd fintech/frontend

# Install packages
npm install
```

This will install:
- Next.js 14
- React 18
- TailwindCSS
- Framer Motion
- Recharts
- Supabase client
- and more...

### Step 2: Configure Environment Variables

```bash
# Copy example env file
cp .env.local.example .env.local

# Edit .env.local
# Windows: notepad .env.local
# macOS: open .env.local
# Linux: nano .env.local
```

Add:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 3: Test Frontend

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the TaalAI landing page.

Press `Ctrl+C` to stop the server.

---

## Database Setup

### Option 1: Supabase (Recommended)

#### Step 1: Create Supabase Account
1. Go to [supabase.com](https://supabase.com/)
2. Sign up with GitHub/Google
3. Click "New Project"

#### Step 2: Configure Project
- **Name**: TaalAI
- **Database Password**: Create a strong password (save this!)
- **Region**: Choose closest to you
- **Plan**: Free tier is fine for MVP

Wait 2-3 minutes for project to be ready.

#### Step 3: Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy entire contents of `fintech/shared/supabase-schema.sql`
4. Paste and click "Run"
5. You should see "Success. No rows returned"

#### Step 4: Get API Credentials
1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL** → Use as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use as `SUPABASE_SERVICE_KEY`

#### Step 5: Update Environment Files

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Backend (.env):**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
```

---

## API Keys Setup

### 1. Google Gemini API Key

#### Get the Key:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key

#### Add to Backend:
Edit `backend/.env`:
```bash
GEMINI_API_KEY=AIzaSyC...your-key-here
```

### 2. Generate Secret Key

```bash
# In terminal (any OS)
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copy the output and add to `backend/.env`:
```bash
SECRET_KEY=your-generated-secret-key-here
```

### 3. Twilio (Optional - for WhatsApp features)

#### Get Credentials:
1. Sign up at [twilio.com](https://www.twilio.com/try-twilio)
2. Go to Console Dashboard
3. Copy **Account SID** and **Auth Token**
4. Go to **Messaging** > **Try it out** > **Send a WhatsApp message**
5. Follow instructions to join sandbox

#### Add to Backend:
Edit `backend/.env`:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## Running the Application

### Method 1: Manual (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd fintech/backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd fintech/frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Method 2: Docker (All-in-One)

```bash
cd fintech

# Create .env file
cp .env.example .env
# Edit .env with your API keys

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Troubleshooting

### Backend Issues

**Error: ModuleNotFoundError**
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate      # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Error: Port 8000 already in use**
```bash
# Find process using port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8000 | xargs kill -9

# Or use different port:
uvicorn app.main:app --reload --port 8001
```

**Error: Database connection failed**
- Check `DATABASE_URL` in `.env`
- Verify Supabase project is running
- Check internet connection

### Frontend Issues

**Error: Cannot find module**
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error: Port 3000 already in use**
```bash
# Use different port
PORT=3001 npm run dev
```

**Error: API calls failing**
- Check backend is running on port 8000
- Verify `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local`
- Check browser console for CORS errors

### Database Issues

**Error: Permission denied**
- Make sure Row Level Security (RLS) policies are set up
- Check if user is authenticated
- Verify `supabase-schema.sql` was run completely

**Error: Table does not exist**
- Re-run the schema SQL in Supabase SQL Editor
- Check for any errors in the SQL execution

---

## Next Steps

Once everything is running:

1. **Test the Application:**
   - Visit http://localhost:3000
   - Go through onboarding flow
   - Test dashboard features
   - Try the chat interface
   - Use the What-If simulator

2. **Add Sample Data:**
   - Create test transactions
   - Set up financial goals
   - Try different scenarios

3. **Customize:**
   - Update branding
   - Modify color schemes
   - Add custom features

4. **Deploy:**
   - See deployment guides for Vercel and Render

---

## Support

If you encounter issues:
1. Check this guide again
2. Review error messages carefully
3. Search GitHub issues
4. Create new issue with details

Happy coding! 🚀
