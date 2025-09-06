#!/bin/bash

echo "🧪 Testing P&ID Application Build..."

# Test backend
echo "Testing backend..."
cd backend
source venv/bin/activate 2>/dev/null || echo "Virtual environment not found, creating..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi
python -c "from app import app; print('✅ Backend imports successfully')" || echo "❌ Backend import failed"
cd ..

# Test frontend
echo "Testing frontend..."
cd frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend builds successfully"
else
    echo "❌ Frontend build failed"
    echo "Running with verbose output:"
    npm run build
fi
cd ..

echo "🎉 Test complete!"
