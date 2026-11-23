// =====================================================================
// 추천 결과 정리 규칙 단위 테스트 (Last.fm 호출 없음)
// 실행: node tests/recommend.test.mjs
// - titleKey: 제목 비교 키
// - rankCandidates: 입력곡의 다른 표기 제외, 같은 곡 중복 제거, 가수당 2곡 제한
// "이전 규칙"(가수를 보지 않고 제목만 비교)과 "현재 규칙"(같은 가수일 때만)을 나란히 보여줍니다.
// =====================================================================

import assert from 'node:assert/strict';
import { titleKey, rankCandidates } from '../js/recommend.js';

// 후보 하나 만들기 (점수가 높을수록 앞)
let order = 100;
function entry(title, artist) {
  order -= 1;
  return { key: `${artist}::${title}`, title, artist, score: order, count: 1 };
}

// 이전 규칙: 가수와 상관없이 제목만 비교 (비영어 제목이면 포함 여부까지)
function oldIsSameAsSeed(title, seeds) {
  const tk = titleKey(title);
  return seeds.some((s) => {
    const sk = titleKey(s.title);
    return tk === sk || (sk.length >= 2 && /[^\u0000-ɏ]/.test(sk) && tk.includes(sk));
  });
}

let failed = 0;
// 기대값을 확인하고 결과를 한 줄로 출력
function check(name, actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    console.log(`  ✔ ${name}`);
  } catch {
    failed += 1;
    console.log(`  ✘ ${name}\n      기대: ${JSON.stringify(expected)}\n      실제: ${JSON.stringify(actual)}`);
  }
}

// 입력곡 하나와 후보 목록으로 이전/현재 규칙 결과 비교
function compare(label, seeds, candidates, expectedKept) {
  console.log(`\n[${label}] 입력곡: ${seeds.map((s) => `${s.title}/${s.artist}`).join(', ')}`);
  const kept = rankCandidates(candidates, { seeds, maxPerArtist: 10, limit: 50 }).map((e) => `${e.title}/${e.artist}`);
  candidates.forEach((c) => {
    const name = `${c.title}/${c.artist}`;
    const before = oldIsSameAsSeed(c.title, seeds) ? '제외' : '남김';
    const after = kept.includes(name) ? '남김' : '제외';
    console.log(`  ${name.padEnd(28)} 이전: ${before}  →  현재: ${after}`);
  });
  check(`${label}: 남는 곡`, kept, expectedKept);
}

console.log('== titleKey ==');
check('띄어쓰기/마침표 차이', titleKey('Gymnopédie No. 1'), titleKey('Gymnopédie No.1'));
check('괄호 안 내용 무시', titleKey('니가 왜 거기서 나와 (Narr. 고은아)'), titleKey('니가 왜 거기서 나와'));
check('feat 이하 무시', titleKey('Psycho (feat. Ty Dolla $ign)'), titleKey('Psycho'));
check('대괄호 무시', titleKey('밤편지 [Live]'), titleKey('밤편지'));
check('다른 제목은 다름', titleKey('첫사랑') === titleKey('사랑'), false);

console.log('\n== rankCandidates: 입력곡의 다른 표기 제외 ==');

compare(
  '"사랑" 케이스',
  [{ title: '사랑', artist: '가수A' }],
  [entry('첫사랑', '가수B'), entry('사랑비', '김태우'), entry('사랑 (Live)', '가수A'), entry('사랑합니다', '가수A')],
  ['첫사랑/가수B', '사랑비/김태우'],
);
// 같은 가수의 "사랑합니다"는 "사랑"을 포함해서 같은 곡의 다른 표기로 보고 제외됨 (같은 가수일 때만 적용하는 규칙의 한계)

compare(
  '"Galaxy 우주를 줄게" 다른 표기',
  [{ title: '우주를 줄게', artist: '볼빨간사춘기' }],
  [entry('Galaxy 우주를 줄게', '볼빨간사춘기'), entry('우주를 줄게', '볼빨간사춘기 (BOL4)'), entry('Galaxy 우주를 줄게', 'Bolbbalgan4'), entry('썸 탈꺼야', '볼빨간사춘기')],
  ['Galaxy 우주를 줄게/Bolbbalgan4', '썸 탈꺼야/볼빨간사춘기'],
);
// 가수 이름을 로마자로 쓴 "Bolbbalgan4"는 다른 가수로 보여서 남음 (한글↔로마자 가수 이름은 연결할 방법이 없음)

compare(
  '영어 제목은 정확히 같을 때만, 같은 가수일 때만',
  [{ title: 'Yellow', artist: 'Coldplay' }],
  [entry('Yellow (Live)', 'Coldplay'), entry('Yellow', 'Ebony Day'), entry('Yellow Submarine', 'The Beatles'), entry('The Scientist', 'Coldplay')],
  ['Yellow/Ebony Day', 'Yellow Submarine/The Beatles', 'The Scientist/Coldplay'],
);

compare(
  '가수 이름에 별칭이 붙은 경우',
  [{ title: '밤편지', artist: '아이유' }],
  [entry('밤편지 (Live)', '아이유 (IU)'), entry('밤편지', 'Hanni'), entry('라일락', '아이유')],
  ['밤편지/Hanni', '라일락/아이유'],
);

console.log('\n== rankCandidates: 중복 제거, 가수당 2곡, 제외 목록 ==');
const pool = [
  entry('Common', 'C'), entry('Common (Live)', 'C'), entry('x1', 'X'), entry('x2', 'X'), entry('x3', 'X'),
  entry('Y1', 'Y (Band)'), entry('Y2', 'Y'), entry('Y3', 'y'), entry('low', 'L'),
];
const ranked = rankCandidates(pool, { excludeKeys: new Set(['L::low']), maxPerArtist: 2, limit: 15 }).map((e) => e.title);
check('같은 곡 다른 표기는 하나만', ranked.filter((t) => titleKey(t) === 'common').length, 1);
check('같은 가수 최대 2곡', ranked.filter((t) => /^x/.test(t)).length, 2);
check('"Y (Band)"·"Y"·"y"는 같은 가수', ranked.filter((t) => /^Y/.test(t)).length, 2);
check('제외 목록(저평가 곡) 빠짐', ranked.includes('low'), false);
check('limit 적용', rankCandidates(pool, { maxPerArtist: 10, limit: 3 }).length, 3);

console.log(failed ? `\n실패 ${failed}개` : '\n모든 테스트 통과');
process.exitCode = failed ? 1 : 0;
