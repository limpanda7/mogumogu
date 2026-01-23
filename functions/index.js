const functions = require('firebase-functions');
const admin = require('firebase-admin');
const textToSpeech = require('@google-cloud/text-to-speech');
const nodemailer = require('nodemailer');

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

// 이메일 전송 함수
exports.sendFeedback = functions.region('asia-northeast3').https.onCall(async (data, context) => {
  try {
    const { title, content } = data;

    if (!title || !content) {
      throw new functions.https.HttpsError('invalid-argument', '제목과 내용을 모두 입력해주세요.');
    }

    // Gmail SMTP 설정
    // 환경 변수에서 이메일 계정 정보 가져오기
    const emailUser = functions.config().email?.user || process.env.EMAIL_USER;
    const emailPassword = functions.config().email?.password || process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      throw new functions.https.HttpsError('failed-precondition', '이메일 설정이 완료되지 않았습니다.');
    }

    // Nodemailer transporter 생성
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });

    // 이메일 내용 설정
    const mailOptions = {
      from: emailUser,
      to: 'limpanda7@naver.com',
      subject: `[모구모구 의견] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff8c42; border-bottom: 2px solid #ff8c42; padding-bottom: 10px;">
            모구모구 앱 의견
          </h2>
          <div style="margin-top: 20px;">
            <h3 style="color: #333; margin-bottom: 10px;">제목</h3>
            <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; color: #333;">
              ${title.replace(/\n/g, '<br>')}
            </p>
          </div>
          <div style="margin-top: 20px;">
            <h3 style="color: #333; margin-bottom: 10px;">내용</h3>
            <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; color: #333; white-space: pre-wrap;">
              ${content.replace(/\n/g, '<br>')}
            </p>
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
            <p>이 이메일은 모구모구 앱의 의견보내기 기능을 통해 전송되었습니다.</p>
          </div>
        </div>
      `,
      text: `제목: ${title}\n\n내용:\n${content}`
    };

    // 이메일 전송
    await transporter.sendMail(mailOptions);

    return { success: true, message: '의견이 성공적으로 전송되었습니다.' };
  } catch (error) {
    console.error('이메일 전송 오류:', error);
    throw new functions.https.HttpsError('internal', '이메일 전송 중 오류가 발생했습니다.', error.message);
  }
});

