#!/usr/bin/env python3
"""
Online Quiz Platform - Backend Server
Powered by Python standard library (http.server + sqlite3)
"""

import http.server
import socketserver
import json
import sqlite3
import os
import sys
import hashlib
import uuid
import mimetypes
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
STATIC_DIR = os.path.join(BASE_DIR, "static")
DB_PATH = os.path.join(DATA_DIR, "database.sqlite")
QUIZZES_FILE = os.path.join(DATA_DIR, "quizzes.json")

# Ensure directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# ----------------- Database Setup -----------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        student_id TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        quiz_id TEXT NOT NULL,
        quiz_title TEXT NOT NULL,
        score REAL NOT NULL,
        max_score REAL NOT NULL,
        percentage REAL NOT NULL,
        passed INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        correct_count INTEGER NOT NULL,
        incorrect_count INTEGER NOT NULL,
        unattempted_count INTEGER NOT NULL,
        time_taken_seconds INTEGER NOT NULL,
        details_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

# ----------------- Quiz Data Helper -----------------
def load_quizzes():
    if not os.path.exists(QUIZZES_FILE):
        return []
    with open(QUIZZES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

# ----------------- HTTP Request Handler -----------------
class QuizRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length == 0:
                return {}
            raw_data = self.rfile.read(content_length)
            return json.loads(raw_data.decode("utf-8"))
        except Exception as e:
            print("Error reading JSON body:", e)
            return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path.startswith("/api/"):
            self.handle_api_get(path, query)
        else:
            # Static file serving
            if path == "/" or path == "":
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/"):
            self.handle_api_post(path)
        else:
            self.send_json({"error": "Not Found"}, status=404)

    # ----------------- API Handlers -----------------
    def handle_api_get(self, path, query):
        if path == "/api/quizzes":
            quizzes = load_quizzes()
            # Sanitize to not expose correct answers or explanations in the list
            safe_quizzes = []
            for q in quizzes:
                total_marks = sum(item.get("points", 1) for item in q.get("questions", []))
                safe_quizzes.append({
                    "id": q["id"],
                    "title": q["title"],
                    "description": q["description"],
                    "category": q.get("category", "General"),
                    "durationMinutes": q.get("durationMinutes", 10),
                    "passingPercentage": q.get("passingPercentage", 60),
                    "totalQuestions": len(q.get("questions", [])),
                    "totalMarks": total_marks,
                    "icon": q.get("icon", "book")
                })
            self.send_json({"success": True, "quizzes": safe_quizzes})

        elif path == "/api/quiz":
            quiz_id = query.get("id", [None])[0]
            if not quiz_id:
                self.send_json({"error": "Missing quiz id"}, status=400)
                return
            quizzes = load_quizzes()
            target = next((q for q in quizzes if q["id"] == quiz_id), None)
            if not target:
                self.send_json({"error": "Quiz not found"}, status=404)
                return

            # Strip correctOption & explanation so client cannot inspect frontend JS to cheat!
            safe_questions = []
            for item in target.get("questions", []):
                safe_questions.append({
                    "id": item["id"],
                    "question": item["question"],
                    "options": item["options"],
                    "points": item.get("points", 1),
                    "difficulty": item.get("difficulty", "Medium")
                })

            total_marks = sum(item.get("points", 1) for item in target.get("questions", []))
            self.send_json({
                "success": True,
                "quiz": {
                    "id": target["id"],
                    "title": target["title"],
                    "description": target["description"],
                    "category": target.get("category", "General"),
                    "durationMinutes": target.get("durationMinutes", 10),
                    "passingPercentage": target.get("passingPercentage", 60),
                    "totalQuestions": len(safe_questions),
                    "totalMarks": total_marks,
                    "questions": safe_questions
                }
            })

        elif path == "/api/history":
            student_id = query.get("student_id", [None])[0]
            if not student_id:
                self.send_json({"error": "Missing student_id"}, status=400)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, quiz_id, quiz_title, score, max_score, percentage, passed,
                       total_questions, correct_count, incorrect_count, unattempted_count,
                       time_taken_seconds, created_at
                FROM attempts
                WHERE student_id = ?
                ORDER BY created_at DESC
            """, (student_id,))
            rows = cursor.fetchall()
            history = [dict(row) for row in rows]
            conn.close()
            self.send_json({"success": True, "history": history})

        elif path == "/api/result":
            attempt_id = query.get("id", [None])[0]
            if not attempt_id:
                self.send_json({"error": "Missing attempt id"}, status=400)
                return
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM attempts WHERE id = ?", (attempt_id,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                self.send_json({"error": "Result not found"}, status=404)
                return
            data = dict(row)
            data["details"] = json.loads(data["details_json"])
            del data["details_json"]
            self.send_json({"success": True, "result": data})

        elif path == "/api/leaderboard":
            quiz_id = query.get("quiz_id", [None])[0]
            conn = get_db()
            cursor = conn.cursor()
            if quiz_id:
                cursor.execute("""
                    SELECT student_name, quiz_title, score, max_score, percentage, time_taken_seconds, created_at
                    FROM attempts
                    WHERE quiz_id = ?
                    ORDER BY score DESC, time_taken_seconds ASC
                    LIMIT 10
                """, (quiz_id,))
            else:
                cursor.execute("""
                    SELECT student_name, quiz_title, score, max_score, percentage, time_taken_seconds, created_at
                    FROM attempts
                    ORDER BY percentage DESC, time_taken_seconds ASC
                    LIMIT 10
                """)
            rows = cursor.fetchall()
            leaderboard = [dict(r) for r in rows]
            conn.close()
            self.send_json({"success": True, "leaderboard": leaderboard})

        else:
            self.send_json({"error": "API route not found"}, status=404)

    def handle_api_post(self, path):
        body = self.read_json_body()

        if path == "/api/register":
            name = (body.get("name") or "").strip()
            email = (body.get("email") or "").strip().lower()
            student_id = (body.get("student_id") or "").strip()
            password = body.get("password", "")

            if not name or not email or not password or not student_id:
                self.send_json({"error": "All fields (Name, Email, Student ID, Password) are required."}, status=400)
                return

            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM students WHERE email = ? OR student_id = ?", (email, student_id))
            if cursor.fetchone():
                conn.close()
                self.send_json({"error": "A student with this Email or Student ID already exists."}, status=409)
                return

            new_id = str(uuid.uuid4())
            pwd_hash = hash_password(password)
            now = datetime.utcnow().isoformat()

            cursor.execute("""
                INSERT INTO students (id, name, email, student_id, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (new_id, name, email, student_id, pwd_hash, now))
            conn.commit()
            conn.close()

            user_data = {
                "id": new_id,
                "name": name,
                "email": email,
                "student_id": student_id
            }
            self.send_json({"success": True, "message": "Registration successful!", "user": user_data})

        elif path == "/api/login":
            email_or_id = (body.get("identifier") or "").strip().lower()
            password = body.get("password", "")

            if not email_or_id or not password:
                self.send_json({"error": "Please provide your Email/Student ID and Password."}, status=400)
                return

            conn = get_db()
            cursor = conn.cursor()
            pwd_hash = hash_password(password)
            cursor.execute("""
                SELECT id, name, email, student_id FROM students
                WHERE (lower(email) = ? OR lower(student_id) = ?) AND password_hash = ?
            """, (email_or_id, email_or_id, pwd_hash))
            user = cursor.fetchone()
            conn.close()

            if not user:
                self.send_json({"error": "Invalid credentials. Please verify and try again."}, status=401)
                return

            user_data = dict(user)
            self.send_json({"success": True, "message": "Login successful!", "user": user_data})

        elif path == "/api/guest-login":
            name = (body.get("name") or "Student Guest").strip()
            student_id = (body.get("student_id") or f"STU-{uuid.uuid4().hex[:6].upper()}").strip()
            user_data = {
                "id": f"guest-{uuid.uuid4()}",
                "name": name,
                "email": f"{student_id.lower()}@school.edu",
                "student_id": student_id,
                "is_guest": True
            }
            self.send_json({"success": True, "message": "Logged in as guest", "user": user_data})

        elif path == "/api/submit":
            # Automated Marks Calculation logic
            student_id = body.get("student_id")
            student_name = body.get("student_name", "Student")
            quiz_id = body.get("quiz_id")
            answers = body.get("answers", {})  # { "1": "B", "2": "A", ... }
            time_taken = int(body.get("time_taken_seconds", 0))

            if not student_id or not quiz_id:
                self.send_json({"error": "student_id and quiz_id are required"}, status=400)
                return

            quizzes = load_quizzes()
            quiz = next((q for q in quizzes if q["id"] == quiz_id), None)
            if not quiz:
                self.send_json({"error": "Quiz not found"}, status=404)
                return

            total_questions = len(quiz["questions"])
            total_score = 0.0
            max_score = 0.0
            correct_count = 0
            incorrect_count = 0
            unattempted_count = 0
            question_reviews = []

            for q in quiz["questions"]:
                qid_str = str(q["id"])
                pts = float(q.get("points", 1.0))
                max_score += pts

                selected_opt = answers.get(qid_str)
                correct_opt = q.get("correctOption")
                is_answered = (selected_opt is not None and selected_opt != "")

                if not is_answered:
                    unattempted_count += 1
                    status = "unattempted"
                    earned = 0.0
                elif selected_opt == correct_opt:
                    correct_count += 1
                    total_score += pts
                    status = "correct"
                    earned = pts
                else:
                    incorrect_count += 1
                    status = "incorrect"
                    earned = 0.0

                question_reviews.append({
                    "id": q["id"],
                    "question": q["question"],
                    "options": q["options"],
                    "selectedOption": selected_opt,
                    "correctOption": correct_opt,
                    "status": status,
                    "points": pts,
                    "earned": earned,
                    "explanation": q.get("explanation", "")
                })

            percentage = round((total_score / max_score * 100), 1) if max_score > 0 else 0.0
            passing_percentage = quiz.get("passingPercentage", 60)
            passed = 1 if percentage >= passing_percentage else 0

            # Grade determination
            if percentage >= 90:
                grade = "A+ (Outstanding)"
            elif percentage >= 80:
                grade = "A (Excellent)"
            elif percentage >= 70:
                grade = "B (Very Good)"
            elif percentage >= 60:
                grade = "C (Pass)"
            else:
                grade = "F (Needs Improvement)"

            attempt_id = str(uuid.uuid4())
            now = datetime.utcnow().isoformat()

            details = {
                "grade": grade,
                "passingPercentage": passing_percentage,
                "questionReviews": question_reviews
            }

            # Save to SQLite database
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO attempts (
                    id, student_id, student_name, quiz_id, quiz_title,
                    score, max_score, percentage, passed, total_questions,
                    correct_count, incorrect_count, unattempted_count,
                    time_taken_seconds, details_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                attempt_id, student_id, student_name, quiz["id"], quiz["title"],
                total_score, max_score, percentage, passed, total_questions,
                correct_count, incorrect_count, unattempted_count,
                time_taken, json.dumps(details), now
            ))
            conn.commit()
            conn.close()

            result_payload = {
                "id": attempt_id,
                "student_id": student_id,
                "student_name": student_name,
                "quiz_id": quiz["id"],
                "quiz_title": quiz["title"],
                "score": total_score,
                "max_score": max_score,
                "percentage": percentage,
                "passed": bool(passed),
                "passingPercentage": passing_percentage,
                "grade": grade,
                "total_questions": total_questions,
                "correct_count": correct_count,
                "incorrect_count": incorrect_count,
                "unattempted_count": unattempted_count,
                "time_taken_seconds": time_taken,
                "created_at": now,
                "questionReviews": question_reviews
            }

            self.send_json({"success": True, "result": result_payload})

        else:
            self.send_json({"error": "Endpoint not recognized"}, status=404)

def run_server():
    init_db()
    print(f"Quiz Database initialized at: {DB_PATH}")
    with socketserver.TCPServer(("", PORT), QuizRequestHandler) as httpd:
        print(f"==========================================================")
        print(f"🚀 Online Quiz Platform running at: http://localhost:{PORT}")
        print(f"📁 Serving static web app from: {STATIC_DIR}")
        print(f"==========================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server gracefully...")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
