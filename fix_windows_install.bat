@echo off
REM TaalAI Windows Installation Fix Script
REM This script helps fix common Windows installation issues

echo.
echo ========================================
echo   TaalAI Windows Installation Fixer
echo ========================================
echo.

cd "%~dp0backend"

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11 or 3.12 from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo.
echo Python found!
echo.

REM Check if venv exists
if exist venv (
    echo Virtual environment found. Removing old venv...
    rmdir /s /q venv
)

echo Creating fresh virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing dependencies in stages...
echo.

echo [1/5] Installing core framework...
pip install fastapi==0.115.6 uvicorn[standard]==0.34.0 python-dotenv==1.0.1
if errorlevel 1 goto :error

echo [2/5] Installing validation libraries...
pip install pydantic==2.10.5 pydantic-settings==2.7.1 typing-extensions
if errorlevel 1 goto :error

echo [3/5] Installing HTTP and file handling...
pip install httpx==0.28.1 python-multipart==0.0.20
if errorlevel 1 goto :error

echo [4/5] Installing AI libraries...
pip install google-generativeai==0.8.3
if errorlevel 1 goto :error

echo [5/5] Installing ML and additional libraries...
pip install numpy scikit-learn pandas twilio gtts
if errorlevel 1 (
    echo WARNING: Some ML packages failed. Trying alternative versions...
    pip install "numpy<2.0.0"
    pip install "scikit-learn==1.5.2"
    pip install pandas
)

echo.
echo Installing authentication libraries (optional)...
pip install python-jose passlib
if errorlevel 1 (
    echo Note: Some auth packages may have failed - optional for MVP
)

echo.
echo ========================================
echo   Installation Summary
echo ========================================
echo.

pip list | findstr /i "fastapi uvicorn pydantic google-generativeai numpy scikit-learn"

echo.
echo ========================================

if not exist .env (
    echo.
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit backend\.env and add your GEMINI_API_KEY
    echo.
)

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Edit backend\.env and add your GEMINI_API_KEY
echo 2. Run: venv\Scripts\activate.bat
echo 3. Run: uvicorn app.main:app --reload
echo 4. Open http://localhost:8000 in your browser
echo.
echo For frontend setup, see WINDOWS_SETUP.md
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo   Installation Failed!
echo ========================================
echo.
echo Possible solutions:
echo 1. Try Python 3.12 instead of 3.14
echo 2. Install Visual Studio Build Tools (for C++ compilation)
echo 3. Install packages individually as shown in WINDOWS_SETUP.md
echo 4. Use Docker instead (see docker-compose.yml)
echo.
echo For detailed help, see WINDOWS_SETUP.md
echo.
pause
exit /b 1
