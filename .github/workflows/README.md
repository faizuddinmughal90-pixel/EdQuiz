# EduQuiz - Online Quiz & Automated Assessment Platform

A modern, responsive, full-featured online quiz web application with student authentication, timed multiple-choice assessments, automated marks calculation, and comprehensive result reports with answer explanations.

---

## 🌟 Key Features

1. **Student Login & Authentication**
   - **Student Sign-in**: Login using Student ID or registered Email and password.
   - **New Student Registration**: Creates persistent student accounts stored securely in an SQLite database.
   - **1-Click Quick Demo Login**: Fast testing access button for demonstration without manual typing.
   - **Student Session & Profile Badge**: Shows the student's name, ID, and quick actions on the top navigation bar.

2. **Interactive Multiple Choice Question (MCQ) Player**
   - **Multi-Category Quiz Catalog**: Web Development, Python Programming, Computer Science & Algorithms, and more.
   - **Live Countdown Timer**: Visual countdown clock that turns urgent in the final minute and automatically submits when time expires.
   - **Question Navigator / Palette**: Jump directly to any question. Visual indicators show:
     - 🟩 **Green**: Answered
     - 🟨 **Yellow/Orange**: Flagged for Review
     - ⬜ **Gray**: Unanswered
     - 🔵 **Blue Ring**: Current Active Question
   - **Answer Selection**: Supports mouse click, touchscreen tap, and quick keyboard shortcuts (`A`, `B`, `C`, `D` or `1`, `2`, `3`, `4`).
   - **Question Flags & Clear Selection**: Mark difficult questions to return to later, or clear a selected option.
   - **Confirmation Modal**: Alerts students before final submission if any questions are left unanswered.

3. **Automated Marks & Grade Calculation**
   - **Instant Marks Computation**: Evaluates submitted answers against official answer keys automatically.
   - **Weighted Scoring**: Supports custom points/marks per question.
   - **Key Metrics Calculation**:
     - Total Marks Scored vs Maximum Marks (e.g. `7 / 8`)
     - Accuracy Percentage (e.g. `87.5%`)
     - Correct, Incorrect, and Unattempted question tallies
     - Total Time Taken (minutes and seconds)
   - **Automated Performance Grading**:
     - `A+ (Outstanding)` for $\ge 90\%$
     - `A (Excellent)` for $80\% - 89\%$
     - `B (Very Good)` for $70\% - 79\%$
     - `C (Pass)` for $60\% - 69\%$
     - `F (Needs Improvement)` for $< 60\%$
   - **Pass / Fail Determination**: Dynamic status stamp based on customizable passing threshold (default 60%).

4. **Detailed Results Display & Solutions Review**
   - **Visual Result Card**: Celebratory badge with score circular gauge and performance grade.
   - **Detailed Question-by-Question Breakdown**:
     - Highlights student's selected answer in **Green** (if correct) or **Red** (if incorrect).
     - Clearly highlights the **Official Correct Answer**.
     - Provides clear **Solution Explanations** detailing why the answer is correct.
   - **Filter Pills**: Filter review items by `All`, `✅ Correct Only`, `❌ Incorrect Only`, or `⚠️ Unattempted`.
   - **Print & Save**: One-click print-ready formatted scorecard for saving as PDF or printing.
   - **Retake Quiz**: Immediate option to re-attempt the quiz to improve scores.

5. **Historical Performance Log**
   - Logs every completed attempt with timestamp, score, percentage, status, and time taken.
   - Review past attempts and re-open any prior scorecard anytime.

6. **Flexible Architecture (Dual Server + Standalone Support)**
   - **Server Mode (Full-stack)**: Runs lightweight REST API with Python's built-in `http.server` and SQLite database with zero external dependencies.
   - **Offline Standalone Mode**: Can also run completely client-side by opening `static/index.html` directly in any web browser without needing any backend server!

---

## 🚀 How to Run the Website

### Method 1: Start the Backend Server (Recommended)

Run the included launch script or start the Python server directly:

```bash
cd /Users/apple/.gemini/antigravity/scratch/quiz-website
./start.sh
```

Or run directly with Python:
```bash
python3 server.py
```

Then open your browser and navigate to:
👉 **[http://localhost:8080](http://localhost:8080)**

---

### Method 2: Open Standalone in Browser (No Server Needed)

You can also open the web app directly in any browser:
```bash
open /Users/apple/.gemini/antigravity/scratch/quiz-website/static/index.html
```
All features (authentication, quiz timer, automated grading, results breakdown, and history tracking via LocalStorage) work seamlessly in offline standalone mode as well!

---

## 📁 Project Structure

```
quiz-website/
├── server.py              # Lightweight REST API & HTTP server (Python standard library)
├── start.sh               # Quick startup script
├── README.md              # Documentation and guide
├── data/
│   ├── quizzes.json       # Question bank datasets (Web Dev, Python, CS Algorithms)
│   └── database.sqlite    # Auto-created SQLite DB for students, attempts & scorecards
└── static/
    ├── index.html         # Modern SPA container with Auth, Player & Results views
    ├── css/
    │   └── style.css      # Responsive styles, glassmorphic effects, print layout
    └── js/
        ├── app.js         # Core application router, view controller & events
        ├── quiz.js        # Quiz engine: timer, question palette & grading calculation
        └── data.js        # Built-in offline question bank for standalone execution
```

---

## 🧪 Testing the Quiz Website

1. Launch the server (`./start.sh`) and open `http://localhost:8080`.
2. Click **"1-Click Demo Student Access"** or register a new student account.
3. Select a quiz like **"Web Development Essentials"** or **"Python Programming Essentials"**.
4. Answer questions using the mouse or keyboard (`A`, `B`, `C`, `D`). Use the side navigator to jump between questions or flag questions for review.
5. Click **"Submit & Calculate Marks"** to view the automated evaluation.
6. Review your percentage score, letter grade, and question-by-question explanations.
7. Click **"Print / Save Scorecard"** or **"History"** to inspect your test records.
