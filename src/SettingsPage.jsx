import { useState, useEffect } from 'react'
import './App.css'
import { resetMasteryData } from './spacedRepetition'

const STORAGE_KEY = 'mogumogu_quiz_count'
const MIN_QUIZ_COUNT = 5
const MAX_QUIZ_COUNT = 50
const QUIZ_COUNT_STEP = 5

function SettingsPage({ onBack }) {
  const [quizCount, setQuizCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? parseInt(saved, 10) : 10
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, quizCount.toString())
  }, [quizCount])

  const handleDecrease = () => {
    if (quizCount > MIN_QUIZ_COUNT) {
      setQuizCount(prev => Math.max(MIN_QUIZ_COUNT, prev - QUIZ_COUNT_STEP))
    }
  }

  const handleIncrease = () => {
    if (quizCount < MAX_QUIZ_COUNT) {
      setQuizCount(prev => Math.min(MAX_QUIZ_COUNT, prev + QUIZ_COUNT_STEP))
    }
  }

  const handleResetMasteryData = () => {
    if (window.confirm('모든 단어의 학습 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      resetMasteryData()
      alert('학습 데이터가 초기화되었습니다.')
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
              <span className="settings-label">한번에 풀 문제양</span>
              <div className="quiz-count-control">
                <button
                  onClick={handleDecrease}
                  disabled={quizCount <= MIN_QUIZ_COUNT}
                  className="quiz-count-button-minus"
                  aria-label="문제 수 감소"
                >
                  −
                </button>
                <div className="quiz-count-display">
                  {quizCount}
                </div>
                <button
                  onClick={handleIncrease}
                  disabled={quizCount >= MAX_QUIZ_COUNT}
                  className="quiz-count-button-plus"
                  aria-label="문제 수 증가"
                >
                  +
                </button>
              </div>
            </div>
            <div className="settings-item-simple">
              <button
                onClick={handleResetMasteryData}
                className="reset-button"
              >
                학습 데이터 초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

