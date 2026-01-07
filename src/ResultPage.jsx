import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEYS = {
  REVIEW_WORDS: 'mogumogu_review_words',
  COMPLETED_WORDS: 'mogumogu_completed_words'
}

function ResultPage({ quizWords, onBack }) {
  const [completedWords, setCompletedWords] = useState([])
  const [reviewWords, setReviewWords] = useState([])

  useEffect(() => {
    // quizWords가 배열이 아니거나 비어있으면 처리하지 않음
    if (!Array.isArray(quizWords) || quizWords.length === 0) {
      return
    }

    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    const savedReviewWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEW_WORDS) || '[]')

    const completedRomajiSet = new Set(savedCompletedWords.map(w => w.romaji))
    const reviewRomajiSet = new Set(savedReviewWords.map(w => w.romaji))

    // 퀴즈 단어들을 분류
    const completed = []
    const review = []

    quizWords.forEach(word => {
      if (completedRomajiSet.has(word.romaji)) {
        completed.push(word)
      } else if (reviewRomajiSet.has(word.romaji)) {
        review.push(word)
      } else {
        // 둘 다 없으면 복습 대상 (힌트를 보거나 정답보기를 한 경우)
        review.push(word)
      }
    })

    setCompletedWords(completed)
    setReviewWords(review)
  }, [quizWords])

  return (
    <div className="app">
      <div className="main-container page-enter">
        <div className="main-content" style={{ position: 'relative' }}>
          <button onClick={onBack} className="back-chevron-button">
            <span className="chevron-icon"></span>
          </button>
          <h1 className="main-title">
            <span className="title-emoji">🍙</span>
            퀴즈 결과
            <span className="title-emoji">🍙</span>
          </h1>

          {completedWords.length > 0 && (
            <div className="result-section">
              <h2 className="result-section-title">소화한 단어</h2>
              <div className="result-words-list">
                {completedWords.map((word, index) => (
                  <div key={index} className="result-word-item completed">
                    <div className="result-word-kanji">{word.kanji || word.hiragana}</div>
                    <div className="result-word-info">
                      <div className="result-word-romaji">{word.romaji}</div>
                      <div className="result-word-korean">{word.korean}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewWords.length > 0 && (
            <div className="result-section">
              <h2 className="result-section-title">복습할 단어</h2>
              <div className="result-words-list">
                {reviewWords.map((word, index) => (
                  <div key={index} className="result-word-item review">
                    <div className="result-word-kanji">{word.kanji || word.hiragana}</div>
                    <div className="result-word-info">
                      <div className="result-word-romaji">{word.romaji}</div>
                      <div className="result-word-korean">{word.korean}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={onBack} className="back-button">
            돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultPage

