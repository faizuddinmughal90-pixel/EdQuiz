/**
 * EduQuiz Main Application Controller
 */

(function () {
  "use strict";

  // Application State
  const state = {
    currentUser: null,
    quizzes: [],
    currentQuiz: null,
    currentQuizFull: null, // includes explanations & answers for client fallback
    latestResult: null,
    quizEngine: null,
    isServerOnline: false,
    reviewFilter: "all",
    autoAdvance: true,
    autoAdvanceTimer: null
  };

  // DOM Elements Cache
  const els = {
    // Views
    authView: document.getElementById("authView"),
    dashboardView: document.getElementById("dashboardView"),
    quizPlayerView: document.getElementById("quizPlayerView"),
    resultView: document.getElementById("resultView"),
    historyView: document.getElementById("historyView"),

    // Auth Elements
    tabLoginBtn: document.getElementById("tabLoginBtn"),
    tabRegisterBtn: document.getElementById("tabRegisterBtn"),
    loginForm: document.getElementById("loginForm"),
    registerForm: document.getElementById("registerForm"),
    loginIdentifier: document.getElementById("loginIdentifier"),
    loginPassword: document.getElementById("loginPassword"),
    regName: document.getElementById("regName"),
    regStudentId: document.getElementById("regStudentId"),
    regEmail: document.getElementById("regEmail"),
    regPassword: document.getElementById("regPassword"),
    quickDemoLoginBtn: document.getElementById("quickDemoLoginBtn"),
    quickSpeedStartBtn: document.getElementById("quickSpeedStartBtn"),
    dashFastQuizBtn: document.getElementById("dashFastQuizBtn"),
    fastModeCheckbox: document.getElementById("fastModeCheckbox"),

    // Nav & User
    userBadge: document.getElementById("userBadge"),
    navUserName: document.getElementById("navUserName"),
    navStudentId: document.getElementById("navStudentId"),
    navUserAvatar: document.getElementById("navUserAvatar"),
    logoutBtn: document.getElementById("logoutBtn"),
    myHistoryBtn: document.getElementById("myHistoryBtn"),
    brandBtn: document.getElementById("brandBtn"),
    themeToggleBtn: document.getElementById("themeToggleBtn"),

    // Dashboard
    heroGreeting: document.getElementById("heroGreeting"),
    statQuizzesTaken: document.getElementById("statQuizzesTaken"),
    statAvgScore: document.getElementById("statAvgScore"),
    statPassRate: document.getElementById("statPassRate"),
    quizzesContainer: document.getElementById("quizzesContainer"),

    // Quiz Player
    playerCategoryBadge: document.getElementById("playerCategoryBadge"),
    playerQuizTitle: document.getElementById("playerQuizTitle"),
    timerDisplay: document.getElementById("timerDisplay"),
    playerFinishBtn: document.getElementById("playerFinishBtn"),
    qCurrentIndexBadge: document.getElementById("qCurrentIndexBadge"),
    qPointsBadge: document.getElementById("qPointsBadge"),
    qDifficultyBadge: document.getElementById("qDifficultyBadge"),
    flagQuestionBtn: document.getElementById("flagQuestionBtn"),
    flagBtnText: document.getElementById("flagBtnText"),
    qStatement: document.getElementById("qStatement"),
    optionsContainer: document.getElementById("optionsContainer"),
    prevQBtn: document.getElementById("prevQBtn"),
    nextQBtn: document.getElementById("nextQBtn"),
    clearSelectionBtn: document.getElementById("clearSelectionBtn"),
    paletteGrid: document.getElementById("paletteGrid"),
    countAnswered: document.getElementById("countAnswered"),
    countFlagged: document.getElementById("countFlagged"),
    countUnanswered: document.getElementById("countUnanswered"),

    // Submit Modal
    submitModal: document.getElementById("submitModal"),
    submitModalWarning: document.getElementById("submitModalWarning"),
    modalCountAnswered: document.getElementById("modalCountAnswered"),
    modalCountUnanswered: document.getElementById("modalCountUnanswered"),
    cancelSubmitBtn: document.getElementById("cancelSubmitBtn"),
    confirmSubmitBtn: document.getElementById("confirmSubmitBtn"),

    // Results Display
    resultHeroCard: document.getElementById("resultHeroCard"),
    resultStatusStamp: document.getElementById("resultStatusStamp"),
    resultMarksNumber: document.getElementById("resultMarksNumber"),
    resultPercentage: document.getElementById("resultPercentage"),
    resultGradeBadge: document.getElementById("resultGradeBadge"),
    metricTotalMarks: document.getElementById("metricTotalMarks"),
    metricCorrect: document.getElementById("metricCorrect"),
    metricIncorrect: document.getElementById("metricIncorrect"),
    metricUnattempted: document.getElementById("metricUnattempted"),
    metricTimeTaken: document.getElementById("metricTimeTaken"),
    printScorecardBtn: document.getElementById("printScorecardBtn"),
    retakeQuizBtn: document.getElementById("retakeQuizBtn"),
    backToCatalogBtn: document.getElementById("backToCatalogBtn"),
    reviewCardsContainer: document.getElementById("reviewCardsContainer"),
    filterAllBtn: document.getElementById("filterAllBtn"),
    filterCorrectBtn: document.getElementById("filterCorrectBtn"),
    filterIncorrectBtn: document.getElementById("filterIncorrectBtn"),
    filterUnattemptedBtn: document.getElementById("filterUnattemptedBtn"),
    filterAllCount: document.getElementById("filterAllCount"),
    filterCorrectCount: document.getElementById("filterCorrectCount"),
    filterIncorrectCount: document.getElementById("filterIncorrectCount"),
    filterUnattemptedCount: document.getElementById("filterUnattemptedCount"),

    // History
    historyTableBody: document.getElementById("historyTableBody"),
    historyBackBtn: document.getElementById("historyBackBtn"),

    // Toast
    toastContainer: document.getElementById("toastContainer")
  };

  // ----------------- Initialization -----------------
  function init() {
    setupEventListeners();
    checkServerHealth();
    restoreSession();
    applyThemePreference();
  }

  // ----------------- Server Connectivity Check -----------------
  async function checkServerHealth() {
    try {
      const res = await fetch("/api/quizzes", { cache: "no-store" });
      if (res.ok) {
        state.isServerOnline = true;
        const data = await res.json();
        if (data.quizzes && data.quizzes.length > 0) {
          state.quizzes = data.quizzes;
        } else {
          loadFallbackQuizzes();
        }
      } else {
        loadFallbackQuizzes();
      }
    } catch (err) {
      // Running standalone / file:// or offline
      state.isServerOnline = false;
      loadFallbackQuizzes();
    }
  }

  function loadFallbackQuizzes() {
    if (typeof FALLBACK_QUIZZES !== "undefined") {
      state.quizzes = FALLBACK_QUIZZES.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category || "General",
        durationMinutes: q.durationMinutes || 10,
        passingPercentage: q.passingPercentage || 60,
        totalQuestions: q.questions.length,
        totalMarks: q.questions.reduce((sum, item) => sum + (item.points || 1), 0),
        icon: q.icon || "book"
      }));
    }
  }

  // ----------------- View Routing -----------------
  function showView(viewName) {
    const views = [els.authView, els.dashboardView, els.quizPlayerView, els.resultView, els.historyView];
    views.forEach(v => v.classList.remove("active"));

    if (viewName === "auth") els.authView.classList.add("active");
    if (viewName === "dashboard") {
      updateDashboardStats();
      renderQuizzesGrid();
      els.dashboardView.classList.add("active");
    }
    if (viewName === "player") els.quizPlayerView.classList.add("active");
    if (viewName === "result") els.resultView.classList.add("active");
    if (viewName === "history") {
      renderHistoryTable();
      els.historyView.classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ----------------- Student Session Management -----------------
  function setSession(user) {
    state.currentUser = user;
    localStorage.setItem("eduquiz_student", JSON.stringify(user));
    updateUserBadge();
    showView("dashboard");
    showToast(`Welcome, ${user.name}! 👋`, "success");
  }

  function restoreSession() {
    const saved = localStorage.getItem("eduquiz_student");
    if (saved) {
      try {
        state.currentUser = JSON.parse(saved);
        updateUserBadge();
        showView("dashboard");
        return;
      } catch (e) {
        localStorage.removeItem("eduquiz_student");
      }
    }
    showView("auth");
  }

  function logout() {
    state.currentUser = null;
    localStorage.removeItem("eduquiz_student");
    els.userBadge.style.display = "none";
    if (state.quizEngine) {
      state.quizEngine.stopTimer();
    }
    showView("auth");
    showToast("You have been signed out.", "info");
  }

  function updateUserBadge() {
    if (!state.currentUser) {
      els.userBadge.style.display = "none";
      return;
    }
    const initials = state.currentUser.name
      ? state.currentUser.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
      : "ST";
    els.navUserAvatar.textContent = initials;
    els.navUserName.textContent = state.currentUser.name || "Student";
    els.navStudentId.textContent = `ID: ${state.currentUser.student_id || "STU-1001"}`;
    els.heroGreeting.textContent = `Welcome back, ${state.currentUser.name}! 🎯`;
    els.userBadge.style.display = "flex";
  }

  // ----------------- Student History Storage -----------------
  function getStudentAttempts() {
    if (!state.currentUser) return [];
    const sid = state.currentUser.id || state.currentUser.student_id;
    const key = `eduquiz_attempts_${sid}`;
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveStudentAttempt(attempt) {
    if (!state.currentUser) return;
    const sid = state.currentUser.id || state.currentUser.student_id;
    const key = `eduquiz_attempts_${sid}`;
    const attempts = getStudentAttempts();
    attempts.unshift(attempt);
    localStorage.setItem(key, JSON.stringify(attempts));
  }

  function updateDashboardStats() {
    const attempts = getStudentAttempts();
    els.statQuizzesTaken.textContent = attempts.length;

    if (attempts.length === 0) {
      els.statAvgScore.textContent = "0%";
      els.statPassRate.textContent = "0%";
      return;
    }

    const totalPct = attempts.reduce((acc, a) => acc + (a.percentage || 0), 0);
    const avgPct = Math.round(totalPct / attempts.length);
    const passedCount = attempts.filter(a => a.passed).length;
    const passRate = Math.round((passedCount / attempts.length) * 100);

    els.statAvgScore.textContent = `${avgPct}%`;
    els.statPassRate.textContent = `${passRate}%`;
  }

  // ----------------- Dashboard & Catalog -----------------
  function renderQuizzesGrid() {
    els.quizzesContainer.innerHTML = "";

    if (!state.quizzes || state.quizzes.length === 0) {
      els.quizzesContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No quizzes currently available.</div>`;
      return;
    }

    state.quizzes.forEach(quiz => {
      const card = document.createElement("div");
      card.className = "quiz-card";

      const iconMap = {
        "globe": "🌐",
        "code": "💻",
        "cpu": "⚡",
        "brain": "🤖",
        "shield": "🛡️",
        "database": "🗄️",
        "cloud": "☁️",
        "math": "📐"
      };
      const iconEmoji = iconMap[quiz.icon] || "📚";

      card.innerHTML = `
        <div>
          <div class="quiz-header">
            <div class="quiz-icon">${iconEmoji}</div>
            <div>
              <div class="quiz-category">${quiz.category || "General"}</div>
              <h4 class="quiz-title">${quiz.title}</h4>
            </div>
          </div>
          <p class="quiz-desc">${quiz.description}</p>
        </div>

        <div>
          <div class="quiz-meta">
            <span class="quiz-meta-item">📝 <strong>${quiz.totalQuestions}</strong> Questions</span>
            <span class="quiz-meta-item">⭐ <strong>${quiz.totalMarks}</strong> Marks</span>
            <span class="quiz-meta-item">⏱️ <strong>${quiz.durationMinutes}</strong> mins</span>
            <span class="quiz-meta-item">🎯 Pass: <strong>${quiz.passingPercentage}%</strong></span>
          </div>
          <button class="btn btn-primary btn-block start-quiz-btn" data-id="${quiz.id}">
            Start Assessment 🚀
          </button>
        </div>
      `;

      card.querySelector(".start-quiz-btn").addEventListener("click", () => {
        startQuizSession(quiz.id);
      });

      els.quizzesContainer.appendChild(card);
    });
  }

  // ----------------- Quiz Session Initialization -----------------
  async function startQuizSession(quizId) {
    let quizData = null;

    if (state.isServerOnline) {
      try {
        const res = await fetch(`/api/quiz?id=${encodeURIComponent(quizId)}`);
        const json = await res.json();
        if (json.success && json.quiz) {
          quizData = json.quiz;
        }
      } catch (e) {
        console.warn("Failed fetching from server, falling back to local dataset:", e);
      }
    }

    if (!quizData && typeof FALLBACK_QUIZZES !== "undefined") {
      const fallbackTarget = FALLBACK_QUIZZES.find(q => q.id === quizId);
      if (fallbackTarget) {
        quizData = JSON.parse(JSON.stringify(fallbackTarget));
      }
    }

    if (!quizData) {
      showToast("Quiz data could not be loaded.", "error");
      return;
    }

    // Keep full copy for local evaluation if needed
    if (typeof FALLBACK_QUIZZES !== "undefined") {
      state.currentQuizFull = FALLBACK_QUIZZES.find(q => q.id === quizId) || quizData;
    } else {
      state.currentQuizFull = quizData;
    }

    state.currentQuiz = quizData;

    // Setup Engine
    state.quizEngine = new QuizEngine({
      onQuestionChange: handleQuestionChange,
      onTimerTick: handleTimerTick,
      onTimeExpired: handleTimeExpired
    });

    els.playerQuizTitle.textContent = quizData.title;
    els.playerCategoryBadge.textContent = quizData.category || "Online Exam";

    state.quizEngine.start(quizData);
    showView("player");
    showToast(`Quiz started! You have ${quizData.durationMinutes || 10} minutes. Good luck!`, "info");
  }

  // ----------------- Quiz Interaction Handlers -----------------
  function handleTimerTick(timeStr, remainingSecs) {
    els.timerDisplay.textContent = timeStr;
    if (remainingSecs <= 60) {
      els.timerDisplay.classList.add("urgent");
    } else {
      els.timerDisplay.classList.remove("urgent");
    }
  }

  function handleTimeExpired() {
    showToast("⏰ Time's up! Automatically calculating your marks...", "error");
    submitQuizAnswers();
  }

  function handleQuestionChange(data) {
    const { question, index, total, selectedOption, isFlagged, counts } = data;
    if (!question) return;

    // Badges & Counters
    els.qCurrentIndexBadge.textContent = `Question ${index + 1} of ${total}`;
    els.qPointsBadge.textContent = `+${question.points || 1} Mark${(question.points || 1) > 1 ? 's' : ''}`;
    els.qDifficultyBadge.textContent = question.difficulty || "Medium";

    // Flag Button
    if (isFlagged) {
      els.flagQuestionBtn.classList.remove("btn-outline");
      els.flagQuestionBtn.classList.add("btn-warning");
      els.flagBtnText.textContent = "Flagged";
    } else {
      els.flagQuestionBtn.classList.remove("btn-warning");
      els.flagQuestionBtn.classList.add("btn-outline");
      els.flagBtnText.textContent = "Flag for Review";
    }

    // Question Statement
    els.qStatement.textContent = question.question;

    // Options Rendering
    els.optionsContainer.innerHTML = "";
    (question.options || []).forEach(opt => {
      const optDiv = document.createElement("div");
      optDiv.className = `option-item ${selectedOption === opt.id ? "selected" : ""}`;
      optDiv.innerHTML = `
        <div class="option-indicator">${opt.id}</div>
        <div class="option-label">${opt.text}</div>
      `;

      optDiv.addEventListener("click", () => {
        state.quizEngine.selectOption(opt.id);
        if (state.autoAdvance && state.quizEngine && state.currentQuiz && state.quizEngine.currentIndex < (state.currentQuiz.questions.length - 1)) {
          clearTimeout(state.autoAdvanceTimer);
          state.autoAdvanceTimer = setTimeout(() => {
            state.quizEngine.goToNext();
          }, 180);
        }
      });

      els.optionsContainer.appendChild(optDiv);
    });

    // Navigation Buttons State
    els.prevQBtn.disabled = index === 0;
    els.nextQBtn.textContent = (index === total - 1) ? "Review Palette 📋" : "Next ➡️";

    // Sidebar Palette Rendering
    renderPalette(total, index, state.quizEngine.answers, state.quizEngine.flagged);

    // Sidebar Summary Counts
    els.countAnswered.textContent = counts.answered;
    els.countFlagged.textContent = counts.flagged;
    els.countUnanswered.textContent = counts.unanswered;
  }

  function renderPalette(total, currentIndex, answers, flaggedSet) {
    els.paletteGrid.innerHTML = "";
    const questions = state.currentQuiz.questions || [];

    for (let i = 0; i < total; i++) {
      const q = questions[i];
      const qid = String(q.id);
      const isAnswered = answers[qid] !== undefined && answers[qid] !== null && answers[qid] !== "";
      const isFlagged = flaggedSet.has(qid);
      const isCurrent = (i === currentIndex);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "palette-btn";
      btn.textContent = i + 1;

      if (isCurrent) btn.classList.add("current");
      if (isAnswered) btn.classList.add("answered");
      else if (isFlagged) btn.classList.add("flagged");

      btn.addEventListener("click", () => {
        state.quizEngine.goToIndex(i);
      });

      els.paletteGrid.appendChild(btn);
    }
  }

  // ----------------- Submit Modal & Marks Calculation -----------------
  function openSubmitModal() {
    const counts = state.quizEngine.getSummaryCounts();
    els.modalCountAnswered.textContent = counts.answered;
    els.modalCountUnanswered.textContent = counts.unanswered;

    if (counts.unanswered > 0) {
      els.submitModalWarning.textContent = `You still have ${counts.unanswered} unanswered question${counts.unanswered > 1 ? 's' : ''}. Are you sure you wish to submit now?`;
    } else {
      els.submitModalWarning.textContent = `All ${counts.total} questions answered! Ready to calculate marks?`;
    }

    els.submitModal.classList.add("active");
  }

  function closeSubmitModal() {
    els.submitModal.classList.remove("active");
  }

  async function submitQuizAnswers() {
    closeSubmitModal();
    if (!state.quizEngine || !state.currentQuiz) return;

    state.quizEngine.stopTimer();

    const student = state.currentUser || { id: "guest-user", name: "Student", student_id: "STU-0001" };
    const answers = state.quizEngine.answers;
    const timeSpent = state.quizEngine.getTimeSpentSeconds();

    let result = null;

    // 1. Try Server-Side Automated Marks Calculation
    if (state.isServerOnline) {
      try {
        const payload = {
          student_id: student.id || student.student_id,
          student_name: student.name,
          quiz_id: state.currentQuiz.id,
          answers: answers,
          time_taken_seconds: timeSpent
        };

        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const json = await res.json();
        if (json.success && json.result) {
          result = json.result;
        }
      } catch (err) {
        console.warn("Server submission failed, running automated client-side grading fallback:", err);
      }
    }

    // 2. Client-Side Evaluation Fallback (if server unavailable or offline)
    if (!result) {
      result = state.quizEngine.evaluateLocally(state.currentQuizFull, student);
    }

    // Save attempt to student's local history
    saveStudentAttempt(result);
    state.latestResult = result;

    // Display Results
    displayResults(result);
  }

  // ----------------- Results Display System -----------------
  function displayResults(res) {
    // Pass/Fail Stamp & Theme
    if (res.passed) {
      els.resultHeroCard.className = "result-hero passed";
      els.resultStatusStamp.innerHTML = `🏆 PASSED (${res.percentage}%)`;
    } else {
      els.resultHeroCard.className = "result-hero failed";
      els.resultStatusStamp.innerHTML = `⚠️ FAILED (${res.percentage}%)`;
    }

    els.resultTitle.textContent = res.passed
      ? `Congratulations, ${res.student_name}! 🎉`
      : `Good effort, ${res.student_name}! Practice makes perfect.`;

    els.resultMarksNumber.textContent = `${res.score} / ${res.max_score}`;
    els.resultPercentage.textContent = `${res.percentage}% Marks Earned`;
    els.resultGradeBadge.textContent = `Grade: ${res.grade || "Completed"}`;

    // Metric Pills
    els.metricTotalMarks.textContent = `${res.score} / ${res.max_score}`;
    els.metricCorrect.textContent = res.correct_count;
    els.metricIncorrect.textContent = res.incorrect_count;
    els.metricUnattempted.textContent = res.unattempted_count;

    const mins = Math.floor(res.time_taken_seconds / 60);
    const secs = res.time_taken_seconds % 60;
    els.metricTimeTaken.textContent = `${mins}m ${secs}s`;

    // Filter Badges
    const reviews = res.questionReviews || [];
    els.filterAllCount.textContent = reviews.length;
    els.filterCorrectCount.textContent = res.correct_count;
    els.filterIncorrectCount.textContent = res.incorrect_count;
    els.filterUnattemptedCount.textContent = res.unattempted_count;

    state.reviewFilter = "all";
    updateFilterButtons();
    renderReviewCards(reviews, "all");

    showView("result");
  }

  function updateFilterButtons() {
    const pills = [els.filterAllBtn, els.filterCorrectBtn, els.filterIncorrectBtn, els.filterUnattemptedBtn];
    pills.forEach(p => {
      if (p.dataset.filter === state.reviewFilter) {
        p.classList.add("active");
      } else {
        p.classList.remove("active");
      }
    });
  }

  function renderReviewCards(reviews, filter) {
    els.reviewCardsContainer.innerHTML = "";

    const filtered = reviews.filter(r => {
      if (filter === "all") return true;
      if (filter === "correct") return r.status === "correct";
      if (filter === "incorrect") return r.status === "incorrect";
      if (filter === "unattempted") return r.status === "unattempted";
      return true;
    });

    if (filtered.length === 0) {
      els.reviewCardsContainer.innerHTML = `
        <div style="background: var(--bg-card); padding: 2rem; border-radius: var(--radius-md); text-align: center; color: var(--text-secondary); border: 1px solid var(--border-color);">
          No questions in this filter category.
        </div>
      `;
      return;
    }

    filtered.forEach((r, idx) => {
      const card = document.createElement("div");
      card.className = `review-card ${r.status}`;

      let statusBadge = "";
      if (r.status === "correct") {
        statusBadge = `<span class="badge badge-success">✅ Correct (+${r.earned} Mark)</span>`;
      } else if (r.status === "incorrect") {
        statusBadge = `<span class="badge badge-danger">❌ Incorrect (0 Marks)</span>`;
      } else {
        statusBadge = `<span class="badge badge-warning">⚠️ Unattempted (0 Marks)</span>`;
      }

      let optionsHtml = "";
      (r.options || []).forEach(opt => {
        let optClass = "review-opt";
        let marker = "";

        if (opt.id === r.correctOption) {
          optClass += " actual-correct";
          marker = `<span style="margin-left: auto; color: var(--success); font-weight: 700;">✓ Correct Answer</span>`;
        } else if (opt.id === r.selectedOption && r.status === "incorrect") {
          optClass += " student-wrong";
          marker = `<span style="margin-left: auto; color: var(--danger); font-weight: 700;">✗ Your Choice</span>`;
        }

        optionsHtml += `
          <div class="${optClass}">
            <strong style="width: 24px;">${opt.id}.</strong>
            <span>${opt.text}</span>
            ${marker}
          </div>
        `;
      });

      card.innerHTML = `
        <div class="review-header">
          <div>
            <strong style="color: var(--text-secondary);">Question ${r.id}</strong>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div class="review-q-text">${r.question}</div>
        <div class="review-options">${optionsHtml}</div>

        <div class="review-explanation">
          <strong>💡 Solution Explanation:</strong>
          <p style="margin-top: 0.25rem;">${r.explanation || "Correct answer is option " + r.correctOption}</p>
        </div>
      `;

      els.reviewCardsContainer.appendChild(card);
    });
  }

  // ----------------- History View -----------------
  function renderHistoryTable() {
    const attempts = getStudentAttempts();
    els.historyTableBody.innerHTML = "";

    if (attempts.length === 0) {
      els.historyTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            No quiz attempts recorded yet. Take your first quiz!
          </td>
        </tr>
      `;
      return;
    }

    attempts.forEach(a => {
      const row = document.createElement("tr");
      const dateStr = a.created_at ? new Date(a.created_at).toLocaleString() : "Recent";
      const statusBadge = a.passed
        ? `<span class="badge badge-success">PASSED</span>`
        : `<span class="badge badge-danger">FAILED</span>`;

      const mins = Math.floor((a.time_taken_seconds || 0) / 60);
      const secs = (a.time_taken_seconds || 0) % 60;
      const timeStr = `${mins}m ${secs}s`;

      row.innerHTML = `
        <td>${dateStr}</td>
        <td><strong>${a.quiz_title}</strong></td>
        <td><strong>${a.score} / ${a.max_score}</strong></td>
        <td>${a.percentage}%</td>
        <td>${statusBadge}</td>
        <td>${timeStr}</td>
        <td>
          <button class="btn btn-outline btn-sm view-past-result-btn" data-id="${a.id}">
            📄 View Scorecard
          </button>
        </td>
      `;

      row.querySelector(".view-past-result-btn").addEventListener("click", () => {
        state.latestResult = a;
        displayResults(a);
      });

      els.historyTableBody.appendChild(row);
    });
  }

  // ----------------- Toast Notifications -----------------
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    els.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ----------------- Theme Switcher -----------------
  function applyThemePreference() {
    const savedTheme = localStorage.getItem("eduquiz_theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    els.themeToggleBtn.textContent = savedTheme === "dark" ? "☀️ Light" : "🌙 Dark";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("eduquiz_theme", next);
    els.themeToggleBtn.textContent = next === "dark" ? "☀️ Light" : "🌙 Dark";
  }

  // ----------------- Event Listeners -----------------
  function setupEventListeners() {
    // Auth Tab Switching
    els.tabLoginBtn.addEventListener("click", () => {
      els.tabLoginBtn.classList.add("active");
      els.tabRegisterBtn.classList.remove("active");
      els.loginForm.style.display = "block";
      els.registerForm.style.display = "none";
    });

    els.tabRegisterBtn.addEventListener("click", () => {
      els.tabRegisterBtn.classList.add("active");
      els.tabLoginBtn.classList.remove("active");
      els.loginForm.style.display = "none";
      els.registerForm.style.display = "block";
    });

    // Login Form Submit
    els.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const identifier = els.loginIdentifier.value.trim();
      const password = els.loginPassword.value;

      if (state.isServerOnline) {
        try {
          const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password })
          });
          const json = await res.json();
          if (json.success && json.user) {
            setSession(json.user);
            return;
          } else {
            showToast(json.error || "Login failed.", "error");
            return;
          }
        } catch (err) {
          console.warn("Server login error:", err);
        }
      }

      // Offline / Direct Demonstration Mode
      const user = {
        id: "offline-" + identifier.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        name: identifier.includes("@") ? identifier.split("@")[0] : identifier,
        student_id: identifier.toUpperCase(),
        email: identifier.includes("@") ? identifier : `${identifier.toLowerCase()}@school.edu`
      };
      setSession(user);
    });

    // Register Form Submit
    els.registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = els.regName.value.trim();
      const student_id = els.regStudentId.value.trim();
      const email = els.regEmail.value.trim();
      const password = els.regPassword.value;

      if (state.isServerOnline) {
        try {
          const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, student_id, email, password })
          });
          const json = await res.json();
          if (json.success && json.user) {
            setSession(json.user);
            return;
          } else {
            showToast(json.error || "Registration failed.", "error");
            return;
          }
        } catch (err) {
          console.warn("Server register error:", err);
        }
      }

      // Offline Fallback
      const user = {
        id: "offline-" + student_id.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        name: name,
        student_id: student_id,
        email: email
      };
      setSession(user);
    });

    // Fast Speed Start Function
    const triggerInstantSpeedQuiz = () => {
      const fastStudent = {
        id: "speed-runner",
        name: "Speed Runner",
        student_id: "FAST-001",
        email: "fast.student@eduquiz.edu"
      };
      setSession(fastStudent);
      const targetQuizId = state.quizzes.length > 0 ? state.quizzes[0].id : "web-dev";
      startQuizSession(targetQuizId);
    };

    if (els.quickSpeedStartBtn) {
      els.quickSpeedStartBtn.addEventListener("click", triggerInstantSpeedQuiz);
    }

    if (els.dashFastQuizBtn) {
      els.dashFastQuizBtn.addEventListener("click", triggerInstantSpeedQuiz);
    }

    if (els.fastModeCheckbox) {
      els.fastModeCheckbox.addEventListener("change", (e) => {
        state.autoAdvance = e.target.checked;
        showToast(state.autoAdvance ? "⚡ Auto-advance enabled: answering auto-skips to next!" : "Manual advance enabled", "info");
      });
    }

    // 1-Click Quick Demo Login
    els.quickDemoLoginBtn.addEventListener("click", () => {
      const demoUser = {
        id: "demo-alex-johnson",
        name: "Alex Johnson",
        student_id: "STU-2024-88",
        email: "alex.johnson@eduportal.edu"
      };
      setSession(demoUser);
    });

    // Navigation & Brand
    els.brandBtn.addEventListener("click", () => {
      if (state.currentUser) showView("dashboard");
      else showView("auth");
    });

    els.logoutBtn.addEventListener("click", logout);
    els.myHistoryBtn.addEventListener("click", () => showView("history"));
    els.historyBackBtn.addEventListener("click", () => showView("dashboard"));
    els.themeToggleBtn.addEventListener("click", toggleTheme);

    // Quiz Controls
    els.prevQBtn.addEventListener("click", () => state.quizEngine && state.quizEngine.goToPrev());
    els.nextQBtn.addEventListener("click", () => state.quizEngine && state.quizEngine.goToNext());
    els.clearSelectionBtn.addEventListener("click", () => state.quizEngine && state.quizEngine.clearSelection());
    els.flagQuestionBtn.addEventListener("click", () => state.quizEngine && state.quizEngine.toggleFlag());

    // Submit Triggers
    els.playerFinishBtn.addEventListener("click", openSubmitModal);
    els.cancelSubmitBtn.addEventListener("click", closeSubmitModal);
    els.confirmSubmitBtn.addEventListener("click", submitQuizAnswers);

    // Results Actions
    els.printScorecardBtn.addEventListener("click", () => window.print());
    els.backToCatalogBtn.addEventListener("click", () => showView("dashboard"));
    els.retakeQuizBtn.addEventListener("click", () => {
      if (state.currentQuiz) {
        startQuizSession(state.currentQuiz.id);
      } else {
        showView("dashboard");
      }
    });

    // Review Filters
    [els.filterAllBtn, els.filterCorrectBtn, els.filterIncorrectBtn, els.filterUnattemptedBtn].forEach(btn => {
      btn.addEventListener("click", () => {
        state.reviewFilter = btn.dataset.filter;
        updateFilterButtons();
        if (state.latestResult && state.latestResult.questionReviews) {
          renderReviewCards(state.latestResult.questionReviews, state.reviewFilter);
        }
      });
    });

    // Keyboard navigation (Options A, B, C, D or 1, 2, 3, 4, Enter for Next)
    window.addEventListener("keydown", (e) => {
      if (!els.quizPlayerView.classList.contains("active") || !state.quizEngine) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      const key = e.key.toUpperCase();
      let chosen = null;
      if (["A", "B", "C", "D"].includes(key)) chosen = key;
      else if (key === "1") chosen = "A";
      else if (key === "2") chosen = "B";
      else if (key === "3") chosen = "C";
      else if (key === "4") chosen = "D";

      if (chosen) {
        state.quizEngine.selectOption(chosen);
        if (state.autoAdvance && state.quizEngine && state.currentQuiz && state.quizEngine.currentIndex < (state.currentQuiz.questions.length - 1)) {
          clearTimeout(state.autoAdvanceTimer);
          state.autoAdvanceTimer = setTimeout(() => {
            state.quizEngine.goToNext();
          }, 180);
        }
      } else if (e.key === "ArrowRight") {
        state.quizEngine.goToNext();
      } else if (e.key === "ArrowLeft") {
        state.quizEngine.goToPrev();
      } else if (e.key === "Enter" && e.ctrlKey) {
        submitQuizAnswers();
      }
    });
  }

  // Start app on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", init);
})();
