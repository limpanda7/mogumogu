const functions = require('firebase-functions');
const admin = require('firebase-admin');
const textToSpeech = require('@google-cloud/text-to-speech');

// Firebase Admin 초기화
admin.initializeApp();

// Google Cloud TTS 클라이언트 초기화
// 서비스 계정 키 파일 경로 또는 환경 변수에서 읽기
const serviceAccount = require('./service-account-key.json');
const client = new textToSpeech.TextToSpeechClient({
  credentials: serviceAccount
});

// TTS API를 호출하는 Cloud Function (대한민국 리전: asia-northeast3)
exports.synthesizeSpeech = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    const { text, languageCode = 'ja-JP', voiceName = 'ja-JP-Neural2-B' } = data;

    if (!text) {
      throw new functions.https.HttpsError('invalid-argument', '텍스트가 제공되지 않았습니다.');
    }

    // TTS 요청 설정
    const request = {
      input: { text: text },
      voice: {
        languageCode: languageCode,
        name: voiceName
        // ssmlGender는 음성 이름을 지정하면 자동으로 설정되므로 제거
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.85,
        pitch: 0,
        volumeGainDb: 0
      }
    };

    // TTS API 호출
    const [response] = await client.synthesizeSpeech(request);
    const audioContent = response.audioContent;

    // Base64로 인코딩하여 반환
    return {
      audioContent: audioContent.toString('base64'),
      mimeType: 'audio/mp3'
    };
  } catch (error) {
    console.error('TTS 오류:', error);
    throw new functions.https.HttpsError('internal', '음성 합성 중 오류가 발생했습니다.', error.message);
  }
});

