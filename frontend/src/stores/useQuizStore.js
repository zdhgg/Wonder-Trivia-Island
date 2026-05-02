import { defineStore } from "pinia";

export const ANSWER_STATUS = Object.freeze({
  WAITING: "waiting",
  CORRECT: "correct",
  WRONG: "wrong"
});

export const useQuizStore = defineStore("quiz", {
  state: () => ({
    currentQuestionIndex: 0,
    currentScore: 0,
    consecutiveCorrectCount: 0,
    answerState: ANSWER_STATUS.WAITING
  }),

  getters: {
    isWaiting: (state) => state.answerState === ANSWER_STATUS.WAITING,
    isCorrect: (state) => state.answerState === ANSWER_STATUS.CORRECT,
    isWrong: (state) => state.answerState === ANSWER_STATUS.WRONG
  },

  actions: {
    resetQuiz() {
      this.currentQuestionIndex = 0;
      this.currentScore = 0;
      this.consecutiveCorrectCount = 0;
      this.answerState = ANSWER_STATUS.WAITING;
    },

    setWaiting() {
      this.answerState = ANSWER_STATUS.WAITING;
    },

    submitAnswer(isCorrect, points = 10) {
      if (!this.isWaiting) {
        return;
      }

      if (isCorrect) {
        this.currentScore += points;
        this.consecutiveCorrectCount += 1;
        this.answerState = ANSWER_STATUS.CORRECT;
        return;
      }

      this.consecutiveCorrectCount = 0;
      this.answerState = ANSWER_STATUS.WRONG;
    },

    nextQuestion() {
      this.currentQuestionIndex += 1;
      this.answerState = ANSWER_STATUS.WAITING;
    }
  }
});

