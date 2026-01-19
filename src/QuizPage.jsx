import { useState, useEffect, useRef, useMemo } from 'react'
import './App.css'
import { vocabulary, shuffleArray } from './vocabulary'
import { updateMasteryOnAnswer, isWordDueForReview, isNewWord, getReviewIntervalMessage, getWordMasteryData, REVIEW_INTERVALS } from './spacedRepetition'
import { synthesizeSpeech } from './firebase'

function QuizPage({ quizWords, onComplete }) {
  // 랜덤하게 섞인 단어 배열 생성
  const [quizData] = useState(() => shuffleArray(quizWords))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [wrongAnswers, setWrongAnswers] = useState([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [reviewTimeMessage, setReviewTimeMessage] = useState('')
  const [flippedOptions, setFlippedOptions] = useState(new Set()) // 정답 화면에서 뒤집힌 보기들
  const timeoutRefs = useRef({})
  const speechSynthesisHandlerRef = useRef(null)
  const questionStartTimeRef = useRef(Date.now()) // 문제 시작 시간
  const preloadedAudioRef = useRef(null) // 미리 로드된 오디오

  const currentQuiz = quizData[currentIndex]
  const isLastQuiz = currentIndex === quizData.length - 1

  // 현재 단어가 복습 단어인지 확인
  const isReviewWord = useMemo(() => {
    if (!currentQuiz) return false
    return isWordDueForReview(currentQuiz) && !isNewWord(currentQuiz)
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
    setReviewTimeMessage('')
    questionStartTimeRef.current = Date.now() // 첫 문제 시작 시간 초기화
  }, [])

  // 컴포넌트 언마운트 시 모든 timeout 및 리소스 정리
  useEffect(() => {
    return () => {
      // speechSynthesis 정리
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        if (speechSynthesisHandlerRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
          speechSynthesisHandlerRef.current = null
        }
      }

      // 미리 로드된 오디오 정리
      if (preloadedAudioRef.current) {
        if (preloadedAudioRef.current.audioUrl) {
          URL.revokeObjectURL(preloadedAudioRef.current.audioUrl)
        }
        preloadedAudioRef.current = null
      }
    }
  }, [])

  // 문제가 변경되면 상태 초기화 및 발음 미리 로드
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

      // Google Cloud TTS 오디오도 중지
      if (speechSynthesisHandlerRef.current?.audio) {
        speechSynthesisHandlerRef.current.audio.pause()
        speechSynthesisHandlerRef.current.audio = null
      }

      // 이전 문제의 미리 로드된 오디오 정리
      if (preloadedAudioRef.current) {
        if (preloadedAudioRef.current.audioUrl) {
          URL.revokeObjectURL(preloadedAudioRef.current.audioUrl)
        }
        preloadedAudioRef.current = null
      }

      setSelectedAnswer(null)
      setWrongAnswers([])
      setHasAnswered(false)
      setReviewTimeMessage('')
      setFlippedOptions(new Set()) // 뒤집힌 보기들 초기화
      questionStartTimeRef.current = Date.now() // 문제 시작 시간 초기화
    }

    // 현재 문제의 발음 미리 로드
    if (currentQuiz) {
      preloadAudio(currentQuiz.example)
    }
  }, [currentIndex, currentQuiz])


  const handleNext = () => {
    if (currentIndex < quizData.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // 모든 문제 완료
      onComplete(quizData)
    }
  }

  const handleAnswerSelect = (option) => {
    // 정답 화면에서 보기를 클릭한 경우
    if (hasAnswered) {
      const isCorrect = option.romaji === currentQuiz.romaji
      if (!isCorrect) {
        // 정답이 아닌 보기를 클릭하면 단어 정보 표시 (뒤집힌 상태 유지)
        const isFlipped = flippedOptions.has(option.romaji)
        if (!isFlipped) {
          // 아직 뒤집히지 않은 경우에만 뒤집기
          setFlippedOptions(prev => new Set([...prev, option.romaji]))
        }
      }
      // 정답이든 아니든 클릭하면 발음 재생
      speakText(option.hiragana)
      return
    }

    const isCorrect = option.romaji === currentQuiz.romaji
    const answerTimeMs = Date.now() - questionStartTimeRef.current // 답변 시간 (밀리초)
    const answerTimeSeconds = answerTimeMs / 1000 // 답변 시간 (초)

    if (isCorrect) {
      // 정답을 맞춘 경우
      setSelectedAnswer(option.romaji)
      setHasAnswered(true)

      // 정답 패턴 판단:
      // - 오답 1회 이상 선택 후 정답 선택: 'wrong'
      // - 5초 이내 정답 선택: 'quick' (빠름)
      // - 5~10초 이내 정답 선택: 'moderate' (보통)
      // - 10초 이후 정답 선택: 'slow' (망설임)
      let answerType
      if (wrongAnswers.length >= 1) {
        answerType = 'wrong'
      } else if (answerTimeSeconds <= 5) {
        answerType = 'quick'
      } else if (answerTimeSeconds <= 10) {
        answerType = 'moderate'
      } else {
        answerType = 'slow'
      }

      // 숙련도 업데이트 (정답을 맞춘 경우)
      const masteryData = updateMasteryOnAnswer(currentQuiz, answerType, answerTimeMs, true)

      // 복습 간격 메시지 설정
      const reviewTimeText = getReviewIntervalMessage(masteryData.currentInterval)
      setReviewTimeMessage(reviewTimeText)

      // TTS로 예문 읽기
      speakText(currentQuiz.example)
    } else {
      // 오답인 경우 빨간색 표시만 하고 계속 선택 가능하게
      if (!wrongAnswers.includes(option.romaji)) {
        setWrongAnswers([...wrongAnswers, option.romaji])
      }
    }
  }

  const handleDontKnow = () => {
    if (hasAnswered) return

    // 정답 공개
    setSelectedAnswer(currentQuiz.romaji)
    setHasAnswered(true)

    // 숙련도 업데이트 (모르겠음 = wrong 처리, 정답을 맞춘 것이 아니므로 false)
    const answerTime = Date.now() - questionStartTimeRef.current
    const masteryData = updateMasteryOnAnswer(currentQuiz, 'wrong', answerTime, false)

    // 복습 간격 메시지 설정
    const reviewTimeText = getReviewIntervalMessage(masteryData.currentInterval)
    setReviewTimeMessage(reviewTimeText)

    // TTS로 예문 읽기
    speakText(currentQuiz.example)
  }

  // 발음 미리 로드 함수
  const preloadAudio = async (text) => {
    if (!text) return

    const textToSpeak = text.trim()
    if (!textToSpeak) return

    try {
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

      // 오디오 URL 생성 및 저장
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      // 미리 로드된 오디오 저장
      preloadedAudioRef.current = {
        audio,
        audioUrl,
        text: textToSpeak
      }
    } catch (error) {
      console.error('발음 미리 로드 오류:', error)
      // 오류 발생 시 preloadedAudioRef를 null로 설정하여 기존 방식으로 폴백
      preloadedAudioRef.current = null
    }
  }

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

      // 미리 로드된 오디오가 있고 텍스트가 일치하는지 확인
      if (preloadedAudioRef.current &&
          preloadedAudioRef.current.text === textToSpeak &&
          preloadedAudioRef.current.audioUrl) {
        // 미리 로드된 오디오 URL로 새 Audio 인스턴스 생성
        const audio = new Audio(preloadedAudioRef.current.audioUrl)

        // 재생 완료 시 리소스 정리 (원본은 유지)
        audio.onended = () => {
          if (speechSynthesisHandlerRef.current) {
            speechSynthesisHandlerRef.current.audio = null
          }
        }

        audio.onerror = (error) => {
          console.error('오디오 재생 오류:', error)
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
          return // 성공적으로 재생되면 종료
        } catch (playError) {
          console.error('오디오 재생 시작 오류:', playError)
          // 재생 실패 시 Web Speech API로 폴백
          fallbackToWebSpeech(textToSpeak)
          return
        }
      }

      // 미리 로드된 오디오가 없는 경우 기존 방식으로 API 호출
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

  // 예문에 한자 위에 히라가나 루비 추가 (정답 표시 시 해당 단어 색칠)
  // exampleRuby: [{ '青': 'あお' }, { '空': 'そら' }] 형태 사용
  const addRubyToExample = (example, exampleRuby, kanji, hiragana) => {
    if (!example) return null

    const result = []
    let exampleIndex = 0

    // example에서 kanji 위치 찾기 (정답 단어 하이라이트용)
    const kanjiStartIndex = kanji ? example.indexOf(kanji) : -1
    const kanjiEndIndex = kanjiStartIndex !== -1 ? kanjiStartIndex + kanji.length : -1

    // kanji가 없는 경우 example에서 hiragana 위치 찾기
    const hiraganaStartIndex = !kanji && hiragana ? example.indexOf(hiragana) : -1
    const hiraganaEndIndex = hiraganaStartIndex !== -1 ? hiraganaStartIndex + hiragana.length : -1

    // exampleRuby 배열을 맵으로 변환하여 빠른 검색 가능하게 함
    const rubyMap = new Map()
    if (Array.isArray(exampleRuby)) {
      exampleRuby.forEach(rubyObj => {
        Object.entries(rubyObj).forEach(([kanjiText, hiraganaText]) => {
          rubyMap.set(kanjiText, hiraganaText)
        })
      })
    }

    while (exampleIndex < example.length) {
      let matched = false

      // exampleRuby에서 가장 긴 한자부터 매칭 시도 (긴 한자가 우선)
      const sortedRubyEntries = Array.from(rubyMap.entries()).sort((a, b) => b[0].length - a[0].length)

      for (const [kanjiText, hiraganaText] of sortedRubyEntries) {
        if (example.substring(exampleIndex).startsWith(kanjiText)) {
          // 정답 단어인지 확인
          const isKanjiInTarget = kanjiStartIndex !== -1 &&
            exampleIndex >= kanjiStartIndex && exampleIndex < kanjiEndIndex

          // 루비 태그 추가
          result.push(
            <ruby key={exampleIndex} className={isKanjiInTarget ? 'highlighted-word' : ''}>
              {kanjiText}
              <rt className={isKanjiInTarget ? 'highlighted-reading' : ''}>{hiraganaText}</rt>
            </ruby>
          )

          exampleIndex += kanjiText.length
          matched = true
          break
        }
      }

      if (!matched) {
        // 한자가 아닌 문자 처리
        const char = example[exampleIndex]
        const isInKanjiTarget = kanjiStartIndex !== -1 &&
          exampleIndex >= kanjiStartIndex && exampleIndex < kanjiEndIndex
        const isInHiraganaTarget = hiraganaStartIndex !== -1 &&
          exampleIndex >= hiraganaStartIndex && exampleIndex < hiraganaEndIndex

        result.push(
          <span key={exampleIndex} className={isInKanjiTarget || isInHiraganaTarget ? 'highlighted-word' : ''}>
            {char}
          </span>
        )
        exampleIndex++
      }
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
  // exampleRuby: [{ '青': 'あお' }, { '空': 'そら' }] 형태 사용
  const getExampleWithBlank = (example, kanji, exampleRuby, hiragana) => {
    if (!example) return null

    const result = []
    let exampleIndex = 0

    const hasKanji = kanji && kanji.length > 0
    const kanjiIndex = hasKanji ? example.indexOf(kanji) : -1
    const hiraganaIndexInExample = !hasKanji && hiragana && hiragana.length > 0
      ? example.indexOf(hiragana)
      : -1

    // exampleRuby 배열을 맵으로 변환하여 빠른 검색 가능하게 함
    const rubyMap = new Map()
    if (Array.isArray(exampleRuby)) {
      exampleRuby.forEach(rubyObj => {
        Object.entries(rubyObj).forEach(([kanjiText, hiraganaText]) => {
          rubyMap.set(kanjiText, hiraganaText)
        })
      })
    }

    while (exampleIndex < example.length) {
      // 정답 단어 위치인지 확인
      if (hasKanji && exampleIndex === kanjiIndex && kanjiIndex !== -1) {
        result.push(<span key={exampleIndex} className="blank">____</span>)
        exampleIndex += kanji.length
        continue
      }

      if (!hasKanji && exampleIndex === hiraganaIndexInExample && hiraganaIndexInExample !== -1 && hiragana && hiragana.length > 0) {
        result.push(<span key={exampleIndex} className="blank">____</span>)
        exampleIndex += hiragana.length
        continue
      }

      let matched = false

      // exampleRuby에서 가장 긴 한자부터 매칭 시도 (긴 한자가 우선)
      const sortedRubyEntries = Array.from(rubyMap.entries()).sort((a, b) => b[0].length - a[0].length)

      for (const [kanjiText, hiraganaText] of sortedRubyEntries) {
        if (example.substring(exampleIndex).startsWith(kanjiText)) {
          // 루비 태그 추가
          result.push(
            <ruby key={exampleIndex}>
              {kanjiText}
              <rt>{hiraganaText}</rt>
            </ruby>
          )

          exampleIndex += kanjiText.length
          matched = true
          break
        }
      }

      if (!matched) {
        // 한자가 아닌 문자 처리
        const char = example[exampleIndex]
        result.push(<span key={exampleIndex}>{char}</span>)
        exampleIndex++
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
          {!hasAnswered && isReviewWord && (
            <div className="review-badge">복습</div>
          )}
          {hasAnswered && reviewTimeMessage && (
            <div className="review-badge">{reviewTimeMessage} 복습</div>
          )}
          {hasAnswered && (
            <button
              onClick={() => speakText(currentQuiz.example)}
              className="speaker-icon-button"
              aria-label="예문 발음 듣기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" fill="currentColor"/>
              </svg>
            </button>
          )}
          <div className="example-japanese">
            {hasAnswered
              ? addRubyToExample(currentQuiz.example, currentQuiz.exampleRuby, currentQuiz.kanji, currentQuiz.hiragana)
              : getExampleWithBlank(currentQuiz.example, currentQuiz.kanji, currentQuiz.exampleRuby, currentQuiz.hiragana)
            }
          </div>
          <div className="example-korean">{currentQuiz.exampleKorean}</div>
        </div>

        <div className="options-section">
          <div className="options-container">
            {options.map((option, index) => {
              const isCorrect = option.romaji === currentQuiz.romaji
              const isWrong = wrongAnswers.includes(option.romaji)
              const isSelected = hasAnswered && selectedAnswer === option.romaji
              const isFlipped = hasAnswered && (isCorrect || flippedOptions.has(option.romaji))

              let buttonClass = 'option-button'
              if (hasAnswered) {
                if (isCorrect) {
                  buttonClass += ' correct'
                }
                // 정답 화면에서는 오답 표시 제거
              } else if (isWrong) {
                buttonClass += ' incorrect'
              }

              return (
                <div
                  key={`${option.romaji}-${index}`}
                  className={`option-wrapper ${isFlipped ? 'flipped' : ''}`}
                >
                  <div className="option-card-inner">
                    <div className="option-card-front">
                      <button
                        onClick={() => handleAnswerSelect(option)}
                        className={buttonClass}
                      >
                        {option.hiragana}
                      </button>
                    </div>
                    <div className={`option-card-back ${hasAnswered && isCorrect ? 'correct' : ''}`} onClick={() => hasAnswered && speakText(option.hiragana)} style={{ cursor: hasAnswered ? 'pointer' : 'default' }}>
                      <div className="option-word-info-content">
                        {option.kanji && <div className="option-word-kanji">{option.kanji}</div>}
                        <div className="option-word-hiragana">{option.hiragana}</div>
                        <div className="option-word-korean">{option.korean}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="button-group">
          {hasAnswered ? (
            <>
              {!isLastQuiz && (
                <button onClick={handleNext} className="next-button full-width">
                  다음 문제
                </button>
              )}
              {isLastQuiz && (
                <button onClick={handleNext} className="next-button full-width">
                  완료
                </button>
              )}
            </>
          ) : (
            <button onClick={handleDontKnow} className="dont-know-button">
              모르겠어요
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default QuizPage
