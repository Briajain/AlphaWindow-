#!/bin/bash
cd "/home/piyansh46/Code/x-analyzer"

echo "Booting AlphaWindow Local Server..."

# Ensure the port is free to prevent conflicts
fuser -k 3000/tcp 2>/dev/null || true

# Start the server and record its Process ID
npm run dev &
SERVER_PID=$!

# Wait for Vite to compile and start serving
sleep 4

echo "Launching AlphaWindow Interface..."

# Try to open in App Mode (looks like a native desktop app)
if command -v google-chrome &> /dev/null; then
  google-chrome --app="http://localhost:3000" --class="alphawindow"
elif command -v chromium &> /dev/null; then
  chromium --app="http://localhost:3000" --class="alphawindow"
elif command -v chromium-browser &> /dev/null; then
  chromium-browser --app="http://localhost:3000" --class="alphawindow"
else
  echo "Chrome not found, falling back to default browser..."
  xdg-open "http://localhost:3000"
  wait $SERVER_PID
fi

# Once the App window is closed by the user, terminate the background server gracefully
echo "Window closed. Shutting down server..."
kill $SERVER_PID 2>/dev/null
