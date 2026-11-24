#!/bin/bash
# EduQuiz Launch Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🎓 Starting EduQuiz Online Quiz Platform..."
echo "=========================================================="

# Check Python 3
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v /usr/bin/python3 >/dev/null 2>&1; then
    PYTHON_CMD="/usr/bin/python3"
else
    echo "❌ Error: python3 is not installed."
    exit 1
fi

echo "Using Python: $($PYTHON_CMD --version)"
echo "Starting backend server on port 8080..."
echo "Open your browser at: http://localhost:8080"
echo "Press Ctrl+C to stop the server."
echo "=========================================================="

exec $PYTHON_CMD server.py
