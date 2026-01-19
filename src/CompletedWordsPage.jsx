import { useState, useEffect, useRef } from 'react'
import './App.css'
import { vocabulary } from './vocabulary'
import { getAllWordsByInterval } from './spacedRepetition'
import { synthesizeSpeech } from './firebase'

function CompletedWordsPage({ onBack }) {
  const [intervalGroups, setIntervalGroups] = useState([])
  const [selectedWord, setSelectedWord] = useState(null)
  const speechSynthesisHandlerRef = useRef(null)

  useEffect(() => {
    // 모든 단어를 복습주기별로 그룹화 (새 단어 제외)
    const groups = getAllWordsByInterval(vocabulary)
    const filteredGroups = groups.filter(group => group.interval !== null)
    setIntervalGroups(filteredGroups)
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

  const speakText = async (text) => {
    if (!text) return

    try {
      // 기존 재생 중지
      if (speechSynthesisHandlerRef.current?.audio) {
        speechSynthesisHandlerRef.current.audio.pause()
        speechSynthesisHandlerRef.current.audio = null
      }

      // 텍스트가 비어있지 않은지 확인
      const textToSpeak = text.trim()
      if (!textToSpeak) return

      // Google Cloud TTS API 호출
      const result = await synthesizeSpeech({
        text: textToSpeak,
        languageCode: 'ja-JP',
        voiceName: 'ja-JP-Neural2-B' // 일본어 여성 음성 (A, B: 여성 / C, D: 남성)
      })

      // Base64 디코딩
      const audioContent = result.data.audioContent
      const audioBlob = new Blob([
        Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))
      ], { type: 'audio/mp3' })

      // 오디오 재생
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      // 재생 완료 시 리소스 정리
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        if (speechSynthesisHandlerRef.current) {
          speechSynthesisHandlerRef.current.audio = null
        }
      }

      audio.onerror = (error) => {
        console.error('오디오 재생 오류:', error)
        URL.revokeObjectURL(audioUrl)
        if (speechSynthesisHandlerRef.current) {
          speechSynthesisHandlerRef.current.audio = null
        }
        // 오류 발생 시 기존 Web Speech API로 폴백
        fallbackToWebSpeech(textToSpeak)
      }

      // 현재 재생 중인 오디오 저장
      speechSynthesisHandlerRef.current = { audio }

      // 오디오 재생 (Promise 처리)
      try {
        await audio.play()
      } catch (playError) {
        console.error('오디오 재생 시작 오류:', playError)
        // 재생 실패 시 Web Speech API로 폴백
        fallbackToWebSpeech(textToSpeak)
      }
    } catch (error) {
      console.error('TTS API 호출 오류:', error)
      // 오류 발생 시 기존 Web Speech API로 폴백
      fallbackToWebSpeech(text.trim())
    }
  }

  // Web Speech API 폴백 함수
  const fallbackToWebSpeech = (text) => {
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
      utterance.rate = 0.85
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // 에러 핸들러 추가
      utterance.onerror = () => {
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

  // 단어의 한자에 루비를 추가하는 함수 (예문/보기와 동일한 로직)
  const addRubyToWord = (kanji, exampleRuby) => {
    if (!kanji) return null

    const result = []
    let index = 0

    // exampleRuby 배열을 맵으로 변환하여 빠른 검색 가능하게 함
    const rubyMap = new Map()
    if (Array.isArray(exampleRuby)) {
      exampleRuby.forEach(rubyObj => {
        Object.entries(rubyObj).forEach(([kanjiText, hiraganaText]) => {
          rubyMap.set(kanjiText, hiraganaText)
        })
      })
    }

    while (index < kanji.length) {
      let matched = false

      // exampleRuby에서 가장 긴 한자부터 매칭 시도 (긴 한자가 우선)
      const sortedRubyEntries = Array.from(rubyMap.entries()).sort((a, b) => b[0].length - a[0].length)

      for (const [kanjiText, hiraganaText] of sortedRubyEntries) {
        if (kanji.substring(index).startsWith(kanjiText)) {
          // 루비 태그 추가
          result.push(
            <ruby key={index}>
              {kanjiText}
              <rt>{hiraganaText}</rt>
            </ruby>
          )

          index += kanjiText.length
          matched = true
          break
        }
      }

      if (!matched) {
        // 한자가 아닌 문자 처리
        const char = kanji[index]
        result.push(
          <span key={index}>{char}</span>
        )
        index++
      }
    }

    return <>{result}</>
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
            공부한 단어
            <span className="title-emoji">🍙</span>
          </h1>
          <p className="hint-text">터치해서 뒤집어보세요!</p>

          {intervalGroups.length === 0 ? (
            <div className="empty-message">
              학습한 단어가 없습니다.
            </div>
          ) : (
            intervalGroups.map((group, groupIndex) => (
              <div key={groupIndex} style={{ marginBottom: '30px' }}>
                <h2 className="result-section-title" style={{ marginBottom: '15px' }}>
                  {group.label} 복습 ({group.words.length}개)
                </h2>
                <div className="words-grid">
                  {group.words.map((word, index) => {
                    const isFlipped = selectedWord?.romaji === word.romaji
                    return (
                      <div
                        key={`${groupIndex}-${index}`}
                        className={`word-card-container ${isFlipped ? 'flipped' : ''}`}
                        onClick={() => handleCardClick(word)}
                      >
                        <div className="word-card">
                          <div className="word-card-front">
                            <div className="word-card-kanji">{word.kanji || word.hiragana}</div>
                          </div>
                          <div className="word-card-back">
                            <div className="word-card-kanji">
                              {word.kanji ? (
                                addRubyToWord(word.kanji, word.exampleRuby) || word.kanji
                              ) : (
                                word.hiragana
                              )}
                            </div>
                            <div className="word-card-korean">{word.korean}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default CompletedWordsPage

