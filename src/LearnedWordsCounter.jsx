import { useState, useEffect } from 'react'
import { vocabulary } from './vocabulary'
import { getLearnedWordsCount } from './spacedRepetition'

function LearnedWordsCounter() {
  const [learnedCount, setLearnedCount] = useState(0)
  const totalCount = vocabulary.length

  // 학습한 단어 수 계산 및 업데이트
  const updateLearnedCount = () => {
    const count = getLearnedWordsCount(vocabulary)
    setLearnedCount(count)
  }

  useEffect(() => {
    // 초기 로드 시 계산
    updateLearnedCount()

    // localStorage 변경 감지 (다른 탭에서 변경된 경우)
    const handleStorageChange = () => {
      updateLearnedCount()
    }

    window.addEventListener('storage', handleStorageChange)
    
    // 주기적으로 확인 (같은 탭에서 변경된 경우)
    const interval = setInterval(updateLearnedCount, 1000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="learned-words-counter">
      <span className="learned-words-emoji">🍙</span>
      <span className="learned-words-count">{learnedCount}</span> / {totalCount}
    </div>
  )
}

export default LearnedWordsCounter
