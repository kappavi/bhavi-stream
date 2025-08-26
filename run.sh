#!/bin/bash

# P&ID Schematic Editor - Start Script
echo "🚀 Starting P&ID Schematic Editor..."

# Start backend
echo "Starting Flask backend..."
cd backend
python3 -m venv venv 2>/dev/null || echo "Virtual environment already exists"
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
python app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Start frontend
echo "Starting React frontend..."
cd frontend
npm install > /dev/null 2>&1
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ Services started!"
echo "🔧 Backend: http://localhost:6969"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
