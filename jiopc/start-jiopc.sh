#!/bin/bash
# MYRAA Jio PC & Jio TV Set-Top Box Edition Launcher
# Works on Linux, JioPC, Android TV, and Termux

echo "========================================================"
echo "  🌸 Starting MYRAA Jio PC & Jio TV Edition"
echo "========================================================"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

if ! command -v node &> /dev/null; then
    echo "[!] Node.js not detected."
    echo "Installing nodejs..."
    if command -v pkg &> /dev/null; then
        pkg update -y && pkg install -y nodejs
    elif command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y nodejs npm
    fi
fi

if [ ! -d "node_modules" ]; then
    echo "[*] Installing dependencies..."
    npm install
fi

echo ""
echo "[*] Starting Jio TV server on port 3005..."
echo "Open in JioPages on your TV: http://<this-device-ip>:3005"
echo ""

node server.js
