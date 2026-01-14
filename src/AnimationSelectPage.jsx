import { useState } from 'react'
import './App.css'
import { animations } from './animations'

function AnimationSelectPage({ onBack, onSelectAnimation }) {
  const availableAnimations = animations.filter(anim => anim.words.length > 0)

  return (
    <div className="app">
      <div className="main-container main-centered page-enter">
        <div className="main-content">
          <div className="top-header">
            <button onClick={onBack} className="back-chevron-button">
              <span className="chevron-icon"></span>
            </button>
            <h1 className="main-title" style={{ flex: 1, textAlign: 'center', margin: 0 }}>
              <span className="title-emoji">🎬</span>
              애니메이션 대사 학습
              <span className="title-emoji">🎬</span>
            </h1>
            <div style={{ width: '40px' }}></div>
          </div>
          
          <p className="main-subtitle" style={{ marginTop: '20px', marginBottom: '30px' }}>
            애니메이션을 선택하세요
          </p>

          <div className="animation-list">
            {availableAnimations.map((animation) => (
              <button
                key={animation.id}
                onClick={() => onSelectAnimation(animation)}
                className="animation-card"
              >
                <div className="animation-card-content">
                  <div className="animation-name">{animation.name}</div>
                  <div className="animation-name-japanese">{animation.nameJapanese}</div>
                  <div className="animation-word-count">
                    {animation.words.length}개 단어
                  </div>
                </div>
              </button>
            ))}
          </div>

          {availableAnimations.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
              준비된 애니메이션이 없습니다
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnimationSelectPage
