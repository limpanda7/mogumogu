// 에빙하우스 망각곡선 기반 간격 반복 알고리즘

import { shuffleArray } from './vocabulary'

const STORAGE_KEY = 'mogumogu_word_mastery'

// 복습 간격 enum
export const INTERVAL_TYPE = {
  IMMEDIATE: 'IMMEDIATE',
  SHORT: 'SHORT',
  MEDIUM: 'MEDIUM',
  LONG: 'LONG',
  VERY_LONG: 'VERY_LONG',
  EXTREME: 'EXTREME'
}

// 정답 타입 enum
export const ANSWER_TYPE = {
  QUICK: 'quick', // 5초 이내
  MODERATE: 'moderate', // 5~10초
  SLOW: 'slow', // 10초 이후
  WRONG: 'wrong' // 오답/모르겠음
}

// 복습 간격 상수 (밀리초)
export const REVIEW_INTERVALS = {
  IMMEDIATE: 5 * 60 * 1000, // 5분
  SHORT: 1 * 24 * 60 * 60 * 1000, // 1일
  MEDIUM: 5 * 24 * 60 * 60 * 1000, // 5일
  LONG: 10 * 24 * 60 * 60 * 1000, // 10일
  VERY_LONG: 30 * 24 * 60 * 60 * 1000, // 30일
  EXTREME: 90 * 24 * 60 * 60 * 1000 // 3달
}

// enum을 숫자로 변환하는 헬퍼 함수
const getIntervalValue = (intervalType) => {
  if (!intervalType) return null
  switch (intervalType) {
    case INTERVAL_TYPE.IMMEDIATE:
      return REVIEW_INTERVALS.IMMEDIATE
    case INTERVAL_TYPE.SHORT:
      return REVIEW_INTERVALS.SHORT
    case INTERVAL_TYPE.MEDIUM:
      return REVIEW_INTERVALS.MEDIUM
    case INTERVAL_TYPE.LONG:
      return REVIEW_INTERVALS.LONG
    case INTERVAL_TYPE.VERY_LONG:
      return REVIEW_INTERVALS.VERY_LONG
    case INTERVAL_TYPE.EXTREME:
      return REVIEW_INTERVALS.EXTREME
    default:
      return null
  }
}

// 숫자를 enum으로 변환하는 헬퍼 함수
const getIntervalType = (intervalValue) => {
  if (!intervalValue) return null
  if (intervalValue === REVIEW_INTERVALS.IMMEDIATE) return INTERVAL_TYPE.IMMEDIATE
  if (intervalValue === REVIEW_INTERVALS.SHORT) return INTERVAL_TYPE.SHORT
  if (intervalValue === REVIEW_INTERVALS.MEDIUM) return INTERVAL_TYPE.MEDIUM
  if (intervalValue === REVIEW_INTERVALS.LONG) return INTERVAL_TYPE.LONG
  if (intervalValue === REVIEW_INTERVALS.VERY_LONG) return INTERVAL_TYPE.VERY_LONG
  if (intervalValue === REVIEW_INTERVALS.EXTREME) return INTERVAL_TYPE.EXTREME
  return null
}

// 간격 순서 (한 단계 상승/하강을 위한 배열)
const INTERVAL_ORDER = [
  INTERVAL_TYPE.IMMEDIATE,
  INTERVAL_TYPE.SHORT,
  INTERVAL_TYPE.MEDIUM,
  INTERVAL_TYPE.LONG,
  INTERVAL_TYPE.VERY_LONG,
  INTERVAL_TYPE.EXTREME
]

// 현재 간격의 인덱스 찾기
const getIntervalIndex = (intervalType) => {
  return INTERVAL_ORDER.indexOf(intervalType)
}

// 간격을 한 단계 상승
const increaseInterval = (currentIntervalType) => {
  const currentIndex = getIntervalIndex(currentIntervalType)
  if (currentIndex === -1 || currentIndex >= INTERVAL_ORDER.length - 1) {
    return INTERVAL_TYPE.EXTREME // 이미 최대값
  }
  return INTERVAL_ORDER[currentIndex + 1]
}

// 간격을 두 단계 상승
const increaseIntervalByTwo = (currentIntervalType) => {
  const currentIndex = getIntervalIndex(currentIntervalType)
  if (currentIndex === -1) {
    return INTERVAL_TYPE.SHORT // 초기값이 없으면 SHORT부터
  }
  if (currentIndex >= INTERVAL_ORDER.length - 2) {
    return INTERVAL_TYPE.EXTREME // 이미 최대값 근처
  }
  return INTERVAL_ORDER[Math.min(currentIndex + 2, INTERVAL_ORDER.length - 1)]
}

// 단어별 복습 데이터 초기화
const getInitialMasteryData = () => ({
  currentInterval: null, // 현재 복습 간격 enum (null이면 처음 본 단어)
  nextReviewTime: Date.now() // 다음 복습 시간
})

// 단어별 복습 데이터 가져오기
export const getWordMasteryData = (romaji) => {
  const allMasteryData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  return allMasteryData[romaji] || getInitialMasteryData()
}

// 단어별 복습 데이터 저장
export const saveWordMasteryData = (romaji, masteryData) => {
  const allMasteryData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  allMasteryData[romaji] = masteryData
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allMasteryData))
}

// 정답 패턴에 따른 복습 간격 업데이트
export const updateMasteryOnAnswer = (romaji, answerType, answerTime = null) => {
  // answerType: 'quick' (5초 이내), 'moderate' (5~10초), 'slow' (10초 이후), 'wrong' (오답/모르겠음)
  const masteryData = getWordMasteryData(romaji)
  const now = Date.now()
  const isNewWord = masteryData.currentInterval === null

  let nextIntervalType

  if (answerType === ANSWER_TYPE.WRONG) {
    // wrong은 무조건 immediate
    nextIntervalType = INTERVAL_TYPE.IMMEDIATE
  } else if (isNewWord) {
    // 처음 본 단어
    if (answerType === ANSWER_TYPE.QUICK) {
      nextIntervalType = INTERVAL_TYPE.VERY_LONG
    } else if (answerType === ANSWER_TYPE.MODERATE) {
      nextIntervalType = INTERVAL_TYPE.MEDIUM
    } else if (answerType === ANSWER_TYPE.SLOW) {
      nextIntervalType = INTERVAL_TYPE.MEDIUM
    } else {
      // 기본값 (이론적으로는 발생하지 않음)
      nextIntervalType = INTERVAL_TYPE.MEDIUM
    }
  } else {
    // 복습 단어
    const currentIntervalType = masteryData.currentInterval || INTERVAL_TYPE.IMMEDIATE

    if (currentIntervalType === INTERVAL_TYPE.IMMEDIATE) {
      // immediate에서 맞추면 (quick이든 moderate이든 slow든) 한 단계 상승 -> short
      nextIntervalType = INTERVAL_TYPE.SHORT
    } else if (currentIntervalType === INTERVAL_TYPE.LONG) {
      // long에서
      if (answerType === ANSWER_TYPE.QUICK) {
        // quick으로 맞추면 extreme (3달)로
        nextIntervalType = INTERVAL_TYPE.EXTREME
      } else if (answerType === ANSWER_TYPE.MODERATE) {
        // moderate로 맞추면 long 유지
        nextIntervalType = INTERVAL_TYPE.LONG
      } else if (answerType === ANSWER_TYPE.SLOW) {
        // slow로 맞추면 long 유지
        nextIntervalType = INTERVAL_TYPE.LONG
      } else {
        // 기본값 (이론적으로는 발생하지 않음)
        nextIntervalType = INTERVAL_TYPE.LONG
      }
    } else {
      // immediate, long 외에서
      if (answerType === ANSWER_TYPE.SLOW) {
        // slow로 맞추면 한 단계 상승
        nextIntervalType = increaseInterval(currentIntervalType)
      } else if (answerType === ANSWER_TYPE.MODERATE) {
        // moderate로 맞추면 medium 복습주기 적용
        nextIntervalType = INTERVAL_TYPE.MEDIUM
      } else if (answerType === ANSWER_TYPE.QUICK) {
        // quick으로 맞추면 두 단계 상승
        nextIntervalType = increaseIntervalByTwo(currentIntervalType)
      } else {
        // 기본값 (이론적으로는 발생하지 않음)
        nextIntervalType = increaseInterval(currentIntervalType)
      }
    }
  }

  // 데이터 업데이트
  masteryData.currentInterval = nextIntervalType
  const nextIntervalValue = getIntervalValue(nextIntervalType)
  masteryData.nextReviewTime = now + nextIntervalValue

  // 저장
  saveWordMasteryData(romaji, masteryData)

  return masteryData
}

// 복습 대상 단어인지 확인 (다음 복습 시간이 지났는지)
export const isWordDueForReview = (romaji) => {
  const masteryData = getWordMasteryData(romaji)
  return Date.now() >= masteryData.nextReviewTime
}

// 복습 대상 단어 목록 가져오기
export const getWordsDueForReview = (vocabulary) => {
  return vocabulary.filter(word => isWordDueForReview(word.romaji))
}

// 새 단어인지 확인 (currentInterval이 null인 경우)
export const isNewWord = (romaji) => {
  const masteryData = getWordMasteryData(romaji)
  return masteryData.currentInterval === null
}

// 완전히 숙달된 단어인지 확인 (extreme 3달 간격에 도달한 경우)
export const isWordMastered = (romaji) => {
  const masteryData = getWordMasteryData(romaji)
  return masteryData.currentInterval === INTERVAL_TYPE.EXTREME
}

// 퀴즈용 단어 선택 (새 단어 일부 + 복습 단어 다수)
export const selectQuizWords = (vocabulary, totalCount = 10) => {
  const allMasteryData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  const now = Date.now()

  // 복습 대상 단어 (이미 학습한 단어 중 다음 복습 시간이 지난 단어)
  const dueWords = vocabulary.filter(word => {
    const masteryData = allMasteryData[word.romaji] || getInitialMasteryData()
    // 새 단어(currentInterval === null)는 복습 대상이 될 수 없음
    return masteryData.currentInterval !== null && now >= masteryData.nextReviewTime
  })

  // 새 단어 (currentInterval이 null인 단어)
  const newWords = vocabulary.filter(word => {
    const masteryData = allMasteryData[word.romaji] || getInitialMasteryData()
    return masteryData.currentInterval === null
  })

  // 완전히 숙달된 단어 제외 (extreme에 도달한 단어는 제외하지 않음 - 계속 복습 필요)
  // 하지만 사용자가 원하면 제외할 수도 있음
  const availableDueWords = dueWords
  const availableNewWords = newWords

  // 새 단어는 전체의 20-30% 정도만 포함 (최소 2개, 최대 3개)
  const newWordCount = Math.min(
    Math.max(2, Math.floor(totalCount * 0.2)),
    Math.min(3, availableNewWords.length)
  )

  // 복습 단어는 나머지
  const reviewWordCount = totalCount - newWordCount

  // 단어 선택
  const selectedWords = []

  // 새 단어 선택 (랜덤)
  if (availableNewWords.length > 0 && newWordCount > 0) {
    const shuffledNew = shuffleArray([...availableNewWords])
    selectedWords.push(...shuffledNew.slice(0, newWordCount))
  }

  // 복습 단어 선택 (우선순위: 오래된 복습 시간 순)
  if (availableDueWords.length > 0 && reviewWordCount > 0) {
    const sortedDueWords = availableDueWords.sort((a, b) => {
      const masteryA = allMasteryData[a.romaji] || getInitialMasteryData()
      const masteryB = allMasteryData[b.romaji] || getInitialMasteryData()
      return masteryA.nextReviewTime - masteryB.nextReviewTime
    })
    selectedWords.push(...sortedDueWords.slice(0, reviewWordCount))
  }

  // 부족한 경우 새 단어로 채우기
  if (selectedWords.length < totalCount && availableNewWords.length > 0) {
    const alreadySelectedRomaji = new Set(selectedWords.map(w => w.romaji))
    const filteredNewWords = availableNewWords.filter(w => !alreadySelectedRomaji.has(w.romaji))
    const shuffledAdditional = shuffleArray(filteredNewWords)
    selectedWords.push(...shuffledAdditional.slice(0, totalCount - selectedWords.length))
  }

  return selectedWords
}

// 다음 복습 시간을 사용자 친화적인 형식으로 변환
export const formatNextReviewTime = (nextReviewTime) => {
  const now = Date.now()
  const diff = nextReviewTime - now

  if (diff <= 0) {
    return '지금'
  }

  const minutes = Math.floor(diff / (60 * 1000))
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (minutes < 60) {
    return `${minutes}분 뒤`
  } else if (hours < 24) {
    return `${hours}시간 뒤`
  } else if (days < 7) {
    return `${days}일 뒤`
  } else if (weeks < 4) {
    return `${weeks}주 뒤`
  } else if (months < 12) {
    return `${months}개월 뒤`
  } else {
    return `${Math.floor(months / 12)}년 뒤`
  }
}

// 복습 간격에 따른 고정 메시지 반환 (enum 또는 숫자 모두 지원)
export const getReviewIntervalMessage = (interval) => {
  // 숫자 값인 경우 enum으로 변환
  const intervalType = typeof interval === 'string' ? interval : getIntervalType(interval)
  
  if (intervalType === INTERVAL_TYPE.IMMEDIATE) {
    return '5분 뒤'
  } else if (intervalType === INTERVAL_TYPE.SHORT) {
    return '1일 뒤'
  } else if (intervalType === INTERVAL_TYPE.MEDIUM) {
    return '5일 뒤'
  } else if (intervalType === INTERVAL_TYPE.LONG) {
    return '10일 뒤'
  } else if (intervalType === INTERVAL_TYPE.VERY_LONG) {
    return '30일 뒤'
  } else if (intervalType === INTERVAL_TYPE.EXTREME) {
    return '3달 뒤'
  } else {
    return '5분 뒤' // 기본값
  }
}

// 복습주기별로 단어 그룹화
export const groupWordsByInterval = (words) => {
  const groups = {
    [INTERVAL_TYPE.IMMEDIATE]: [],
    [INTERVAL_TYPE.SHORT]: [],
    [INTERVAL_TYPE.MEDIUM]: [],
    [INTERVAL_TYPE.LONG]: [],
    [INTERVAL_TYPE.VERY_LONG]: [],
    [INTERVAL_TYPE.EXTREME]: [],
    null: [] // 아직 학습하지 않은 단어
  }

  words.forEach(word => {
    const masteryData = getWordMasteryData(word.romaji)
    const intervalType = masteryData.currentInterval
    if (intervalType !== null && groups[intervalType] !== undefined) {
      groups[intervalType].push(word)
    } else {
      groups[null].push(word)
    }
  })

  return groups
}

// 복습주기별 그룹을 표시용으로 변환
export const getIntervalGroupsForDisplay = (words) => {
  const groups = groupWordsByInterval(words)
  const displayGroups = []

  if (groups[INTERVAL_TYPE.IMMEDIATE].length > 0) {
    displayGroups.push({
      interval: INTERVAL_TYPE.IMMEDIATE,
      label: '5분 뒤',
      words: groups[INTERVAL_TYPE.IMMEDIATE]
    })
  }
  if (groups[INTERVAL_TYPE.SHORT].length > 0) {
    displayGroups.push({
      interval: INTERVAL_TYPE.SHORT,
      label: '1일 뒤',
      words: groups[INTERVAL_TYPE.SHORT]
    })
  }
  if (groups[INTERVAL_TYPE.MEDIUM].length > 0) {
    displayGroups.push({
      interval: INTERVAL_TYPE.MEDIUM,
      label: '5일 뒤',
      words: groups[INTERVAL_TYPE.MEDIUM]
    })
  }
  if (groups[INTERVAL_TYPE.LONG].length > 0) {
    displayGroups.push({
      interval: INTERVAL_TYPE.LONG,
      label: '10일 뒤',
      words: groups[INTERVAL_TYPE.LONG]
    })
  }
  if (groups[INTERVAL_TYPE.VERY_LONG].length > 0) {
    displayGroups.push({
      interval: INTERVAL_TYPE.VERY_LONG,
      label: '30일 뒤',
      words: groups[INTERVAL_TYPE.VERY_LONG]
    })
  }
  if (groups[INTERVAL_TYPE.EXTREME].length > 0) {
    displayGroups.push({
      interval: INTERVAL_TYPE.EXTREME,
      label: '3달 뒤',
      words: groups[INTERVAL_TYPE.EXTREME]
    })
  }
  if (groups[null].length > 0) {
    displayGroups.push({
      interval: null,
      label: '새 단어',
      words: groups[null]
    })
  }

  return displayGroups
}

// 모든 단어를 복습주기별로 그룹화 (vocabulary 전체)
export const getAllWordsByInterval = (vocabulary) => {
  return getIntervalGroupsForDisplay(vocabulary)
}

// 단어 숙련도 데이터 초기화 (테스트용)
export const resetMasteryData = () => {
  localStorage.removeItem(STORAGE_KEY)
}
