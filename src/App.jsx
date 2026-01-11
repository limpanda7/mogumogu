import { useState, useEffect } from 'react'
import './App.css'
import { vocabulary, shuffleArray } from './vocabulary'
import QuizPage from './QuizPage'
import CompletedWordsPage from './CompletedWordsPage'
import ResultPage from './ResultPage'
import SettingsPage from './SettingsPage'
import { selectQuizWords } from './spacedRepetition'

// localStorage 키
const STORAGE_KEYS = {
  QUIZ_COUNT: 'mogumogu_quiz_count'
}

// 문제 수 고정
const QUIZ_COUNT = 10

function App() {
  const [showQuiz, setShowQuiz] = useState(false)
  const [showCompletedWords, setShowCompletedWords] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [quizWords, setQuizWords] = useState([])
  const [resultQuizWords, setResultQuizWords] = useState([])

  // 퀴즈 완료 후 결과 페이지로 이동
  const handleQuizComplete = (completedQuizWords) => {
    // 퀴즈 페이지 닫기
    setShowQuiz(false)

    // 결과 페이지로 이동 (배열인 경우에만)
    if (Array.isArray(completedQuizWords) && completedQuizWords.length > 0) {
      setResultQuizWords(completedQuizWords)
      setShowResult(true)
    }
  }

  const handleBackFromResult = () => {
    setShowResult(false)
  }

  const handleBackFromCompletedWords = () => {
    setShowCompletedWords(false)
  }

  // 퀴즈 단어 생성 함수 (간격 반복 알고리즘 사용)
  const generateQuizWords = () => {
    // 간격 반복 알고리즘으로 단어 선택 (새 단어 일부 + 복습 단어 다수)
    const wordsList = selectQuizWords(vocabulary, QUIZ_COUNT)

    // 단어가 부족한 경우 랜덤하게 추가
    if (wordsList.length < QUIZ_COUNT) {
      const selectedRomajiSet = new Set(wordsList.map(w => w.romaji))
      const availableWords = vocabulary.filter(
        w => !selectedRomajiSet.has(w.romaji)
      )

      const additionalWords = shuffleArray(availableWords).slice(0, QUIZ_COUNT - wordsList.length)
      wordsList.push(...additionalWords)
    }

    return shuffleArray(wordsList) // 최종적으로 섞기
  }

  const handleStartQuiz = () => {
    // 버튼을 누를 때마다 퀴즈 생성
    const newQuizWords = generateQuizWords()
    setQuizWords(newQuizWords)
    setShowQuiz(true)
  }

  const handleShowCompletedWords = () => {
    setShowCompletedWords(true)
  }

  const handleShowSettings = () => {
    setShowSettings(true)
  }

  const handleBackFromSettings = () => {
    setShowSettings(false)
  }

  if (showQuiz) {
    return <QuizPage quizWords={quizWords} onComplete={handleQuizComplete} />
  }

  if (showResult) {
    return <ResultPage quizWords={resultQuizWords} onBack={handleBackFromResult} />
  }

  if (showCompletedWords) {
    return <CompletedWordsPage onBack={handleBackFromCompletedWords} />
  }

  if (showSettings) {
    return <SettingsPage onBack={handleBackFromSettings} />
  }

  return (
      <div className="app">
      <div className="main-container main-centered page-enter">
        <div className="main-content">
          <h1 className="main-title">
            <span className="title-emoji">🍙</span>
            모구모구 초급 일본어
            <span className="title-emoji">🍙</span>
          </h1>
          <p className="main-subtitle">
            단어를 꼭꼭 씹어보세요!
          </p>

          <div className="button-row">
            <button onClick={handleStartQuiz} className="start-quiz-button">
              {QUIZ_COUNT}문제 냠냠
            </button>
            <button onClick={handleShowCompletedWords} className="completed-words-button">
              공부한 단어
            </button>
          </div>
          <button onClick={handleShowSettings} className="settings-button-bottom">
            ⚙️ 설정
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
