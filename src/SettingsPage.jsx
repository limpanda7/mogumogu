import './App.css'
import { resetMasteryData } from './spacedRepetition'

function SettingsPage({ onBack }) {
  const handleResetMasteryData = () => {
    if (window.confirm('모든 단어의 학습 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      resetMasteryData()
      alert('학습 데이터가 초기화되었습니다.')
    }
  }

  return (
    <div className="app">
      <div className="main-container page-enter">
        <div className="main-content" style={{ position: 'relative' }}>
          <button onClick={onBack} className="back-chevron-button">
            <span className="chevron-icon"></span>
          </button>
          <div className="settings-header">
            <h1 className="settings-title">
              설정
            </h1>
          </div>

          <div className="settings-section">
            <div className="settings-item-simple">
              <button
                onClick={handleResetMasteryData}
                className="reset-button"
              >
                학습 데이터 초기화
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

