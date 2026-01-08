import { useState, useEffect, useRef } from 'react'
import './App.css'

const STORAGE_KEYS = {
  COMPLETED_WORDS: 'mogumogu_completed_words',
  OPTION_DISPLAY_MODE: 'mogumogu_option_display_mode'
}

function CompletedWordsPage({ onBack }) {
  const [completedWords, setCompletedWords] = useState([])
  const [selectedWord, setSelectedWord] = useState(null)
  const [optionDisplayMode, setOptionDisplayMode] = useState('hiragana')
  const speechSynthesisHandlerRef = useRef(null)

  useEffect(() => {
    // 보기 표시 방식 불러오기 (기본값: hiragana)
    const savedDisplayMode = localStorage.getItem(STORAGE_KEYS.OPTION_DISPLAY_MODE) || 'hiragana'
    setOptionDisplayMode(savedDisplayMode)

    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    setCompletedWords(savedCompletedWords)
  }, [])

  // 컴포넌트 언마운트 시 speechSynthesis 정리
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        if (speechSynthesisHandlerRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
          speechSynthesisHandlerRef.current = null
        }
      }
    }
  }, [])

  const speakText = (text) => {
    if ('speechSynthesis' in window && text) {
      // 기존 재생 중지 및 이전 핸들러 제거
      window.speechSynthesis.cancel()
      if (speechSynthesisHandlerRef.current) {
        window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
        speechSynthesisHandlerRef.current = null
      }

      // 사용 가능한 일본어 음성 찾기
      const voices = window.speechSynthesis.getVoices()
      const japaneseVoice = voices.find(voice =>
        voice.lang.startsWith('ja') &&
        (voice.name.includes('Google') ||
          voice.name.includes('Microsoft') ||
          voice.name.includes('Kyoko') ||
          voice.name.includes('Sora') ||
          voice.name.includes('Yuna'))
      ) || voices.find(voice => voice.lang.startsWith('ja'))

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'ja-JP'

      if (japaneseVoice) {
        utterance.voice = japaneseVoice
      }

      // 음성 품질 개선 설정
      utterance.rate = 0.85  // 약간 빠른 속도로 자연스럽게
      utterance.pitch = 1.0   // 기본 피치
      utterance.volume = 1.0  // 최대 볼륨

      // 에러 핸들러 추가 (무한 호출 방지)
      utterance.onerror = () => {
        // 에러 발생 시 재시도하지 않음
        if (speechSynthesisHandlerRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
          speechSynthesisHandlerRef.current = null
        }
      }

      // 완료 시 핸들러 정리
      utterance.onend = () => {
        if (speechSynthesisHandlerRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
          speechSynthesisHandlerRef.current = null
        }
      }

      // 음성이 로드되지 않았을 경우 대기
      if (voices.length === 0) {
        // 한 번만 실행되도록 핸들러 사용
        const voicesChangedHandler = () => {
          const updatedVoices = window.speechSynthesis.getVoices()
          if (updatedVoices.length > 0) {
            const updatedJapaneseVoice = updatedVoices.find(voice =>
              voice.lang.startsWith('ja') &&
              (voice.name.includes('Google') ||
                voice.name.includes('Microsoft') ||
                voice.name.includes('Kyoko') ||
                voice.name.includes('Sora') ||
                voice.name.includes('Yuna'))
            ) || updatedVoices.find(voice => voice.lang.startsWith('ja'))

            if (updatedJapaneseVoice) {
              utterance.voice = updatedJapaneseVoice
            }
            window.speechSynthesis.speak(utterance)
            // 핸들러 제거 (한 번만 실행)
            if (speechSynthesisHandlerRef.current) {
              window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
              speechSynthesisHandlerRef.current = null
            }
          }
        }
        speechSynthesisHandlerRef.current = voicesChangedHandler
        window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler)
      } else {
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  const handleCardClick = (word) => {
    if (selectedWord?.romaji === word.romaji) {
      setSelectedWord(null)
    } else {
      setSelectedWord(word)
      // 카드 뒤집을 때 발음 읽기 (퀴즈 페이지와 동일한 품질)
      speakText(word.hiragana)
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
                        <div className="word-card-kanji">{word.kanji || word.hiragana}</div>
                      </div>
                      <div className="word-card-back">
                        <div className="word-card-kanji">{word.kanji || word.hiragana}</div>
                        <div className="word-card-romaji">{optionDisplayMode === 'romaji' ? word.romaji : word.hiragana}</div>
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

