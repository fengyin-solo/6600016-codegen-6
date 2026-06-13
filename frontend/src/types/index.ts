export interface MorseSymbol {
  char: string
  code: string
}

export type TrainMode = 'charToCode' | 'codeToChar' | 'audioToChar' | 'typingToCode'

export interface HistoryEntry {
  id: number
  input: string
  output: string
  correct: boolean
  timestamp: number
}

export interface WrongQuestion {
  id: number
  char: string
  wrongAnswer: string
  correctAnswer: string
  timestamp: number
  retryCount: number
}
