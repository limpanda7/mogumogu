import { useEffect, useState } from 'react'
import './App.css'
import { getIntervalGroupsForDisplay } from './spacedRepetition'

function ResultPage({ quizWords, onBack }) {
  const [intervalGroups, setIntervalGroups] = useState([])

  useEffect(() => {
    // quizWords가 배열이 아니거나 비어있으면 처리하지 않음
    if (!Array.isArray(quizWords) || quizWords.length === 0) {
      return
    }

    // 복습주기별로 그룹화
    const groups = getIntervalGroupsForDisplay(quizWords)
    setIntervalGroups(groups)
  }, [quizWords])

  return (
    <div className="app">
      <div className="main-container page-enter">
        <div className="main-content" style={{ position: 'relative' }}>
          <h1 className="main-title">
            <span className="title-emoji">🍙</span>
            퀴즈 결과
            <span className="title-emoji">🍙</span>
          </h1>

          {intervalGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="result-section">
              <h2 className="result-section-title">{group.label} 복습</h2>
              <div className="result-words-list">
                {group.words.map((word, index) => (
                  <div key={index} className="result-word-item">
                    <div className="result-word-kanji">{word.kanji || word.hiragana}</div>
                    <div className="result-word-info">
                      {word.kanji && (
                        <div className="result-word-romaji">{word.hiragana}</div>
                      )}
                      <div className="result-word-korean">{word.korean}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={onBack} className="back-button">
            돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResultPage

