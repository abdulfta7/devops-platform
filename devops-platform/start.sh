#!/bin/bash
echo "🚀 Starting DevOps Academy Platform..."
echo ""
echo "Starting Backend on port 5000..."
cd backend && node index.js &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""
echo "Starting Frontend on port 3000..."
cd frontend && npm start &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""
echo "=========================================="
echo "  🌐 Open: http://localhost:3000"
echo "  🔧 API:  http://localhost:5000/api"
echo "  👤 Admin: admin@devops.com / admin123"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all servers"
wait
