import { useState, useEffect } from 'react'
import './App.css'
import { resetMasteryData } from './spacedRepetition'
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

const STORAGE_KEY = 'mogumogu_quiz_count'
const MIN_QUIZ_COUNT = 5
const MAX_QUIZ_COUNT = 50
const QUIZ_COUNT_STEP = 5

function SettingsPage({ onBack }) {
  const [quizCount, setQuizCount] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? parseInt(saved, 10) : 10
  })
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackContent, setFeedbackContent] = useState('')
  const [isSending, setIsSending] = useState(false)

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

  const handleSendFeedback = async () => {
    if (!feedbackTitle.trim() || !feedbackContent.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    setIsSending(true)
    try {
      const sendFeedback = httpsCallable(functions, 'sendFeedback')
      await sendFeedback({
        title: feedbackTitle,
        content: feedbackContent
      })
      alert('의견이 성공적으로 전송되었습니다. 감사합니다!')
      setFeedbackTitle('')
      setFeedbackContent('')
      setShowFeedbackModal(false)
    } catch (error) {
      console.error('의견 전송 오류:', error)
      alert('의견 전송 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSending(false)
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
            <div className="settings-item-simple">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="feedback-button"
              >
                의견보내기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 의견보내기 모달 */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => !isSending && setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>의견보내기</h2>
              <button
                className="modal-close-button"
                onClick={() => setShowFeedbackModal(false)}
                disabled={isSending}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="feedback-form-group">
                <label htmlFor="feedback-title">제목</label>
                <input
                  id="feedback-title"
                  type="text"
                  className="feedback-input"
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  placeholder="제목을 입력해주세요"
                  disabled={isSending}
                />
              </div>
              <div className="feedback-form-group">
                <label htmlFor="feedback-content">내용</label>
                <textarea
                  id="feedback-content"
                  className="feedback-textarea"
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="의견을 입력해주세요"
                  rows={8}
                  disabled={isSending}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="feedback-submit-button"
                onClick={handleSendFeedback}
                disabled={isSending || !feedbackTitle.trim() || !feedbackContent.trim()}
              >
                {isSending ? '전송 중...' : '보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsPage

