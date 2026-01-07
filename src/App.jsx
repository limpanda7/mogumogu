import { useState, useEffect } from 'react'
import './App.css'
import { vocabulary, shuffleArray } from './vocabulary'
import QuizPage from './QuizPage'
import CompletedWordsPage from './CompletedWordsPage'
import ResultPage from './ResultPage'

// localStorage 키
const STORAGE_KEYS = {
  REVIEW_WORDS: 'mogumogu_review_words',
  COMPLETED_WORDS: 'mogumogu_completed_words'
}

function App() {
  const [showQuiz, setShowQuiz] = useState(false)
  const [showCompletedWords, setShowCompletedWords] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [quizWords, setQuizWords] = useState([])
  const [resultQuizWords, setResultQuizWords] = useState([])
  const [completedCount, setCompletedCount] = useState(0)

  // 완료한 단어 개수 가져오기
  useEffect(() => {
    const updateCompletedCount = () => {
      const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
      setCompletedCount(savedCompletedWords.length)
    }

    updateCompletedCount()

    // storage 이벤트 리스너 추가 (다른 탭에서 변경 시 업데이트)
    window.addEventListener('storage', updateCompletedCount)

    return () => {
      window.removeEventListener('storage', updateCompletedCount)
    }
  }, [])

  // 퀴즈 완료 후 결과 페이지로 이동
  const handleQuizComplete = (completedQuizWords) => {
    // 퀴즈 페이지 닫기 (이미 QuizPage에서 로컬 스토리지 저장 완료)
    setShowQuiz(false)
    
    // 결과 페이지로 이동 (배열인 경우에만)
    if (Array.isArray(completedQuizWords) && completedQuizWords.length > 0) {
      setResultQuizWords(completedQuizWords)
      setShowResult(true)
    }
    
    // 완료한 단어 개수 업데이트
    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    setCompletedCount(savedCompletedWords.length)
  }

  const handleBackFromResult = () => {
    setShowResult(false)
    // 완료한 단어 개수 업데이트
    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    setCompletedCount(savedCompletedWords.length)
  }

  const handleBackFromCompletedWords = () => {
    setShowCompletedWords(false)
    // 완료한 단어 개수 업데이트
    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    setCompletedCount(savedCompletedWords.length)
  }

  // 퀴즈 단어 생성 함수
  const generateQuizWords = () => {
    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    const savedReviewWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEW_WORDS) || '[]')

    let wordsList = []

    // 복습 단어가 5개 이상이면 복습 단어만 5개
    if (savedReviewWords.length >= 5) {
      wordsList = shuffleArray(savedReviewWords).slice(0, 5)
    } else {
      // 복습 단어가 5개 미만이면 복습 단어 + 새로운 단어로 총 5개
      const reviewCount = savedReviewWords.length
      const newWordCount = 5 - reviewCount

      // 이미 completed나 review에 있는 단어들 제외
      const completedRomaji = savedCompletedWords.map(w => w.romaji)
      const reviewRomaji = savedReviewWords.map(w => w.romaji)
      const excludedRomaji = new Set([...completedRomaji, ...reviewRomaji])
      const availableWords = vocabulary.filter(w => !excludedRomaji.has(w.romaji))

      // 새로운 단어 선택
      const newWords = shuffleArray(availableWords).slice(0, newWordCount)

      // 복습 단어와 새로운 단어 합치기 후 randomize
      wordsList = shuffleArray([...savedReviewWords, ...newWords])
    }

    return wordsList
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

  if (showQuiz) {
    return <QuizPage quizWords={quizWords} onComplete={handleQuizComplete} />
  }

  if (showResult) {
    return <ResultPage quizWords={resultQuizWords} onBack={handleBackFromResult} />
  }

  if (showCompletedWords) {
    return <CompletedWordsPage onBack={handleBackFromCompletedWords} />
  }

  return (
      <div className="app">
      <div className="main-container page-enter">
        <div className="main-content">
          <h1 className="main-title">
            <span className="title-emoji">🍙</span>
            모구모구 초급 일본어
            <span className="title-emoji">🍙</span>
          </h1>
          <p className="main-subtitle">단어를 꼭꼭 씹어보세요!</p>

          <div className="button-row">
            <button onClick={handleStartQuiz} className="start-quiz-button">
              5문제 냠냠
            </button>
            <button onClick={handleShowCompletedWords} className="completed-words-button">
              소화한 단어({completedCount}개)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
