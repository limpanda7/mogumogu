import { useState, useEffect } from 'react'
import './App.css'

const STORAGE_KEYS = {
  COMPLETED_WORDS: 'mogumogu_completed_words',
  QUIZ_COUNT: 'mogumogu_quiz_count'
}

function SettingsPage({ onBack, onCompletedWordsReset }) {
  const [quizCount, setQuizCount] = useState(5)

  useEffect(() => {
    // 저장된 문제 양 불러오기
    const savedQuizCount = localStorage.getItem(STORAGE_KEYS.QUIZ_COUNT)
    if (savedQuizCount) {
      setQuizCount(parseInt(savedQuizCount, 10))
    }
  }, [])

  const handleQuizCountChange = (count) => {
    setQuizCount(count)
    localStorage.setItem(STORAGE_KEYS.QUIZ_COUNT, count.toString())
  }

  const handleDecrease = () => {
    const newCount = Math.max(5, quizCount - 5)
    handleQuizCountChange(newCount)
  }

  const handleIncrease = () => {
    const newCount = quizCount + 5
    handleQuizCountChange(newCount)
  }

  const handleResetCompletedWords = () => {
    if (window.confirm('소화한 단어를 모두 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.setItem(STORAGE_KEYS.COMPLETED_WORDS, JSON.stringify([]))
      if (onCompletedWordsReset) {
        onCompletedWordsReset()
      }
      alert('소화한 단어가 초기화되었습니다.')
    }
  }

  return (
    <div className="app">
      <div className="main-container page-enter">
        <div className="main-content" style={{ position: 'relative' }}>
          <button onClick={onBack} className="back-chevron-button">
            <span className="chevron-icon"></span>
          </button>
          <div className="settings-header">
            <h1 className="settings-title">
              설정
            </h1>
          </div>

          <div className="settings-section">
            <div className="settings-item-simple">
              <span className="settings-label">한번에 풀 문제 양</span>
              <div className="quiz-count-control">
                <button
                  onClick={handleDecrease}
                  className="quiz-count-button-minus"
                  disabled={quizCount <= 5}
                >
                  −
                </button>
                <div className="quiz-count-display">
                  {quizCount}
                </div>
                <button
                  onClick={handleIncrease}
                  className="quiz-count-button-plus"
                >
                  +
                </button>
              </div>
            </div>

            <div className="settings-item-simple">
              <button
                onClick={handleResetCompletedWords}
                className="reset-button"
              >
                소화한 문제 초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

