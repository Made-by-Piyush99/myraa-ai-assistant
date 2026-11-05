#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# MYRAA Mobile Voice Edition — 1-Tap Termux Launcher
# ==============================================================================

echo "=================================================="
echo "      🌸 Starting MYRAA Mobile Voice Edition 🌸   "
echo "=================================================="
echo ""

# Ensure we are in the script's directory
cd "$(dirname "$0")"

# Auto-update to latest version from GitHub
if command -v git &> /dev/null; then
    echo "[*] Checking for latest MYRAA updates from GitHub..."
    git fetch origin main --quiet 2>/dev/null || true
    git reset --hard origin/main --quiet 2>/dev/null || git pull origin main --quiet 2>/dev/null || true
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "[!] Node.js not detected. Installing Node.js..."
    pkg update -y && pkg install nodejs -y
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[*] Installing lightweight dependencies (one-time setup)..."
    npm install --omit=dev
fi

echo ""
echo "[*] Starting Myraa Voice Server..."
echo "--------------------------------------------------"
echo " Open your Android Chrome browser and visit:"
echo " 👉 http://localhost:3000"
echo "--------------------------------------------------"
echo " Press Ctrl + C to stop."
echo ""

node server.js
