import { initializeApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Firebase 설정
// Firebase Console에서 프로젝트 설정 > 일반 > 앱 추가 > 웹 앱에서 가져올 수 있습니다
const firebaseConfig = {
  projectId: 'mogumogu-jp'
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)

// Functions 초기화 (대한민국 리전: asia-northeast3)
export const functions = getFunctions(app, 'asia-northeast3')

// TTS 함수 호출
export const synthesizeSpeech = httpsCallable(functions, 'synthesizeSpeech')

