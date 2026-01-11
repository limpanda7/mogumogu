const fs = require('fs');
const path = require('path');

// 일본어 문자 타입 체크 함수
function isKanji(char) {
  return /[\u4e00-\u9faf]/.test(char);
}

function isHiragana(char) {
  return /[\u3040-\u309f]/.test(char);
}

function isKatakana(char) {
  return /[\u30a0-\u30ff]/.test(char);
}

function isJapanese(char) {
  return isKanji(char) || isHiragana(char) || isKatakana(char);
}

// example과 exampleHiragana를 토큰으로 변환
function convertToTokens(example, exampleHiragana) {
  if (!example || !exampleHiragana) {
    return null;
  }

  const tokens = [];
  let exampleIndex = 0;
  let hiraganaIndex = 0;

  while (exampleIndex < example.length) {
    const char = example[exampleIndex];
    
    // 한자 그룹 처리
    if (isKanji(char)) {
      let kanjiStart = exampleIndex;
      let kanjiEnd = exampleIndex + 1;
      
      // 연속된 한자 찾기
      while (kanjiEnd < example.length && isKanji(example[kanjiEnd])) {
        kanjiEnd++;
      }
      
      const kanjiGroup = example.substring(kanjiStart, kanjiEnd);
      
      // 다음 비한자 문자 찾기
      const nextNonKanjiIndex = kanjiEnd < example.length ? kanjiEnd : example.length;
      const nextNonKanjiChar = nextNonKanjiIndex < example.length ? example[nextNonKanjiIndex] : null;
      
      // 히라가나 읽기 찾기
      let hiraganaStart = hiraganaIndex;
      let hiraganaEnd = hiraganaStart;
      let prevHiraganaEnd = hiraganaEnd;
      
      while (hiraganaEnd < exampleHiragana.length) {
        const hiraganaChar = exampleHiragana[hiraganaEnd];
        
        // 히라가나/가타카나가 아니면 중단
        if (!isHiragana(hiraganaChar) && !isKatakana(hiraganaChar)) {
          // 다음 비한자 문자와 일치하면 중단
          if (nextNonKanjiChar && hiraganaChar === nextNonKanjiChar) {
            break;
          }
          if (!nextNonKanjiChar) {
            break;
          }
          hiraganaEnd++;
        } else {
          hiraganaEnd++;
          // 다음 비한자 문자와 일치하면 중단
          if (nextNonKanjiChar && hiraganaEnd < exampleHiragana.length) {
            if (exampleHiragana[hiraganaEnd] === nextNonKanjiChar) {
              break;
            }
          }
        }
        
        if (hiraganaEnd === prevHiraganaEnd) {
          break;
        }
        prevHiraganaEnd = hiraganaEnd;
      }
      
      const hiraganaGroup = exampleHiragana.substring(hiraganaStart, hiraganaEnd);
      
      if (hiraganaGroup) {
        tokens.push({ k: kanjiGroup, r: hiraganaGroup });
        hiraganaIndex = hiraganaEnd;
      } else {
        tokens.push({ k: kanjiGroup });
      }
      
      exampleIndex = kanjiEnd;
    } else {
      // 비한자 문자 처리 (히라가나, 가타카나, 기호 등)
      let charStart = exampleIndex;
      let charEnd = exampleIndex + 1;
      
      // 같은 타입의 연속된 문자 찾기
      const charType = isHiragana(char) ? 'hiragana' : isKatakana(char) ? 'katakana' : 'other';
      
      if (charType === 'hiragana') {
        while (charEnd < example.length && isHiragana(example[charEnd])) {
          charEnd++;
        }
      } else if (charType === 'katakana') {
        while (charEnd < example.length && isKatakana(example[charEnd])) {
          charEnd++;
        }
      } else {
        // 기호나 다른 문자는 하나씩
        charEnd = exampleIndex + 1;
      }
      
      const charGroup = example.substring(charStart, charEnd);
      
      // 가타카나는 읽기(r) 없이 추가
      if (charType === 'katakana') {
        tokens.push({ k: charGroup });
        // exampleHiragana에서 해당 부분 건너뛰기
        if (hiraganaIndex < exampleHiragana.length) {
          if (exampleHiragana[hiraganaIndex] === char) {
            hiraganaIndex++;
          } else {
            // 히라가나로 변환된 경우 건너뛰기
            const isKatakanaInExample = isKatakana(example[exampleIndex]);
            const isHiraganaInExampleHiragana = isHiragana(exampleHiragana[hiraganaIndex]);
            if (isKatakanaInExample && isHiraganaInExampleHiragana) {
              hiraganaIndex++;
            }
          }
        }
      } else {
        // 히라가나나 기호는 그대로 추가 (읽기 없음)
        tokens.push({ k: charGroup });
        
        // exampleHiragana 인덱스 조정
        if (hiraganaIndex < exampleHiragana.length) {
          if (exampleHiragana[hiraganaIndex] === char) {
            hiraganaIndex++;
          } else if (isHiragana(char) && isHiragana(exampleHiragana[hiraganaIndex])) {
            hiraganaIndex++;
          }
        }
      }
      
      exampleIndex = charEnd;
    }
  }
  
  return tokens;
}

// vocabulary.js 파일 읽기
const vocabularyPath = path.join(__dirname, 'src', 'vocabulary.js');
const content = fs.readFileSync(vocabularyPath, 'utf-8');

// vocabulary 배열 추출 (간단한 파싱)
const vocabularyMatch = content.match(/export const vocabulary = \[([\s\S]*)\];/);
if (!vocabularyMatch) {
  console.error('vocabulary 배열을 찾을 수 없습니다.');
  process.exit(1);
}

// 각 단어 객체를 찾아서 처리
let updatedContent = content;
let processedCount = 0;
let skippedCount = 0;

// 단어 객체 패턴 찾기 (중괄호로 감싸진 객체)
const wordPattern = /(\{[^}]*example:\s*'([^']+)',\s*exampleHiragana:\s*'([^']+)'[^}]*\})/g;
let match;

while ((match = wordPattern.exec(content)) !== null) {
  const fullMatch = match[1];
  const example = match[2];
  const exampleHiragana = match[3];
  
  // 이미 exampleTokens가 있는지 확인
  if (fullMatch.includes('exampleTokens:')) {
    skippedCount++;
    continue;
  }
  
  // 토큰 생성
  const tokens = convertToTokens(example, exampleHiragana);
  
  if (tokens && tokens.length > 0) {
    // exampleTokens 문자열 생성
    const tokensStr = tokens.map(t => {
      if (t.r) {
        return `{k: '${t.k}', r: '${t.r}'}`;
      } else {
        return `{k: '${t.k}'}`;
      }
    }).join(', ');
    
    // exampleKorean 뒤에 exampleTokens 추가
    const exampleKoreanMatch = fullMatch.match(/exampleKorean:\s*'([^']+)'/);
    if (exampleKoreanMatch) {
      const exampleKorean = exampleKoreanMatch[1];
      const newFullMatch = fullMatch.replace(
        `exampleKorean: '${exampleKorean}'`,
        `exampleKorean: '${exampleKorean}',\n    exampleTokens: [${tokensStr}]`
      );
      updatedContent = updatedContent.replace(fullMatch, newFullMatch);
      processedCount++;
    }
  } else {
    skippedCount++;
  }
}

// 파일 저장
fs.writeFileSync(vocabularyPath, updatedContent, 'utf-8');

console.log(`처리 완료: ${processedCount}개 단어에 exampleTokens 추가, ${skippedCount}개 건너뜀`);
