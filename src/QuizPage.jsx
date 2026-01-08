import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import { vocabulary, shuffleArray } from './vocabulary'

// localStorage 키
const STORAGE_KEYS = {
  REVIEW_WORDS: 'mogumogu_review_words',
  COMPLETED_WORDS: 'mogumogu_completed_words',
  OPTION_DISPLAY_MODE: 'mogumogu_option_display_mode'
}

function QuizPage({ quizWords, onComplete }) {
  // 랜덤하게 섞인 단어 배열 생성
  const [quizData] = useState(() => shuffleArray(quizWords))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [showReviewNotification, setShowReviewNotification] = useState(false)
  const timeoutRefs = useRef({})
  const speechSynthesisHandlerRef = useRef(null)

  const currentQuiz = quizData[currentIndex]
  const isLastQuiz = currentIndex === quizData.length - 1

  // 보기 표시 방식 가져오기 (기본값: hiragana)
  const optionDisplayMode = useMemo(() => {
    return localStorage.getItem(STORAGE_KEYS.OPTION_DISPLAY_MODE) || 'hiragana'
  }, [currentIndex])

  // 현재 단어가 복습 단어인지 확인
  const isReviewWord = useMemo(() => {
    if (!currentQuiz) return false
    const savedReviewWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEW_WORDS) || '[]')
    return savedReviewWords.some(w => w.romaji === currentQuiz.romaji)
  }, [currentQuiz])

  // 같은 품사 내에서 보기 생성
  const options = useMemo(() => {
    if (!currentQuiz || !currentQuiz.partOfSpeech) return []
    
    // 같은 품사를 가진 단어들 필터링
    const samePartOfSpeechWords = vocabulary.filter(
      word => word.partOfSpeech === currentQuiz.partOfSpeech && word.romaji !== currentQuiz.romaji
    )
    
    // 정답 포함하여 4개 선택
    const selectedOptions = []
    const selectedRomaji = new Set()
    selectedOptions.push(currentQuiz) // 정답 추가
    selectedRomaji.add(currentQuiz.romaji) // 정답 romaji 추가
    
    // 나머지 3개를 같은 품사에서 랜덤하게 선택 (중복 방지)
    const shuffled = shuffleArray(samePartOfSpeechWords)
    for (let i = 0; i < shuffled.length && selectedOptions.length < 4; i++) {
      const word = shuffled[i]
      // 이미 선택된 romaji가 아닌 경우만 추가
      if (!selectedRomaji.has(word.romaji)) {
        selectedOptions.push(word)
        selectedRomaji.add(word.romaji)
      }
    }
    
    // 보기 섞기
    return shuffleArray(selectedOptions)
  }, [currentQuiz])

  // 퀴즈 페이지 진입 시 상태 초기화
  useEffect(() => {
    setSelectedAnswer(null)
    setWrongAnswers([])
    setHasAnswered(false)
    setShowReviewNotification(false)
  }, [])

  // 컴포넌트 언마운트 시 모든 timeout 및 리소스 정리
  useEffect(() => {
    return () => {
      // 모든 timeout 정리
      if (timeoutRefs.current.notification) {
        clearTimeout(timeoutRefs.current.notification)
      }
      // speechSynthesis 정리
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        if (speechSynthesisHandlerRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
          speechSynthesisHandlerRef.current = null
        }
      }
    }
  }, [])

  // 문제가 변경되면 상태 초기화
  useEffect(() => {
    if (currentIndex > 0 || selectedAnswer !== null || hasAnswered) {
      // speechSynthesis 정리
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        if (speechSynthesisHandlerRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
          speechSynthesisHandlerRef.current = null
        }
      }

      setSelectedAnswer(null)
      setWrongAnswers([])
      setHasAnswered(false)
      setShowReviewNotification(false)

      // timeout 정리
      if (timeoutRefs.current.notification) {
        clearTimeout(timeoutRefs.current.notification)
        timeoutRefs.current.notification = null
      }
    }
  }, [currentIndex])

  // 정답 처리 및 저장 로직
  const processCorrectAnswer = (quiz) => {
    // 복습 리스트에서 제거 (복습 대상이었던 경우)
    removeFromReviewWords(quiz)
    // completed에 추가
    saveToCompletedWords(quiz)
  }

  // 로컬 스토리지에 복습 단어 저장
  const saveToReviewWords = (word) => {
    const savedReviewWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEW_WORDS) || '[]')
    const reviewRomajiSet = new Set(savedReviewWords.map(w => w.romaji))

    // 이미 복습 리스트에 없으면 추가
    if (!reviewRomajiSet.has(word.romaji)) {
      const newReviewWords = [...savedReviewWords, word]
      localStorage.setItem(STORAGE_KEYS.REVIEW_WORDS, JSON.stringify(newReviewWords))
    }
  }

  // 복습 리스트에서 단어 제거
  const removeFromReviewWords = (word) => {
    const savedReviewWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEW_WORDS) || '[]')
    const filteredReviewWords = savedReviewWords.filter(w => w.romaji !== word.romaji)
    localStorage.setItem(STORAGE_KEYS.REVIEW_WORDS, JSON.stringify(filteredReviewWords))
  }

  // 로컬 스토리지에 완료된 단어 저장
  const saveToCompletedWords = (word) => {
    const savedCompletedWords = JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_WORDS) || '[]')
    const completedRomajiSet = new Set(savedCompletedWords.map(w => w.romaji))

    // 이미 저장되지 않은 경우만 추가
    if (!completedRomajiSet.has(word.romaji)) {
      const newCompletedWords = [...savedCompletedWords, word]
      localStorage.setItem(STORAGE_KEYS.COMPLETED_WORDS, JSON.stringify(newCompletedWords))
    }
  }

  const handleNext = () => {
    if (currentIndex < quizData.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // 모든 문제 완료
      onComplete(quizData)
    }
  }

  const handleAnswerSelect = (option) => {
    if (hasAnswered) return

    const isCorrect = option.romaji === currentQuiz.romaji

    if (isCorrect) {
      // 정답을 맞춘 경우
      setSelectedAnswer(option.romaji)
      setHasAnswered(true)
      
      // 오답을 선택한 적이 있으면 복습 대상에 추가
      if (wrongAnswers.length > 0) {
        saveToReviewWords(currentQuiz)
        setShowReviewNotification(true)
        timeoutRefs.current.notification = setTimeout(() => {
          setShowReviewNotification(false)
          timeoutRefs.current.notification = null
        }, 3000)
      } else {
        // 오답 없이 바로 정답을 맞춘 경우에만 completed에 추가
        processCorrectAnswer(currentQuiz)
      }
      
      // TTS로 예문 읽기
      speakText(currentQuiz.exampleHiragana || currentQuiz.example)
    } else {
      // 오답인 경우 빨간색 표시만 하고 계속 선택 가능하게
      if (!wrongAnswers.includes(option.romaji)) {
        setWrongAnswers([...wrongAnswers, option.romaji])
      }
    }
  }

  const handleDontKnow = () => {
    if (hasAnswered) return

    // 복습 대상에 추가
    saveToReviewWords(currentQuiz)
    
    // 정답 공개
    setSelectedAnswer(currentQuiz.romaji)
    setHasAnswered(true)
    
    // 복습 대상 추가 알림 표시
    setShowReviewNotification(true)
    timeoutRefs.current.notification = setTimeout(() => {
      setShowReviewNotification(false)
      timeoutRefs.current.notification = null
    }, 3000)
    
    // TTS로 예문 읽기
    speakText(currentQuiz.exampleHiragana || currentQuiz.example)
  }

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

  // 예문에 한자 위에 히라가나 루비 추가 (정답 표시 시 해당 단어 색칠)
  const addRubyToExample = (example, exampleHiragana, kanji, hiragana) => {
    const result = []
    let exampleIndex = 0
    let hiraganaIndex = 0
    let prevExampleIndex = exampleIndex
    let iterationCount = 0
    const maxIterations = example.length * 2
    
    // 해당 단어의 위치 찾기
    const hasKanji = kanji && kanji.length > 0
    const kanjiIndex = hasKanji ? example.indexOf(kanji) : -1
    const hiraganaIndexInExample = !hasKanji && hiragana && hiragana.length > 0 
      ? example.indexOf(hiragana) 
      : -1
    const targetStartIndex = hasKanji ? kanjiIndex : hiraganaIndexInExample
    const targetEndIndex = hasKanji 
      ? (kanjiIndex !== -1 ? kanjiIndex + kanji.length : -1)
      : (hiraganaIndexInExample !== -1 ? hiraganaIndexInExample + hiragana.length : -1)

    while (exampleIndex < example.length && iterationCount < maxIterations) {
      iterationCount++
      const exampleChar = example[exampleIndex]
      const isKanji = /[\u4e00-\u9faf]/.test(exampleChar)

      if (isKanji) {
        let kanjiStart = exampleIndex
        let kanjiEnd = exampleIndex + 1
        while (kanjiEnd < example.length && /[\u4e00-\u9faf]/.test(example[kanjiEnd])) {
          kanjiEnd++
        }

        const kanjiGroup = example.substring(kanjiStart, kanjiEnd)
        let hiraganaStart = hiraganaIndex
        let hiraganaEnd = hiraganaStart
        const nextNonKanjiIndex = kanjiEnd < example.length ? kanjiEnd : example.length
        const nextNonKanjiChar = nextNonKanjiIndex < example.length ? example[nextNonKanjiIndex] : null
        let prevHiraganaEnd = hiraganaEnd

        while (hiraganaEnd < exampleHiragana.length) {
          const hiraganaChar = exampleHiragana[hiraganaEnd]
          if (!/[\u3040-\u309f\u30a0-\u30ff]/.test(hiraganaChar)) {
            if (nextNonKanjiChar && hiraganaChar === nextNonKanjiChar) {
              break
            }
            if (!nextNonKanjiChar) {
              break
            }
            hiraganaEnd++
          } else {
            hiraganaEnd++
            if (nextNonKanjiChar && hiraganaEnd < exampleHiragana.length) {
              if (exampleHiragana[hiraganaEnd] === nextNonKanjiChar) {
                break
              }
            }
          }
          
          if (hiraganaEnd === prevHiraganaEnd) {
            break
          }
          prevHiraganaEnd = hiraganaEnd
        }

        const hiraganaGroup = exampleHiragana.substring(hiraganaStart, hiraganaEnd)
        
        // 해당 단어 부분인지 확인하여 색칠
        const isTargetWord = targetStartIndex !== -1 && 
          kanjiStart >= targetStartIndex && kanjiStart < targetEndIndex

        if (hiraganaGroup) {
          result.push(
            <ruby key={exampleIndex} className={isTargetWord ? 'highlighted-word' : ''}>
              {kanjiGroup}
              <rt className={isTargetWord ? 'highlighted-reading' : ''}>{hiraganaGroup}</rt>
            </ruby>
          )
          hiraganaIndex = hiraganaEnd
        } else {
          const isTargetWord = targetStartIndex !== -1 && 
            kanjiStart >= targetStartIndex && kanjiStart < targetEndIndex
          result.push(
            <span key={exampleIndex} className={isTargetWord ? 'highlighted-word' : ''}>
              {kanjiGroup}
            </span>
          )
        }

        exampleIndex = Math.max(kanjiEnd, exampleIndex + 1)
      } else {
        // 해당 단어 부분인지 확인하여 색칠
        const isTargetWord = targetStartIndex !== -1 && 
          exampleIndex >= targetStartIndex && exampleIndex < targetEndIndex
        
        result.push(
          <span key={exampleIndex} className={isTargetWord ? 'highlighted-word' : ''}>
            {exampleChar}
          </span>
        )

        if (hiraganaIndex < exampleHiragana.length) {
          if (exampleHiragana[hiraganaIndex] === exampleChar) {
            hiraganaIndex++
          } else {
            const isKatakana = /[\u30a0-\u30ff]/.test(exampleChar)
            const isHiragana = /[\u3040-\u309f]/.test(exampleChar)

            if ((isKatakana || isHiragana) && /[\u3040-\u309f]/.test(exampleHiragana[hiraganaIndex])) {
              hiraganaIndex++
            } else if (isHiragana && exampleHiragana[hiraganaIndex] !== exampleChar) {
              hiraganaIndex++
            }
          }
        }

        exampleIndex++
      }
      
      if (exampleIndex === prevExampleIndex) {
        exampleIndex++
      }
      prevExampleIndex = exampleIndex
    }

    return <>{result}</>
  }
  
  // 발음(romaji)에서 해당 단어 부분 색칠
  const highlightRomaji = (exampleRomaji, romaji) => {
    if (!romaji || !exampleRomaji) return exampleRomaji
    
    const index = exampleRomaji.indexOf(romaji)
    if (index === -1) return exampleRomaji
    
    const before = exampleRomaji.substring(0, index)
    const highlighted = romaji
    const after = exampleRomaji.substring(index + romaji.length)
    
    return (
      <>
        {before}
        <span className="highlighted-romaji">{highlighted}</span>
        {after}
      </>
    )
  }

  // 예문에서 해당 단어를 빈칸으로 교체하고 나머지에 루비 추가
  const getExampleWithBlank = (example, kanji, exampleHiragana, hiragana) => {
    const result = []
    let hiraganaIndex = 0
    const hasKanji = kanji && kanji.length > 0
    const kanjiIndex = hasKanji ? example.indexOf(kanji) : -1
    const hiraganaIndexInExample = !hasKanji && hiragana && hiragana.length > 0 
      ? example.indexOf(hiragana) 
      : -1

    for (let i = 0; i < example.length; i++) {
      if (hasKanji && i === kanjiIndex && kanjiIndex !== -1) {
        result.push(<span key={i} className="blank">____</span>)
        hiraganaIndex += hiragana && hiragana.length > 0 ? hiragana.length : 0
        i += Math.max(kanji.length - 1, 0)
        continue
      }
      
      if (!hasKanji && i === hiraganaIndexInExample && hiraganaIndexInExample !== -1 && hiragana && hiragana.length > 0) {
        result.push(<span key={i} className="blank">____</span>)
        hiraganaIndex += hiragana.length
        i += Math.max(hiragana.length - 1, 0)
        continue
      }

      const char = example[i]
      const isKanji = /[\u4e00-\u9faf]/.test(char)

      if (isKanji) {
        let kanjiStart = i
        let kanjiEnd = i + 1
        while (kanjiEnd < example.length && /[\u4e00-\u9faf]/.test(example[kanjiEnd])) {
          kanjiEnd++
        }

        const kanjiGroup = example.substring(kanjiStart, kanjiEnd)
        let hiraganaStart = hiraganaIndex
        let hiraganaEnd = hiraganaStart
        let prevHiraganaEnd = hiraganaEnd

        while (hiraganaEnd < exampleHiragana.length) {
          const hiraganaChar = exampleHiragana[hiraganaEnd]
          if (!/[\u3040-\u309f\u30a0-\u30ff]/.test(hiraganaChar)) {
            break
          }
          hiraganaEnd++
          if (kanjiEnd < example.length) {
            const nextChar = example[kanjiEnd]
            if (!/[\u4e00-\u9faf]/.test(nextChar)) {
              if (hiraganaEnd < exampleHiragana.length && exampleHiragana[hiraganaEnd] === nextChar) {
                break
              }
            }
          }
          
          if (hiraganaEnd === prevHiraganaEnd) {
            break
          }
          prevHiraganaEnd = hiraganaEnd
        }

        const hiraganaGroup = exampleHiragana.substring(hiraganaStart, hiraganaEnd)

        if (hiraganaGroup) {
          result.push(
            <ruby key={i}>
              {kanjiGroup}
              <rt>{hiraganaGroup}</rt>
            </ruby>
          )
          hiraganaIndex = hiraganaEnd
        } else {
          result.push(kanjiGroup)
        }

        i = kanjiEnd - 1
      } else {
        result.push(char)
        
        if (hiraganaIndex < exampleHiragana.length) {
          if (exampleHiragana[hiraganaIndex] === char) {
            hiraganaIndex++
          } else {
            const isKatakana = /[\u30a0-\u30ff]/.test(char)
            const isHiragana = /[\u3040-\u309f]/.test(char)
            const isHiraganaInExample = /[\u3040-\u309f]/.test(exampleHiragana[hiraganaIndex])
            
            if ((isKatakana || isHiragana) && isHiraganaInExample) {
              hiraganaIndex++
            }
          }
        }
      }
    }

    return <>{result}</>
  }

  if (!currentQuiz) {
    return null
  }

  return (
    <div className="app">
      <div className="quiz-container page-enter">
        <div className="top-header">
          <button onClick={() => onComplete()} className="back-chevron-button">
            <span className="chevron-icon"></span>
          </button>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentIndex + 1) / quizData.length) * 100}%` }}
              >
                <span className="progress-icon">🍙</span>
              </div>
            </div>
            <div className="progress-text">
              {currentIndex + 1} / {quizData.length}
            </div>
          </div>
        </div>

        <div className="example-section">
          {isReviewWord && (
            <div className="review-badge">복습</div>
          )}
          <div className="example-japanese">
            {hasAnswered
              ? addRubyToExample(currentQuiz.example, currentQuiz.exampleHiragana, currentQuiz.kanji, currentQuiz.hiragana)
              : getExampleWithBlank(currentQuiz.example, currentQuiz.kanji, currentQuiz.exampleHiragana, currentQuiz.hiragana)
            }
          </div>
          {optionDisplayMode === 'romaji' && (
            <div className="example-reading">
              <div className="reading-item">
                <span className="reading-label">읽는 법:</span>
                <span className="reading-text">
                  {hasAnswered 
                    ? highlightRomaji(currentQuiz.exampleRomaji, currentQuiz.romaji)
                    : currentQuiz.exampleRomaji.replace(currentQuiz.romaji, '____')
                  }
                </span>
              </div>
            </div>
          )}
          <div className="example-korean">{currentQuiz.exampleKorean}</div>
        </div>

        <div className="options-container">
          {options.map((option, index) => {
            const isSelected = selectedAnswer === option.romaji
            const isCorrect = option.romaji === currentQuiz.romaji
            const isWrong = wrongAnswers.includes(option.romaji)
            const showCorrect = hasAnswered && isCorrect
            
            let buttonClass = 'option-button'
            if (showCorrect) {
              buttonClass += ' correct'
            } else if (isWrong) {
              buttonClass += ' incorrect'
            }

            return (
              <button
                key={`${option.romaji}-${index}`}
                onClick={() => handleAnswerSelect(option)}
                disabled={hasAnswered}
                className={buttonClass}
              >
                {optionDisplayMode === 'romaji' ? option.romaji : option.hiragana}
              </button>
            )
          })}
        </div>

        <div className="button-group">
          {hasAnswered && !isLastQuiz && (
            <button onClick={handleNext} className="next-button">
              다음 문제
            </button>
          )}

          {hasAnswered && isLastQuiz && (
            <button onClick={handleNext} className="next-button">
              완료
            </button>
          )}
          
          {!hasAnswered && (
            <button onClick={handleDontKnow} className="dont-know-button">
              모르겠어요
            </button>
          )}
        </div>

        {showReviewNotification && (
          <div className="review-notification">
            다음번 퀴즈에서 복습할게요
          </div>
        )}
      </div>
    </div>
  )
}

export default QuizPage
