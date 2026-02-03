import './App.css'

function AppReviewModal({ onConfirm, onCancel }) {
  // iOS/Android 감지
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  
  // 앱스토어 링크 결정
  const getAppStoreLink = () => {
    if (isIOS) {
      // iOS 앱스토어 링크 (실제 링크로 교체 필요)
      return 'https://apps.apple.com/app/idYOUR_APP_ID'
    } else if (isAndroid) {
      return 'https://play.google.com/store/apps/details?id=com.mogumoguapp'
    }
    // 기본값 (안드로이드)
    return 'https://play.google.com/store/apps/details?id=com.mogumoguapp'
  }

  const handleConfirm = () => {
    const link = getAppStoreLink()
    window.open(link, '_blank', 'noopener,noreferrer')
    onConfirm()
  }

  return (
    <div className="app-review-modal-overlay" onClick={onCancel}>
      <div className="app-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="app-review-modal-content">
          <div className="app-review-modal-icon">🍙</div>
          <h2 className="app-review-modal-title">앱 리뷰 부탁드려요!</h2>
          <p className="app-review-modal-message">
            20문제를 완료하셨네요!<br />
            모구모구가 도움이 되셨다면<br />
            앱스토어에 리뷰를 남겨주세요 😊
          </p>
          <div className="app-review-modal-buttons">
            <button onClick={handleConfirm} className="app-review-modal-confirm">
              리뷰 남기기
            </button>
            <button onClick={onCancel} className="app-review-modal-cancel">
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppReviewModal
