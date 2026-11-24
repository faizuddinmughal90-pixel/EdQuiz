/**
 * Quiz Engine Module
 * Manages question states, timers, answer choices, palette navigation, and evaluation.
 */

class QuizEngine {
  constructor(options = {}) {
    this.quiz = null;
    this.currentIndex = 0;
    this.answers = {}; // { [questionId]: optionId }
    this.flagged = new Set();
    this.timerInterval = null;
    this.remainingSeconds = 0;
    this.totalSeconds = 0;
    this.startTime = null;
    this.isFinished = false;

    // Callbacks
    this.onQuestionChange = options.onQuestionChange || (() => {});
    this.onTimerTick = options.onTimerTick || (() => {});
    this.onTimeExpired = options.onTimeExpired || (() => {});
    this.onAnswerSelected = options.onAnswerSelected || (() => {});
  }

  start(quizData) {
    this.quiz = JSON.parse(JSON.stringify(quizData));
    this.currentIndex = 0;
    this.answers = {};
    this.flagged.clear();
    this.isFinished = false;

    const durationMins = this.quiz.durationMinutes || 10;
    this.totalSeconds = durationMins * 60;
    this.remainingSeconds = this.totalSeconds;
    this.startTime = Date.now();

    this.startTimer();
    this.notifyQuestionChange();
  }

  startTimer() {
    this.stopTimer();
    this.onTimerTick(this.formatTime(this.remainingSeconds), this.remainingSeconds, this.totalSeconds);

    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;

      this.onTimerTick(this.formatTime(this.remainingSeconds), this.remainingSeconds, this.totalSeconds);

      if (this.remainingSeconds <= 0) {
        this.stopTimer();
        this.remainingSeconds = 0;
        this.onTimeExpired();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getCurrentQuestion() {
    if (!this.quiz || !this.quiz.questions) return null;
    return this.quiz.questions[this.currentIndex];
  }

  selectOption(optionId) {
    if (this.isFinished) return;
    const currentQ = this.getCurrentQuestion();
    if (!currentQ) return;

    this.answers[String(currentQ.id)] = optionId;
    this.onAnswerSelected(currentQ.id, optionId);
    this.notifyQuestionChange();
  }

  clearSelection() {
    if (this.isFinished) return;
    const currentQ = this.getCurrentQuestion();
    if (!currentQ) return;

    delete this.answers[String(currentQ.id)];
    this.notifyQuestionChange();
  }

  toggleFlag() {
    const currentQ = this.getCurrentQuestion();
    if (!currentQ) return;
    const qid = String(currentQ.id);

    if (this.flagged.has(qid)) {
      this.flagged.delete(qid);
    } else {
      this.flagged.add(qid);
    }
    this.notifyQuestionChange();
  }

  isCurrentFlagged() {
    const currentQ = this.getCurrentQuestion();
    if (!currentQ) return false;
    return this.flagged.has(String(currentQ.id));
  }

  goToNext() {
    if (this.currentIndex < this.quiz.questions.length - 1) {
      this.currentIndex++;
      this.notifyQuestionChange();
      return true;
    }
    return false;
  }

  goToPrev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.notifyQuestionChange();
      return true;
    }
    return false;
  }

  goToIndex(index) {
    if (index >= 0 && index < this.quiz.questions.length) {
      this.currentIndex = index;
      this.notifyQuestionChange();
    }
  }

  getSummaryCounts() {
    if (!this.quiz) return { total: 0, answered: 0, unanswered: 0, flagged: 0 };
    const total = this.quiz.questions.length;
    let answered = 0;

    this.quiz.questions.forEach(q => {
      if (this.answers[String(q.id)] !== undefined) {
        answered++;
      }
    });

    return {
      total,
      answered,
      unanswered: total - answered,
      flagged: this.flagged.size
    };
  }

  notifyQuestionChange() {
    const currentQ = this.getCurrentQuestion();
    const selectedOption = currentQ ? this.answers[String(currentQ.id)] : null;
    const isFlagged = this.isCurrentFlagged();
    const counts = this.getSummaryCounts();

    this.onQuestionChange({
      question: currentQ,
      index: this.currentIndex,
      total: this.quiz ? this.quiz.questions.length : 0,
      selectedOption,
      isFlagged,
      counts
    });
  }

  getTimeSpentSeconds() {
    if (!this.startTime) return 0;
    return Math.max(1, Math.min(this.totalSeconds, this.totalSeconds - this.remainingSeconds));
  }

  /**
   * Client-Side Automated Marks Calculation
   * Evaluates marks, accuracy, pass/fail status, and per-question reviews.
   */
  evaluateLocally(fullQuizData, student) {
    this.stopTimer();
    this.isFinished = true;

    const timeSpent = this.getTimeSpentSeconds();
    const questions = fullQuizData.questions || [];
    let totalScore = 0.0;
    let maxScore = 0.0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    const reviews = [];

    questions.forEach(q => {
      const qid = String(q.id);
      const pts = parseFloat(q.points || 1);
      maxScore += pts;

      const selected = this.answers[qid];
      const isAnswered = (selected !== undefined && selected !== null && selected !== "");

      let status = "unattempted";
      let earned = 0.0;

      if (!isAnswered) {
        unattemptedCount++;
      } else if (selected === q.correctOption) {
        correctCount++;
        earned = pts;
        totalScore += pts;
        status = "correct";
      } else {
        incorrectCount++;
        status = "incorrect";
      }

      reviews.push({
        id: q.id,
        question: q.question,
        options: q.options,
        selectedOption: selected || null,
        correctOption: q.correctOption,
        status,
        points: pts,
        earned,
        explanation: q.explanation || "No additional explanation provided."
      });
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
    const passingPercentage = fullQuizData.passingPercentage || 60;
    const passed = percentage >= passingPercentage;

    let grade = "F (Needs Improvement)";
    if (percentage >= 90) grade = "A+ (Outstanding)";
    else if (percentage >= 80) grade = "A (Excellent)";
    else if (percentage >= 70) grade = "B (Very Good)";
    else if (percentage >= 60) grade = "C (Pass)";

    return {
      id: "attempt-" + Date.now(),
      student_id: student.id || student.student_id,
      student_name: student.name || "Student",
      quiz_id: fullQuizData.id,
      quiz_title: fullQuizData.title,
      score: totalScore,
      max_score: maxScore,
      percentage: percentage,
      passed: passed,
      passingPercentage: passingPercentage,
      grade: grade,
      total_questions: questions.length,
      correct_count: correctCount,
      incorrect_count: incorrectCount,
      unattempted_count: unattemptedCount,
      time_taken_seconds: timeSpent,
      created_at: new Date().toISOString(),
      questionReviews: reviews
    };
  }
}

window.QuizEngine = QuizEngine;
