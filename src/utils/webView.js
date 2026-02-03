/**
 * 웹뷰 환경 감지 유틸리티
 * 앱(웹뷰) 내부에서 실행 중인지 확인합니다.
 * @returns {boolean} 웹뷰 환경이면 true, 웹 브라우저면 false
 */
export const isInWebView = () => {
  // 1. User-Agent 확인 (앱 이름이나 웹뷰 관련 문자열 포함 여부)
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  const isWebViewUA = /wv|WebView|Android.*wv|iPhone.*Mobile.*Safari/i.test(userAgent)

  // 2. 웹뷰 전용 객체 확인
  const hasReactNativeWebView = typeof window.ReactNativeWebView !== 'undefined'
  const hasWebkitMessageHandlers = typeof window.webkit !== 'undefined' &&
                                   typeof window.webkit.messageHandlers !== 'undefined'
  const hasAndroidBridge = typeof window.Android !== 'undefined'

  // 3. PWA/Standalone 모드 확인
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isIOSStandalone = window.navigator.standalone === true

  // 앱 내부에서 실행 중인 경우 (웹뷰)
  return isWebViewUA || hasReactNativeWebView || hasWebkitMessageHandlers ||
         hasAndroidBridge || isStandalone || isIOSStandalone
}

/**
 * 웹 브라우저 환경인지 확인합니다.
 * @returns {boolean} 웹 브라우저면 true, 웹뷰면 false
 */
export const isWebBrowser = () => {
  return !isInWebView()
}
