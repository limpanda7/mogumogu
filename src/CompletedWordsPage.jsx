import { useState, useEffect } from 'react'
import './App.css'

const STORAGE_KEYS = {
  COMPLETED_WORDS: 'mogumogu_completed_words'
}

function CompletedWordsPage({ onBack }) {
  const [completedWords, setCompletedWords] = useState([])
  const [selectedWord, setSelectedWord] = useState(null)

  useEffect(() => {
    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    setCompletedWords(savedCompletedWords)
  }, [])

  const handleCardClick = (word) => {
    if (selectedWord?.romaji === word.romaji) {
      setSelectedWord(null)
    } else {
      setSelectedWord(word)
    }
  }

  return (
    <div className="app">
      <div className="main-container page-enter">
        <div className="main-content" style={{ position: 'relative' }}>
          <button onClick={onBack} className="back-chevron-button">
            <span className="chevron-icon"></span>
          </button>
          <h1 className="main-title">
            <span className="title-emoji">🍙</span>
            소화한 단어
            <span className="title-emoji">🍙</span>
          </h1>
          <p className="hint-text">터치해서 뒤집어보세요!</p>
          
          {completedWords.length === 0 ? (
            <div className="empty-message">
              소화한 단어가 없습니다.
            </div>
          ) : (
            <div className="words-grid">
              {completedWords.map((word, index) => {
                const isFlipped = selectedWord?.romaji === word.romaji
                return (
                  <div
                    key={index}
                    className={`word-card-container ${isFlipped ? 'flipped' : ''}`}
                    onClick={() => handleCardClick(word)}
                  >
                    <div className="word-card">
                      <div className="word-card-front">
                        <div className="word-card-kanji">{word.kanji}</div>
                      </div>
                      <div className="word-card-back">
                        <div className="word-card-kanji">{word.kanji || word.hiragana}</div>
                        <div className="word-card-romaji">{word.romaji}</div>
                        <div className="word-card-korean">{word.korean}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompletedWordsPage

