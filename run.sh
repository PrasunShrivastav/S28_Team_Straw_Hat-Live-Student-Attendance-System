#!/bin/bash

# Kill all background processes spawned by this script on exit
trap 'kill 0' SIGINT SIGTERM

echo "========================================"
echo "Starting Backend Server (Flask)..."
echo "========================================"
cd backend
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
else
    echo "Warning: .venv/bin/activate not found. Trying to run python directly."
fi
python app.py &
BACKEND_PID=$!
cd ..

echo "========================================"
echo "Starting Frontend Server (Vite/React)..."
echo "========================================"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🚀 Both servers are running!"
echo "   Backend is running on http://localhost:5000"
echo "   Frontend will print its port above (usually http://localhost:5173)"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for background processes to keep the script running
wait $BACKEND_PID $FRONTEND_PID
