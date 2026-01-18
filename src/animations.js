// 애니메이션 대사 데이터
export const animations = [
  {
    id: 'slam-dunk',
    name: '슬램덩크',
    nameJapanese: 'スラムダンク',
    words: [
      {
        kanji: '左手',
        hiragana: 'ひだりて',
        romaji: 'hidarite',
        korean: '왼손',
        english: 'left hand',
        partOfSpeech: 'noun',
        example: '左手は 添えるだけ',
        exampleRuby: [{ '左手': 'ひだりて' }, { '添': 'そ' }],
        exampleKorean: '왼손은 거들 뿐',
        exampleHiragana: 'ひだりては そえるだけ'
      },
      {
        kanji: '天才',
        hiragana: 'てんさい',
        romaji: 'tensai',
        korean: '천재',
        english: 'genius',
        partOfSpeech: 'noun',
        example: '天才ですから',
        exampleRuby: [{ '天才': 'てんさい' }],
        exampleKorean: '천재니까요',
        exampleHiragana: 'てんさいですから'
      },
      {
        kanji: '強い',
        hiragana: 'つよい',
        romaji: 'tsuyoi',
        korean: '강한',
        english: 'strong',
        partOfSpeech: 'adjective',
        example: '君達は強い',
        exampleRuby: [{ '君': 'きみ' }, { '達': 'たち' }, { '強': 'つよ' }],
        exampleKorean: '자네들은 강하다',
        exampleHiragana: 'きみたちはつよい'
      },
      {
        kanji: '勝利',
        hiragana: 'しょうり',
        romaji: 'shouri',
        korean: '승리',
        english: 'victory',
        partOfSpeech: 'noun',
        example: '必ず勝利する!',
        exampleRuby: [{ '必': 'かなら' }, { '勝利': 'しょうり' }],
        exampleKorean: '반드시 승리한다!',
        exampleHiragana: 'かならずしょうりする!'
      },
      {
        kanji: '男',
        hiragana: 'おとこ',
        romaji: 'otoko',
        korean: '남자',
        english: 'man',
        partOfSpeech: 'noun',
        example: 'あきらめの悪い男',
        exampleRuby: [{ '悪': 'わる' }, { '男': 'おとこ' }],
        exampleKorean: '포기를 모르는 남자지',
        exampleHiragana: 'あきらめのわるいおとこ'
      },
      {
        kanji: '',
        hiragana: 'から',
        romaji: 'kara',
        korean: '~이기 때문에',
        english: 'because',
        partOfSpeech: 'particle',
        example: '天才ですから',
        exampleRuby: [],
        exampleKorean: '천재니까요',
        exampleHiragana: 'てんさいですから'
      },
      {
        kanji: '必ず',
        hiragana: 'かならず',
        romaji: 'kanarazu',
        korean: '반드시',
        english: 'always',
        partOfSpeech: 'adverb',
        example: '必ず勝利する!',
        exampleRuby: [{ '必': 'かなら' }, { '勝利': 'しょうり' }],
        exampleKorean: '반드시 승리한다!',
        exampleHiragana: 'かならずしょうりする!'
      },
      {
        kanji: '添える',
        hiragana: 'そえる',
        romaji: 'soeru',
        korean: '곁들이다, 거들다',
        english: 'to accompany',
        partOfSpeech: 'verb',
        example: '左手は 添えるだけ',
        exampleRuby: [{ '左手': 'ひだりて' }, { '添': 'そ' }],
        exampleKorean: '왼손은 거들 뿐',
        exampleHiragana: 'ひだりては そえるだけ'
      }
    ]
  },
  {
    id: 'my-hero-academia',
    name: '나의 히어로 아카데미아',
    nameJapanese: '僕のヒーローアカデミア',
    words: [
      {
        kanji: '君',
        hiragana: 'きみ',
        romaji: 'kimi',
        korean: '너',
        english: 'you',
        partOfSpeech: 'noun',
        example: '君はヒーローになれる',
        exampleRuby: [{ '君': 'きみ' }],
        exampleKorean: '너는 히어로가 될 수 있다',
        exampleHiragana: 'きみはひーろーになれる'
      },
      {
        kanji: '平和',
        hiragana: 'へいわ',
        romaji: 'hewa',
        korean: '평화',
        english: 'peace',
        partOfSpeech: 'noun',
        example: '平和の象徴',
        exampleRuby: [{ '平和': 'へいわ' }, { '象徴': 'しょうちょう' }],
        exampleKorean: '평화의 상징',
        exampleHiragana: 'へいわのしょうちょう'
      },
      {
        kanji: '最高',
        hiragana: 'さいこう',
        romaji: 'saiko',
        korean: '최고',
        english: 'best',
        partOfSpeech: 'noun',
        example: 'これは俺が最高のヒーローになるまでの物語だ',
        exampleRuby: [{ '俺': 'おれ' }, { '最': 'さい' }, { '高': 'こう' }, { '物語': 'ものがたり' }],
        exampleKorean: '이것은 내가 최고의 히어로가 되기까지의 이야기다',
        exampleHiragana: 'これはおれがさいこうのひーろーになるまでのものがたりだ'
      },
      {
        kanji: '顔',
        hiragana: 'かお',
        romaji: 'kao',
        korean: '얼굴',
        english: 'face',
        partOfSpeech: 'noun',
        example: '君が助けを求める顔してた',
        exampleRuby: [{ '君': 'きみ' }, { '助': 'たす' }, { '求': 'もと' }, { '顔': 'かお' }],
        exampleKorean: '네가 도움을 구하는 얼굴을 했어',
        exampleHiragana: 'きみがたすけをもとめるかおしてた'
      },
      {
        kanji: '',
        hiragana: 'さらに',
        romaji: 'sarani',
        korean: '좀 더, 더욱',
        english: 'further, more, additionally',
        partOfSpeech: 'adverb',
        example: 'さらに向こうへ！PLUS ULTRA！',
        exampleRuby: [{ '向': 'む' }],
        exampleKorean: '좀 더 먼 곳으로! PLUS ULTRA!',
        exampleHiragana: 'さらにむこうへ！プルス・ウルトラ！'
      }
    ]
  },
  {
    id: 'frieren',
    name: '장송의 프리렌',
    nameJapanese: '葬送のフリーレン',
    words: [
      // 나중에 추가될 예정
    ]
  }
]
