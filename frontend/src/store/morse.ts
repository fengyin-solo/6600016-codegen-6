import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { MORSE_TABLE, REVERSE_TABLE, textToMorse, morseToText } from '../utils/morse-code'
import type { TrainMode, HistoryEntry, WrongQuestion } from '../types'

export const useMorseStore = defineStore('morse', () => {
  const inputText = ref('')
  const morseOutput = ref('')
  const decodedText = ref('')
  const wpm = ref(15)
  const frequency = ref(700)
  const volume = ref(0.6)
  const trainMode = ref<TrainMode>('charToCode')
  const history = ref<HistoryEntry[]>([])
  const quizChar = ref('')
  const userAnswer = ref('')
  const score = ref({ correct: 0, total: 0 })
  const isPlaying = ref(false)

  const wrongQuestions = ref<WrongQuestion[]>([])
  const isReviewMode = ref(false)
  const reviewChar = ref('')
  const reviewAnswer = ref('')
  const reviewIndex = ref(0)
  const reviewCorrectCount = ref(0)

  let audioCtx: AudioContext | null = null
  let currentOscillator: OscillatorNode | null = null

  const dotDuration = computed(() => 1200 / wpm.value)

  const isReviewCompleted = ref(false)

  const recentWrongQuestions = computed(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return wrongQuestions.value.filter(q => q.timestamp >= oneWeekAgo)
  })

  const wrongQuestionCount = computed(() => recentWrongQuestions.value.length)

  const reviewProgress = computed(() => {
    if (!isReviewMode.value || recentWrongQuestions.value.length === 0) return 0
    return Math.round(reviewCorrectCount.value / recentWrongQuestions.value.length * 100)
  })

  const reviewCompleted = computed(() => {
    return isReviewCompleted.value
  })

  function getAudioCtx(): AudioContext {
    if (!audioCtx) audioCtx = new AudioContext()
    return audioCtx
  }

  function playTone(duration: number): Promise<void> {
    return new Promise(resolve => {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency.value
      gain.gain.value = volume.value
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      currentOscillator = osc
      setTimeout(() => { osc.stop(); currentOscillator = null; resolve() }, duration)
    })
  }

  async function playMorse(morse: string) {
    isPlaying.value = true
    const dd = dotDuration.value
    for (const token of morse.split(' ')) {
      if (token === '/') { await sleep(dd * 7); continue }
      for (const sym of token) {
        await playTone(sym === '.' ? dd : dd * 3)
        await sleep(dd)
      }
      await sleep(dd * 2)
    }
    isPlaying.value = false
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  function encode() {
    morseOutput.value = textToMorse(inputText.value)
  }

  function decode() {
    decodedText.value = morseToText(inputText.value)
  }

  function generateQuiz() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    quizChar.value = chars[Math.floor(Math.random() * chars.length)]
    userAnswer.value = ''
  }

  function checkAnswer() {
    const correct = userAnswer.value.trim() === MORSE_TABLE[quizChar.value]
    score.value.total++
    if (correct) score.value.correct++
    history.value.unshift({
      id: Date.now(), input: quizChar.value, output: userAnswer.value,
      correct, timestamp: Date.now()
    })
    if (!correct) {
      addWrongQuestion(quizChar.value, userAnswer.value.trim())
    }
    generateQuiz()
  }

  function addWrongQuestion(char: string, wrongAnswer: string) {
    const existing = wrongQuestions.value.find(q => q.char === char)
    if (existing) {
      existing.wrongAnswer = wrongAnswer
      existing.timestamp = Date.now()
      existing.retryCount++
    } else {
      wrongQuestions.value.unshift({
        id: Date.now(),
        char,
        wrongAnswer,
        correctAnswer: MORSE_TABLE[char],
        timestamp: Date.now(),
        retryCount: 0
      })
    }
  }

  function startReview() {
    const wrongs = recentWrongQuestions.value
    if (wrongs.length === 0) return
    isReviewMode.value = true
    reviewIndex.value = 0
    reviewCorrectCount.value = 0
    reviewChar.value = wrongs[0].char
    reviewAnswer.value = ''
  }

  function checkReviewAnswer() {
    const wrongs = recentWrongQuestions.value
    if (wrongs.length === 0) return
    const current = wrongs[reviewIndex.value]
    if (!current) return

    const correct = reviewAnswer.value.trim() === MORSE_TABLE[current.char]

    if (correct) {
      reviewCorrectCount.value++
      const idx = wrongQuestions.value.findIndex(q => q.id === current.id)
      if (idx !== -1) wrongQuestions.value.splice(idx, 1)
    } else {
      current.wrongAnswer = reviewAnswer.value.trim()
      current.timestamp = Date.now()
      current.retryCount++
    }

    const updatedWrongs = recentWrongQuestions.value
    if (updatedWrongs.length === 0) {
      isReviewCompleted.value = true
      return
    }

    if (reviewIndex.value >= updatedWrongs.length) {
      reviewIndex.value = 0
    }
    reviewChar.value = updatedWrongs[reviewIndex.value].char
    reviewAnswer.value = ''
  }

  function nextReviewQuestion() {
    const wrongs = recentWrongQuestions.value
    if (wrongs.length === 0) return
    reviewIndex.value = (reviewIndex.value + 1) % wrongs.length
    reviewChar.value = wrongs[reviewIndex.value].char
    reviewAnswer.value = ''
  }

  function exitReview() {
    isReviewMode.value = false
    isReviewCompleted.value = false
    reviewChar.value = ''
    reviewAnswer.value = ''
    reviewIndex.value = 0
    reviewCorrectCount.value = 0
  }

  function clearWrongQuestions() {
    wrongQuestions.value = []
  }

  function resetScore() {
    score.value = { correct: 0, total: 0 }
    history.value = []
  }

  return {
    inputText, morseOutput, decodedText, wpm, frequency, volume,
    trainMode, history, quizChar, userAnswer, score, isPlaying,
    wrongQuestions, isReviewMode, isReviewCompleted, reviewChar, reviewAnswer, reviewIndex, reviewCorrectCount,
    recentWrongQuestions, wrongQuestionCount, reviewProgress, reviewCompleted,
    dotDuration, encode, decode, playMorse, playTone,
    generateQuiz, checkAnswer, resetScore,
    startReview, checkReviewAnswer, nextReviewQuestion, exitReview, clearWrongQuestions
  }
})
