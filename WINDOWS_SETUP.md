# TaalAI - Windows Setup Guide

Complete setup instructions specifically for Windows users.

## 🪟 Prerequisites

### Required Software

1. **Python 3.11 or 3.12** (Recommended)
   - Download: https://www.python.org/downloads/
   - ⚠️ **Important:** Check "Add Python to PATH" during installation
   - ⚠️ Python 3.14 may have compatibility issues with some packages

2. **Node.js v18+**
   - Download: https://nodejs.org/ (LTS version)
   - Includes npm automatically

3. **Git for Windows**
   - Download: https://git-scm.com/download/win
   - Includes Git Bash terminal

### Optional but Recommended

- **Visual Studio Code**: https://code.visualstudio.com/
- **Windows Terminal**: https://aka.ms/terminal (Better terminal experience)

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Verify Installations

Open **Command Prompt** (Win+R → type `cmd` → Enter):

```cmd
python --version
node --version
git --version
```

All should show version numbers. If not, reinstall with PATH enabled.

### Step 2: Navigate to Project

```cmd
cd "c:\Users\shama\OneDrive\Documents\New folder\fintech"
```

### Step 3: Backend Setup

```cmd
cd backend

REM Create virtual environment
python -m venv venv

REM Activate it
venv\Scripts\activate.bat

REM You should see (venv) in your prompt

REM Upgrade pip
python -m pip install --upgrade pip

REM Install dependencies
pip install -r requirements.txt
```

**If you get errors**, try installing packages individually:

```cmd
REM Install core packages first
pip install fastapi uvicorn[standard] python-dotenv pydantic pydantic-settings

REM Install HTTP client
pip install httpx python-multipart

REM Install AI package
pip install google-generativeai

REM Install ML packages (these might take longer)
pip install numpy scikit-learn pandas

REM Install remaining packages
pip install twilio gtts python-jose[cryptography] passlib[bcrypt]
```

### Step 4: Configure Backend Environment

```cmd
REM Still in backend folder
copy .env.example .env
notepad .env
```

Add your API keys:
```
GEMINI_API_KEY=your-gemini-key-here
SECRET_KEY=any-random-long-string-here
ALLOWED_ORIGINS=http://localhost:3000
```

Save and close Notepad.

### Step 5: Test Backend

```cmd
REM Make sure venv is activated (you see (venv) in prompt)
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Open http://localhost:8000 in browser - you should see:
```json
{
  "message": "TaalAI API",
  "version": "1.0.0",
  "status": "running"
}
```

Press `Ctrl+C` to stop.

### Step 6: Frontend Setup

Open a **NEW Command Prompt** window (keep backend terminal open):

```cmd
cd "c:\Users\shama\OneDrive\Documents\New folder\fintech\frontend"

REM Install dependencies (this takes 2-3 minutes)
npm install

REM Configure environment
copy .env.local.example .env.local
notepad .env.local
```

Add:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Save and close.

```cmd
REM Start frontend
npm run dev
```

You should see:
```
  ▲ Next.js 14.2.15
  - Local:        http://localhost:3000
  - Ready in 3.2s
```

Open http://localhost:3000 in browser!

---

## 🐛 Common Windows Issues & Fixes

### Issue 1: "python not recognized"

**Fix:**
1. Reinstall Python from https://www.python.org/
2. **Check "Add Python to PATH"** during installation
3. Restart Command Prompt

### Issue 2: Virtual environment won't activate

**Different activation commands for different terminals:**

**Command Prompt (CMD):**
```cmd
venv\Scripts\activate.bat
```

**PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**If PowerShell gives execution policy error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Git Bash:**
```bash
source venv/Scripts/activate
```

### Issue 3: "pip install" fails with compiler errors

**If scikit-learn fails:**
```cmd
REM Install pre-built wheel
pip install scikit-learn==1.5.2
```

**If numpy fails:**
```cmd
pip install numpy==1.26.4
```

**If python-jose[cryptography] fails:**
```cmd
REM Install without cryptography first
pip install python-jose
pip install cryptography
```

### Issue 4: Port already in use

**Kill process on port 8000:**
```cmd
netstat -ano | findstr :8000
taskkill /PID <PID_NUMBER> /F
```

**Or use different port:**
```cmd
uvicorn app.main:app --reload --port 8001
```

Then update frontend `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Issue 5: npm install fails

**Clear cache and retry:**
```cmd
npm cache clean --force
rmdir /s node_modules
del package-lock.json
npm install
```

### Issue 6: Path with spaces causes issues

**Use quotes around paths:**
```cmd
cd "c:\Users\shama\OneDrive\Documents\New folder\fintech\backend"
```

---

## 🔧 Development Workflow

### Starting Development Session

**Terminal 1 - Backend:**
```cmd
cd "c:\Users\shama\OneDrive\Documents\New folder\fintech\backend"
venv\Scripts\activate.bat
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```cmd
cd "c:\Users\shama\OneDrive\Documents\New folder\fintech\frontend"
npm run dev
```

### Stopping Everything

- Press `Ctrl+C` in each terminal
- Or close the terminal windows

---

## 📦 Alternative: Using Docker on Windows

If you have Docker Desktop for Windows:

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/

2. Create `.env` file:
```cmd
cd "c:\Users\shama\OneDrive\Documents\New folder\fintech"
copy .env.example .env
notepad .env
```

3. Add your API keys, then:
```cmd
docker-compose up -d
```

4. Access:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000

5. Stop:
```cmd
docker-compose down
```

---

## 🎯 Troubleshooting Checklist

If something doesn't work:

- [ ] Python is installed and in PATH
- [ ] Node.js is installed and in PATH
- [ ] Virtual environment is activated (see `(venv)` in prompt)
- [ ] All dependencies installed without errors
- [ ] `.env` files are configured with API keys
- [ ] No other services using ports 3000 or 8000
- [ ] Using correct terminal commands for your shell type
- [ ] Firewall allows local connections
- [ ] Antivirus not blocking Python/Node

---

## 💡 Pro Tips for Windows

### Use Windows Terminal

Much better than CMD:
- Install from Microsoft Store: "Windows Terminal"
- Supports tabs, better copy/paste, themes
- Use `Ctrl+Shift+T` for new tab

### Use VS Code Integrated Terminal

1. Open project in VS Code
2. Press `` Ctrl+` `` to open terminal
3. Select shell type (PowerShell, CMD, Git Bash)
4. Run commands directly in editor

### Create Batch Scripts

**start_backend.bat:**
```batch
@echo off
cd "%~dp0backend"
call venv\Scripts\activate.bat
uvicorn app.main:app --reload
pause
```

**start_frontend.bat:**
```batch
@echo off
cd "%~dp0frontend"
npm run dev
pause
```

Double-click to start!

---

## 📚 Next Steps

Once everything is running:

1. Visit http://localhost:3000
2. Try the onboarding flow
3. Test the dashboard
4. Chat with TaalAI
5. Use the What-If simulator

For detailed guides, see:
- `README.md` - Project overview
- `SETUP.md` - General setup guide
- `QUICKSTART.md` - Quick start guide

---

## 🆘 Still Having Issues?

1. Check Python version: `python --version` (should be 3.11 or 3.12)
2. Try Python 3.12 if on 3.14: https://www.python.org/downloads/release/python-3120/
3. Delete `venv` folder and recreate:
   ```cmd
   rmdir /s venv
   python -m venv venv
   venv\Scripts\activate.bat
   pip install -r requirements.txt
   ```

4. Check GitHub issues or create a new one with:
   - Python version
   - Error message
   - Terminal type (CMD/PowerShell/Git Bash)

---

**Windows setup complete!** 🎉 Happy coding!
