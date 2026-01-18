import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// vocabulary.js 모듈 직접 import
const vocabularyModule = await import('./src/vocabulary.js');
const vocabulary = vocabularyModule.vocabulary;

if (!vocabulary || !Array.isArray(vocabulary)) {
  console.error('vocabulary 배열을 찾을 수 없습니다.');
  process.exit(1);
}

// 단어 데이터 추출
const words = vocabulary.map(word => ({
  kanji: word.kanji || '',
  hiragana: word.hiragana || '',
  romaji: word.romaji || '',
  korean: word.korean || '',
  english: word.english || '',
  partOfSpeech: word.partOfSpeech || '',
  example: word.example || '',
  exampleKorean: word.exampleKorean || '',
  displayWord: word.kanji || word.hiragana // 표시용 단어 (kanji가 있으면 kanji, 없으면 hiragana)
}));

console.log(`총 ${words.length}개의 단어를 추출했습니다.\n`);

// 1. 단어만 추출
const wordsOnly = words.map(w => w.displayWord).join('\n');
fs.writeFileSync(path.join(__dirname, 'extracted-words.txt'), wordsOnly, 'utf-8');
console.log('✓ extracted-words.txt 생성 완료 (단어만)');

// 2. 단어와 예문 추출
const wordsWithExamples = words.map(w => {
  if (w.example && w.exampleKorean) {
    return `${w.displayWord}\t${w.example}\t${w.exampleKorean}`;
  } else if (w.example) {
    return `${w.displayWord}\t${w.example}`;
  } else {
    return w.displayWord;
  }
}).join('\n');
fs.writeFileSync(path.join(__dirname, 'extracted-words-with-examples.txt'), wordsWithExamples, 'utf-8');
console.log('✓ extracted-words-with-examples.txt 생성 완료 (단어 + 예문)');

const stats = {
  total: words.length,
  byPartOfSpeech: {},
  withKanji: words.filter(w => w.kanji).length,
  withoutKanji: words.filter(w => !w.kanji).length,
  withExample: words.filter(w => w.example).length
};

words.forEach(w => {
  stats.byPartOfSpeech[w.partOfSpeech] = (stats.byPartOfSpeech[w.partOfSpeech] || 0) + 1;
});

console.log('\n=== 단어 통계 ===');
console.log(`총 단어 수: ${stats.total}`);
console.log(`한자 포함: ${stats.withKanji}개`);
console.log(`한자 없음: ${stats.withoutKanji}개`);
console.log(`예문 포함: ${stats.withExample}개`);
console.log('\n품사별 분포:');
Object.entries(stats.byPartOfSpeech)
  .sort((a, b) => b[1] - a[1])
  .forEach(([pos, count]) => {
    console.log(`  ${pos}: ${count}개`);
  });

console.log('\n모든 파일이 성공적으로 생성되었습니다!');
