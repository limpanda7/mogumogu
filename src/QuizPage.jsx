import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'
import { vocabulary, shuffleArray } from './vocabulary'

// localStorage 키
const STORAGE_KEYS = {
  REVIEW_WORDS: 'mogumogu_review_words',
  COMPLETED_WORDS: 'mogumogu_completed_words'
}

function QuizPage({ quizWords, onComplete }) {
  // 랜덤하게 섞인 단어 배열 생성
  const [quizData] = useState(() => shuffleArray(quizWords))
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [isCorrect, setIsCorrect] = useState(null)
  const [showHint, setShowHint] = useState(false)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [showReviewNotification, setShowReviewNotification] = useState(false)
  const inputRef = useRef(null)
  const timeoutRefs = useRef({})
  const blurTimeoutRefs = useRef({})
  const speechSynthesisHandlerRef = useRef(null)

  const currentQuiz = quizData[currentIndex]
  const isLastQuiz = currentIndex === quizData.length - 1

  // 퀴즈 페이지 진입 시 입력 필드에 포커스 및 상태 초기화
  useEffect(() => {
    setUserAnswer('')
    setIsCorrect(null)
    setShowHint(false)
    setHasAnswered(false)
    const initialTimeout = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)

    return () => {
      clearTimeout(initialTimeout)
    }
  }, [])

  // 컴포넌트 언마운트 시 모든 timeout 및 리소스 정리
  useEffect(() => {
    return () => {
      // 모든 timeout 정리
      if (timeoutRefs.current.notification) {
        clearTimeout(timeoutRefs.current.notification)
      }
      if (timeoutRefs.current.focus) {
        clearTimeout(timeoutRefs.current.focus)
      }
      if (timeoutRefs.current.hint) {
        clearTimeout(timeoutRefs.current.hint)
      }
      if (timeoutRefs.current.next) {
        clearTimeout(timeoutRefs.current.next)
      }
      // blur timeout 정리
      if (blurTimeoutRefs.current.input1) {
        clearTimeout(blurTimeoutRefs.current.input1)
      }
      if (blurTimeoutRefs.current.input2) {
        clearTimeout(blurTimeoutRefs.current.input2)
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

  // 정답을 맞춘 후에도 모바일에서 키보드가 유지되도록 포커스 유지
  useEffect(() => {
    if (hasAnswered && inputRef.current) {
      // 모바일에서 키보드가 사라지지 않도록 포커스 유지
      const keepFocus = () => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
        }
      }

      // 즉시 포커스
      const timeoutId1 = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)

      // blur 이벤트를 막아서 포커스가 벗어나지 않도록
      const input = inputRef.current
      let blurTimeoutId = null
      const handleBlur = (e) => {
        // 모바일에서 키보드가 사라지지 않도록 blur를 막음
        e.preventDefault()
        if (blurTimeoutId) {
          clearTimeout(blurTimeoutId)
        }
        blurTimeoutId = setTimeout(() => {
          input?.focus()
        }, 0)
      }

      input.addEventListener('blur', handleBlur)

      // 주기적으로 포커스 확인 (모바일에서 키보드가 사라지는 것을 방지)
      const intervalId = setInterval(keepFocus, 300)

      return () => {
        clearTimeout(timeoutId1)
        if (blurTimeoutId) {
          clearTimeout(blurTimeoutId)
        }
        clearInterval(intervalId)
        // input이 아직 존재하는지 확인 후 제거
        if (input && input.removeEventListener) {
          input.removeEventListener('blur', handleBlur)
        }
      }
    }
  }, [hasAnswered, currentIndex])

  // 정답 처리 및 저장 로직
  const processCorrectAnswer = useCallback((quiz) => {
    // 복습 리스트에서 제거 (복습 대상이었던 경우)
    removeFromReviewWords(quiz)
    // completed에 추가
    saveToCompletedWords(quiz)
  }, [])

  // 입력이 변경되면 정답 상태 초기화 (더 이상 오답 UI가 없으므로 불필요하지만 유지)
  useEffect(() => {
    if (!hasAnswered && isCorrect === false) {
      setIsCorrect(null)
    }
  }, [userAnswer, hasAnswered])

  // 정답이 입력되면 자동으로 처리
  useEffect(() => {
    // hasAnswered가 이미 true이거나, userAnswer가 비어있으면 체크하지 않음
    if (hasAnswered || userAnswer.trim().length === 0) {
      return
    }

    // 띄어쓰기를 제거하고 비교 (사용자가 띄어쓰기를 넣지 않아도 정답 처리)
    const normalizedAnswer = userAnswer.trim().replace(/\s+/g, '').toLowerCase()
    const normalizedCorrect = currentQuiz.romaji.trim().replace(/\s+/g, '').toLowerCase()

    if (normalizedAnswer === normalizedCorrect) {
      setIsCorrect(true)
      setHasAnswered(true)
      // TTS로 예문 읽기 (히라가나 버전 사용)
      speakText(currentQuiz.exampleHiragana || currentQuiz.example)

      // 힌트를 본 경우에는 completed에 추가하지 않음 (복습 대상이므로)
      if (!showHint) {
        // 힌트를 보지 않고 직접 정답을 맞춘 경우에만 completed에 추가
        processCorrectAnswer(currentQuiz)
      } else {
        // 힌트를 본 후 정답을 맞춘 경우, 복습 리스트에만 유지 (이미 추가되어 있음)
        // 힌트를 본 후 정답을 맞췄으므로 복습 대상 알림 표시
        setShowReviewNotification(true)
        const notificationTimeout = setTimeout(() => {
          setShowReviewNotification(false)
        }, 3000)

        // cleanup 함수에서 timeout 정리
        return () => {
          clearTimeout(notificationTimeout)
        }
      }

      // 모바일에서 키보드가 사라지지 않도록 포커스 유지
      const focusTimeout = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)

      return () => {
        clearTimeout(focusTimeout)
      }
    }
  }, [userAnswer, hasAnswered, currentQuiz, processCorrectAnswer, showHint])

  // 문제가 변경되면 상태 초기화 (다음 문제로 넘어갈 때)
  useEffect(() => {
    // 첫 번째 문제가 아닐 때만 초기화 (마운트 시 중복 초기화 방지)
    if (currentIndex > 0 || userAnswer !== '' || hasAnswered) {
      // speechSynthesis 정리 (문제 변경 시 이전 음성 중지)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        if (speechSynthesisHandlerRef.current) {
          window.speechSynthesis.removeEventListener('voiceschanged', speechSynthesisHandlerRef.current)
          speechSynthesisHandlerRef.current = null
        }
      }

      setUserAnswer('')
      setIsCorrect(null)
      setShowHint(false)
      setHasAnswered(false)
      setShowReviewNotification(false)

      // timeout 정리
      if (timeoutRefs.current.notification) {
        clearTimeout(timeoutRefs.current.notification)
        timeoutRefs.current.notification = null
      }
      if (timeoutRefs.current.focus) {
        clearTimeout(timeoutRefs.current.focus)
        timeoutRefs.current.focus = null
      }
      if (timeoutRefs.current.hint) {
        clearTimeout(timeoutRefs.current.hint)
        timeoutRefs.current.hint = null
      }
      if (timeoutRefs.current.next) {
        clearTimeout(timeoutRefs.current.next)
        timeoutRefs.current.next = null
      }
      // blur timeout 정리
      if (blurTimeoutRefs.current.input1) {
        clearTimeout(blurTimeoutRefs.current.input1)
        blurTimeoutRefs.current.input1 = null
      }
      if (blurTimeoutRefs.current.input2) {
        clearTimeout(blurTimeoutRefs.current.input2)
        blurTimeoutRefs.current.input2 = null
      }
      
      // 다음 문제로 넘어갈 때 입력 필드에 포커스
      const focusTimeout = setTimeout(() => {
        inputRef.current?.focus()
      }, 150)
      
      return () => {
        clearTimeout(focusTimeout)
      }
    }
  }, [currentIndex])

  // 자동 정답 체크 로직 제거 (정답보기 버튼으로 대체)


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

  // handleSubmit은 더 이상 사용하지 않음 (정답보기 버튼으로 대체)

  const handleNext = () => {
    if (currentIndex < quizData.length - 1) {
      setCurrentIndex(currentIndex + 1)
      // 상태 초기화는 useEffect에서 처리됨
      // 포커스도 useEffect에서 처리됨
    } else {
      // 모든 문제 완료 (이미 각 문제마다 저장됨)
      // 퀴즈 단어들을 결과 페이지로 전달
      onComplete(quizData)
    }
  }

  const handleHint = () => {
    const correctAnswer = currentQuiz.romaji.toLowerCase()

    // 힌트는 1회만 볼 수 있음
    if (!showHint) {
      // 힌트 클릭 시: 정답이 2글자인 경우 1글자, 그 외에는 2글자 보여줌
      const hintLength = correctAnswer.length === 2 ? 1 : Math.min(2, correctAnswer.length)
      const revealedAnswer = correctAnswer.substring(0, hintLength)
      setUserAnswer(revealedAnswer)
      setShowHint(true)
      // 힌트를 본 단어는 복습 리스트에 추가 (토스트는 정답 입력/정답보기 시 표시)
      saveToReviewWords(currentQuiz)
      // 힌트를 본 후 입력 필드에 포커스 (커서를 맨 뒤로)
      if (timeoutRefs.current.hint) {
        clearTimeout(timeoutRefs.current.hint)
      }
      timeoutRefs.current.hint = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const length = inputRef.current.value.length
          inputRef.current.setSelectionRange(length, length)
        }
        timeoutRefs.current.hint = null
      }, 0)
    }
  }

  const handleShowAnswer = () => {
    // 이미 정답을 맞췄으면 처리하지 않음
    if (hasAnswered) {
      return
    }

    // 기존 timeout 정리
    if (timeoutRefs.current.notification) {
      clearTimeout(timeoutRefs.current.notification)
    }
    if (timeoutRefs.current.focus) {
      clearTimeout(timeoutRefs.current.focus)
    }

    // 정답 보기 처리 (completed에 추가하지 않음 - 복습 대상이므로)
    const correctAnswer = currentQuiz.romaji.toLowerCase()
    setIsCorrect(true)
    setHasAnswered(true)
    setUserAnswer(correctAnswer)
    // 정답보기를 본 단어는 복습 리스트에 추가 (completed에는 추가하지 않음)
    saveToReviewWords(currentQuiz)
    // 복습 대상 알림 표시
    setShowReviewNotification(true)
    timeoutRefs.current.notification = setTimeout(() => {
      setShowReviewNotification(false)
      timeoutRefs.current.notification = null
    }, 3000)
    // TTS로 예문 읽기 (히라가나 버전 사용)
    speakText(currentQuiz.exampleHiragana || currentQuiz.example)

    // 모바일에서 키보드가 사라지지 않도록 포커스 유지
    timeoutRefs.current.focus = setTimeout(() => {
      inputRef.current?.focus()
      timeoutRefs.current.focus = null
    }, 100)
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


  // 예문에 한자 위에 히라가나 루비 추가 (한자 위에만 루비 표시)
  const addRubyToExample = (example, exampleHiragana) => {
    const result = []
    let exampleIndex = 0
    let hiraganaIndex = 0
    let prevExampleIndex = exampleIndex
    let iterationCount = 0
    const maxIterations = example.length * 2 // 안전장치: 최대 반복 횟수

    // 예문과 히라가나 예문을 동시에 순회하면서 매칭
    while (exampleIndex < example.length && iterationCount < maxIterations) {
      iterationCount++
      const exampleChar = example[exampleIndex]
      const isKanji = /[\u4e00-\u9faf]/.test(exampleChar)

      if (isKanji) {
        // 연속된 한자 찾기
        let kanjiStart = exampleIndex
        let kanjiEnd = exampleIndex + 1
        while (kanjiEnd < example.length && /[\u4e00-\u9faf]/.test(example[kanjiEnd])) {
          kanjiEnd++
        }

        const kanjiGroup = example.substring(kanjiStart, kanjiEnd)

        // 한자 앞까지의 문자들을 히라가나 예문에서 매칭하여 현재 위치 찾기
        // 실제로는 이미 처리된 부분의 hiraganaIndex를 사용
        let hiraganaStart = hiraganaIndex
        let hiraganaEnd = hiraganaStart

        // 다음 한자가 아닌 문자까지 찾기
        const nextNonKanjiIndex = kanjiEnd < example.length ? kanjiEnd : example.length
        const nextNonKanjiChar = nextNonKanjiIndex < example.length ? example[nextNonKanjiIndex] : null

        // 히라가나/가타카나 문자들을 찾기
        let prevHiraganaEnd = hiraganaEnd
        while (hiraganaEnd < exampleHiragana.length) {
          const hiraganaChar = exampleHiragana[hiraganaEnd]

          // 히라가나/가타카나가 아니면 중단
          if (!/[\u3040-\u309f\u30a0-\u30ff]/.test(hiraganaChar)) {
            // 다음 한자가 아닌 문자와 매칭되면 중단
            if (nextNonKanjiChar && hiraganaChar === nextNonKanjiChar) {
              break
            }
            // nextNonKanjiChar가 없거나 매칭되지 않으면 중단 (무한 루프 방지)
            if (!nextNonKanjiChar) {
              break
            }
            hiraganaEnd++
          } else {
            hiraganaEnd++

            // 다음 문자가 한자가 아니면, 히라가나 예문에서도 해당 문자를 찾아야 함
            if (nextNonKanjiChar && hiraganaEnd < exampleHiragana.length) {
              if (exampleHiragana[hiraganaEnd] === nextNonKanjiChar) {
                break
              }
            }
          }
          
          // 무한 루프 방지: hiraganaEnd가 증가하지 않으면 중단
          if (hiraganaEnd === prevHiraganaEnd) {
            break
          }
          prevHiraganaEnd = hiraganaEnd
        }

        const hiraganaGroup = exampleHiragana.substring(hiraganaStart, hiraganaEnd)

        // 한자 위에만 루비 표시
        if (hiraganaGroup) {
          result.push(
            <ruby key={exampleIndex}>
              {kanjiGroup}
              <rt>{hiraganaGroup}</rt>
            </ruby>
          )
          hiraganaIndex = hiraganaEnd
        } else {
          result.push(kanjiGroup)
        }

        // kanjiEnd가 exampleIndex보다 작거나 같으면 무한 루프 방지를 위해 강제로 증가
        exampleIndex = Math.max(kanjiEnd, exampleIndex + 1)
      } else {
        // 한자가 아닌 문자(가타카나, 히라가나 등)는 그대로 추가
        // 루비 없이 표시
        result.push(exampleChar)

        // 히라가나 예문에서도 해당 문자 찾기
        // 가타카나와 히라가나가 다른 경우도 처리
        if (hiraganaIndex < exampleHiragana.length) {
          if (exampleHiragana[hiraganaIndex] === exampleChar) {
            // 동일한 문자면 둘 다 증가
            hiraganaIndex++
          } else {
            // 가타카나와 히라가나가 다른 경우 (예: プ vs ぷ, プレ vs ぷれ)
            // 가타카나/히라가나 문자 하나당 히라가나 예문에서도 하나씩 건너뛰기
            const isKatakana = /[\u30a0-\u30ff]/.test(exampleChar)
            const isHiragana = /[\u3040-\u309f]/.test(exampleChar)

            if ((isKatakana || isHiragana) && /[\u3040-\u309f]/.test(exampleHiragana[hiraganaIndex])) {
              // 가타카나/히라가나를 히라가나로 변환한 경우, 히라가나 인덱스 증가
              hiraganaIndex++
            } else if (isHiragana && exampleHiragana[hiraganaIndex] !== exampleChar) {
              // 히라가나가 다른 경우도 건너뛰기
              hiraganaIndex++
            }
          }
        }

        exampleIndex++
      }
      
      // 무한 루프 방지: exampleIndex가 증가하지 않으면 강제로 증가
      if (exampleIndex === prevExampleIndex) {
        exampleIndex++
      }
      prevExampleIndex = exampleIndex
    }

    return <>{result}</>
  }

  // 예문에서 해당 단어를 빈칸으로 교체하고 나머지에 루비 추가
  const getExampleWithBlank = (example, kanji, exampleHiragana, hiragana) => {
    const result = []
    let hiraganaIndex = 0
    // kanji가 빈 문자열이거나 없으면 hiragana를 사용
    const hasKanji = kanji && kanji.length > 0
    const kanjiIndex = hasKanji ? example.indexOf(kanji) : -1
    // kanji가 없으면 exampleHiragana에서 hiragana를 찾음
    const hiraganaIndexInExample = !hasKanji && hiragana && hiragana.length > 0 
      ? exampleHiragana.indexOf(hiragana) 
      : -1

    for (let i = 0; i < example.length; i++) {
      // kanji가 있으면 kanji 위치에서 빈칸으로 교체
      if (hasKanji && i === kanjiIndex && kanjiIndex !== -1) {
        result.push(<span key={i} className="blank">____</span>)
        // 히라가나 인덱스도 해당 부분만큼 건너뛰기
        hiraganaIndex += hiragana && hiragana.length > 0 ? hiragana.length : 0
        // kanji.length가 0이면 무한 루프 방지를 위해 최소 1 증가
        i += Math.max(kanji.length - 1, 0)
        continue
      }
      
      // kanji가 없으면 exampleHiragana에서 hiragana 위치를 찾아서 빈칸으로 교체
      // 이 체크는 한자 처리 전에 해야 함
      if (!hasKanji && hiragana && hiragana.length > 0 && hiraganaIndex < exampleHiragana.length) {
        const remainingHiragana = exampleHiragana.substring(hiraganaIndex)
        if (remainingHiragana.startsWith(hiragana)) {
          // hiragana를 찾았으면 빈칸으로 교체
          result.push(<span key={i} className="blank">____</span>)
          // hiragana 길이만큼 건너뛰기
          hiraganaIndex += hiragana.length
          // example에서도 해당 부분 건너뛰기 (최소 1글자)
          i += Math.max(hiragana.length - 1, 0)
          continue
        }
      }

      const char = example[i]
      const isKanji = /[\u4e00-\u9faf]/.test(char)

      if (isKanji) {
        // 연속된 한자 찾기
        let kanjiStart = i
        let kanjiEnd = i + 1
        while (kanjiEnd < example.length && /[\u4e00-\u9faf]/.test(example[kanjiEnd])) {
          kanjiEnd++
        }

        const kanjiGroup = example.substring(kanjiStart, kanjiEnd)

        // 히라가나 예문에서 해당 위치 찾기
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
          
          // 무한 루프 방지: hiraganaEnd가 증가하지 않으면 중단
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
        // 한자가 아니면 그대로 추가
        result.push(char)
        
        // exampleHiragana와 동기화
        if (hiraganaIndex < exampleHiragana.length) {
          // 같은 문자면 둘 다 증가
          if (exampleHiragana[hiraganaIndex] === char) {
            hiraganaIndex++
          } else {
            // 가타카나와 히라가나가 다른 경우 (예: プ vs ぷ)
            const isKatakana = /[\u30a0-\u30ff]/.test(char)
            const isHiragana = /[\u3040-\u309f]/.test(char)
            const isHiraganaInExample = /[\u3040-\u309f]/.test(exampleHiragana[hiraganaIndex])
            
            // 가타카나를 히라가나로 변환한 경우
            if ((isKatakana || isHiragana) && isHiraganaInExample) {
              hiraganaIndex++
            }
          }
        }
      }
    }

    return <>{result}</>
  }

  // 입력 필드의 너비를 계산하는 함수 (정답 길이에 맞춰 고정)
  const getInputWidth = () => {
    // 정답 길이에 맞춰 고정 (최소 8글자, 최대 20글자)
    const answerLength = currentQuiz.romaji.length
    const minLength = 8
    const maxLength = 20
    const length = Math.max(minLength, Math.min(answerLength + 2, maxLength))
    return `${length}ch`
  }

  // 로마자 예문에서 해당 단어를 입력 필드로 교체
  const getRomajiWithInput = (exampleRomaji, romaji) => {
    const inputWidth = getInputWidth()
    const displayValue = hasAnswered ? currentQuiz.romaji : userAnswer
    const parts = exampleRomaji.split(romaji)
    if (parts.length === 2) {
      return (
        <>
          {parts[0]}
          <span className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={displayValue}
              onChange={(e) => {
                if (!hasAnswered) {
                  setUserAnswer(e.target.value)
                } else {
                  // 정답 후에는 입력값 유지 (키보드가 사라지지 않도록)
                  e.target.value = displayValue
                }
              }}
              onBlur={(e) => {
                // 모바일에서 키보드가 사라지지 않도록 blur를 막음
                if (hasAnswered) {
                  e.preventDefault()
                  if (blurTimeoutRefs.current.input1) {
                    clearTimeout(blurTimeoutRefs.current.input1)
                  }
                  blurTimeoutRefs.current.input1 = setTimeout(() => {
                    inputRef.current?.focus()
                    blurTimeoutRefs.current.input1 = null
                  }, 0)
                }
              }}
              style={{ width: inputWidth }}
              className={`answer-input ${isCorrect === true ? 'correct' : ''}`}
            />
          </span>
          {parts[1]}
        </>
      )
    }
    return (
      <>
        {exampleRomaji.replace(romaji, '')}
        <span className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(e) => {
              if (!hasAnswered) {
                setUserAnswer(e.target.value)
              } else {
                // 정답 후에는 입력값 유지 (키보드가 사라지지 않도록)
                e.target.value = displayValue
              }
            }}
            onBlur={(e) => {
              // 모바일에서 키보드가 사라지지 않도록 blur를 막음
              if (hasAnswered) {
                e.preventDefault()
                if (blurTimeoutRefs.current.input2) {
                  clearTimeout(blurTimeoutRefs.current.input2)
                }
                blurTimeoutRefs.current.input2 = setTimeout(() => {
                  inputRef.current?.focus()
                  blurTimeoutRefs.current.input2 = null
                }, 0)
              }
            }}
            style={{ width: inputWidth }}
            className={`answer-input ${isCorrect === true ? 'correct' : ''}`}
          />
        </span>
      </>
    )
  }

  return (
    <div className="app">
      <div className="quiz-container page-enter">
        <button onClick={() => onComplete()} className="back-chevron-button">
          <span className="chevron-icon"></span>
        </button>
        <div className="progress">
          {currentIndex + 1} / {quizData.length}
        </div>

        <div className="example-section">
          <div className="example-japanese">
            {hasAnswered
              ? addRubyToExample(currentQuiz.example, currentQuiz.exampleHiragana)
              : getExampleWithBlank(currentQuiz.example, currentQuiz.kanji, currentQuiz.exampleHiragana, currentQuiz.hiragana)
            }
          </div>
          <div className="example-reading">
            <div className="reading-item">
              <span className="reading-label">읽는 법:</span>
              <span className="reading-text">
                {getRomajiWithInput(currentQuiz.exampleRomaji, currentQuiz.romaji)}
              </span>
            </div>
          </div>
          <div className="example-korean">{currentQuiz.exampleKorean}</div>
        </div>

        <div className="button-group">
          {!hasAnswered && (
            <>
              {!showHint && (
                <button
                  onClick={handleHint}
                  className="hint-button"
                >
                  힌트
                </button>
              )}
              <button
                onClick={handleShowAnswer}
                className="show-answer-button"
              >
                정답보기
              </button>
            </>
          )}

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

