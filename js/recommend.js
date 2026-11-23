// =====================================================================
// 추천 알고리즘 (화면과 상관없는 순수 계산 + Last.fm 호출)
//
// 1. 입력곡마다 track.getSimilar(limit=50) 호출
// 2. [곡마다 보충] 비슷한 곡이 10개 미만인 입력곡은 (국내곡에 흔함)
//    그 가수의 인기곡 + 비슷한 가수(artist.getSimilar)의 인기곡으로 후보를 채움
//    보충곡 점수 = 가수 match × 0.3 (입력곡 가수 자신은 match 1로 봄)
// 3. [곡마다 점수 맞추기] 입력곡마다 가장 높은 점수가 1이 되도록 나눠서,
//    정보가 많은 곡 하나가 결과를 독차지하지 않게 함
// 4. 곡마다 점수를 합산하고, 몇 개의 입력곡에서 나왔는지 셈
// 5. 입력곡 자체(다른 표기 포함)와 제외 목록(로그인 시 내가 2점 이하로 준 곡)은 제외
// 6. 점수 내림차순(동점이면 등장 횟수 순), 같은 곡의 다른 표기는 하나만,
//    같은 가수는 최대 2곡, 상위 15곡
// 7. 그래도 5곡 미만이면 모든 입력곡 가수의 비슷한 가수 인기곡으로 한 번 더 보충
// =====================================================================

import {
  getSimilarTracks, getSimilarArtists, getArtistTopTracks, getTrackInfo,
} from './lastfm.js';
import { makeTrackKey } from './utils/track-key.js';
import { mapLimit } from './utils/async.js';

// 알고리즘 숫자 설정 (여기만 바꾸면 됨)
export const RECOMMEND_OPTIONS = {
  similarLimit: 50,        // 입력곡마다 가져올 비슷한 곡 수
  resultLimit: 15,         // 최종 추천 곡 수
  maxPerArtist: 2,         // 같은 가수 최대 곡 수
  minResults: 5,           // 이보다 적으면 전체 보충
  seedMinSimilar: 10,      // 입력곡의 비슷한 곡이 이보다 적으면 그 곡만 따로 보충
  fallbackArtistLimit: 5,  // 보충: 비슷한 가수 수
  fallbackTopTracks: 3,    // 보충: 가수마다 인기곡 수
  fallbackWeight: 0.3,     // 보충곡 점수 = 가수 match × 이 값
  concurrency: 3,          // 동시에 보내는 API 요청 수 (Last.fm 서버 부담 줄이기)
};

// 가수 이름 비교용 (괄호 안 별칭, 공백, 대소문자 무시: "DAY6 (Even of Day)" → "day6")
function artistKey(name) {
  return String(name ?? '').replace(/\(.*?\)|\[.*?\]/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();
}

// 제목 비교용: 괄호 안 내용과 feat/prod 이하를 지우고 글자·숫자만 남김
// ("Gymnopédie No. 1" = "Gymnopédie No.1", "니가 왜 거기서 나와 (Narr. 고은아)" = "니가 왜 거기서 나와")
export function titleKey(title) {
  const raw = String(title ?? '').toLowerCase();
  const key = raw
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/\s(feat\.?|ft\.?|prod\.?)\s.*$/i, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '');
  return key || raw.replace(/\s+/g, '');
}

// 한글·일본어 등 영어가 아닌 글자가 있는지 (이런 곡은 "Galaxy 우주를 줄게"처럼 다른 표기로 또 올라와 있음)
function hasNonLatin(text) {
  return /[^\u0000-ɏ]/.test(text);
}

// 입력곡과 사실상 같은 곡인지 (같은 제목, 또는 입력곡 제목이 영어가 아닐 때 그 제목을 포함)
function isSameAsSeed(entryTitleKey, seedTitleKeys) {
  return seedTitleKeys.some((seedKey) => entryTitleKey === seedKey
    || (seedKey.length >= 2 && hasNonLatin(seedKey) && entryTitleKey.includes(seedKey)));
}

// 후보 하나 만들기
function toCandidate(track, rawScore, source) {
  return {
    key: track.key || makeTrackKey(track.artist, track.title),
    title: track.title, artist: track.artist, url: track.url, image: track.image,
    rawScore, source,
  };
}

// 가수 목록의 인기곡을 후보로 (artists: [{ name, match }])
async function topTracksAsCandidates(artists, options, source) {
  const lists = await mapLimit(artists, options.concurrency, async (artist) => {
    try {
      const tracks = await getArtistTopTracks(artist.name, options.fallbackTopTracks);
      return tracks.map((track) => toCandidate(track, artist.match * options.fallbackWeight, source));
    } catch {
      return [];
    }
  });
  return lists.flat();
}

// 입력곡 하나의 보충 후보: 그 가수 인기곡 + 비슷한 가수 인기곡
async function seedArtistFallback(seed, options) {
  let similar = [];
  try {
    similar = await getSimilarArtists(seed.artist, options.fallbackArtistLimit);
  } catch {
    /* 비슷한 가수를 못 가져와도 입력곡 가수 인기곡은 시도 */
  }
  const artists = [{ name: seed.artist, match: 1 }, ...similar];
  return topTracksAsCandidates(artists, options, 'artist');
}

// 입력곡 하나의 후보 목록 만들기 (비슷한 곡 + 필요하면 보충)
async function collectSeedCandidates(seed, options) {
  let similar = [];
  let error = null;
  try {
    similar = await getSimilarTracks(seed.artist, seed.title, options.similarLimit);
  } catch (e) {
    error = e;
  }

  let candidates = similar.map((track) => toCandidate(track, track.match, 'similar'));
  let augmented = false;
  if (similar.length < options.seedMinSimilar) {
    const extra = await seedArtistFallback(seed, options);
    if (extra.length) {
      candidates = candidates.concat(extra);
      augmented = true;
    }
  }
  // 비슷한 곡 호출도 실패하고 보충도 없으면 이 입력곡은 실패로 취급
  if (error && !candidates.length) throw error;
  return { candidates, augmented };
}

// 입력곡 하나의 후보를 점수표에 더하기 (가장 높은 점수가 1이 되게 나눔)
function addSeedCandidates(table, candidates, seedIndex) {
  // 같은 입력곡 안에서 같은 곡이 두 번 나오면 높은 점수 하나만
  const best = new Map();
  candidates.forEach((c) => {
    if (!c.title || !c.artist) return;
    const prev = best.get(c.key);
    if (!prev || c.rawScore > prev.rawScore) best.set(c.key, c);
  });
  const maxScore = Math.max(0, ...[...best.values()].map((c) => c.rawScore));
  if (maxScore <= 0) return;

  best.forEach((c) => {
    let entry = table.get(c.key);
    if (!entry) {
      entry = { key: c.key, title: c.title, artist: c.artist, url: c.url, image: c.image, score: 0, count: 0, seeds: new Set() };
      table.set(c.key, entry);
    }
    entry.score += c.rawScore / maxScore;
    if (!entry.seeds.has(seedIndex)) {
      entry.seeds.add(seedIndex);
      entry.count += 1;
    }
    if (!entry.image && c.image) entry.image = c.image;
    if (!entry.url && c.url) entry.url = c.url;
  });
}

// 정렬 → 제외 → 같은 곡 다른 표기 제거 → 가수당 최대 N곡 → 상위 limit곡
// seedTitles: 입력곡 제목 (다른 표기로 다시 나오는 입력곡을 빼기 위해)
export function rankCandidates(entries, {
  excludeKeys = new Set(), seedTitles = [], maxPerArtist = 2, limit = 15,
} = {}) {
  const seedTitleKeys = seedTitles.map(titleKey);
  const sorted = entries
    .filter((entry) => !excludeKeys.has(entry.key))
    .sort((a, b) => (b.score - a.score) || (b.count - a.count));

  const perArtist = new Map();
  const seenTitles = new Set();
  const picked = [];
  for (const entry of sorted) {
    const tk = titleKey(entry.title);
    if (seenTitles.has(tk) || isSameAsSeed(tk, seedTitleKeys)) continue;
    const ak = artistKey(entry.artist);
    const used = perArtist.get(ak) || 0;
    if (used >= maxPerArtist) continue;
    perArtist.set(ak, used + 1);
    seenTitles.add(tk);
    picked.push(entry);
    if (picked.length >= limit) break;
  }
  return picked;
}

// 전체 보충: 모든 입력곡 가수의 비슷한 가수 인기곡 (결과가 너무 적을 때)
async function addGlobalFallback(seeds, table, options) {
  const seedArtists = [...new Map(seeds.map((s) => [artistKey(s.artist), s.artist])).values()];
  const results = await mapLimit(seedArtists, options.concurrency, async (name) => {
    try {
      return await getSimilarArtists(name, options.fallbackArtistLimit);
    } catch {
      return [];
    }
  });

  // 여러 입력 가수에서 같은 가수가 나오면 match가 큰 쪽을 사용
  const similarArtists = new Map();
  results.flat().forEach((artist) => {
    const ak = artistKey(artist.name);
    const prev = similarArtists.get(ak);
    if (!prev || artist.match > prev.match) similarArtists.set(ak, artist);
  });

  const candidates = await topTracksAsCandidates([...similarArtists.values()], options, 'artist');
  addSeedCandidates(table, candidates, 'global');
}

// 앨범 이미지가 없는 곡은 track.getInfo로 한 번 더 찾아봄 (실패해도 무시)
async function fillMissingImages(tracks, options) {
  const missing = tracks.filter((track) => !track.image);
  await mapLimit(missing, options.concurrency, async (track) => {
    try {
      const info = await getTrackInfo(track.artist, track.title);
      if (info?.image) track.image = info.image;
      if (!track.url && info?.url) track.url = info.url;
    } catch {
      /* 이미지가 없으면 기본 이미지가 표시됨 */
    }
  });
}

// 추천 실행
// seeds: [{ title, artist }] 3~5곡
// excludeKeys: 결과에서 뺄 곡 키 (예: 내가 2점 이하로 평가한 곡)
// 반환: { tracks: [{ key, title, artist, image, url, score, count }], usedFallback, augmentedSeeds, failedSeeds }
export async function getRecommendations(seeds, { excludeKeys = new Set(), options: custom = {} } = {}) {
  const options = { ...RECOMMEND_OPTIONS, ...custom };
  const seedKeys = seeds.map((s) => makeTrackKey(s.artist, s.title));
  const blocked = new Set([...seedKeys, ...excludeKeys]);
  const table = new Map();

  // 1~4단계: 입력곡마다 후보 모으기 (동시에 최대 3개씩) → 점수 맞춰서 합산
  const results = await mapLimit(seeds, options.concurrency, async (seed) => {
    try {
      return { ok: true, ...(await collectSeedCandidates(seed, options)) };
    } catch (error) {
      return { ok: false, error };
    }
  });

  const failures = results.filter((r) => !r.ok);
  if (seeds.length > 0 && failures.length === seeds.length) throw failures[0].error;

  results.forEach((result, index) => {
    if (result.ok) addSeedCandidates(table, result.candidates, index);
  });
  const augmentedSeeds = results.filter((r) => r.ok && r.augmented).length;

  // 5~6단계: 제외, 정렬, 가수 제한, 상위 N곡
  const rankOptions = {
    excludeKeys: blocked,
    seedTitles: seeds.map((s) => s.title),
    maxPerArtist: options.maxPerArtist,
    limit: options.resultLimit,
  };
  let picked = rankCandidates([...table.values()], rankOptions);

  // 7단계: 그래도 너무 적으면 전체 보충
  let usedFallback = false;
  if (picked.length < options.minResults) {
    usedFallback = true;
    await addGlobalFallback(seeds, table, options);
    picked = rankCandidates([...table.values()], rankOptions);
  }

  await fillMissingImages(picked, options);

  return {
    tracks: picked.map(({ key, title, artist, image, url, score, count }) => ({
      key, title, artist, image, url, score, count,
    })),
    usedFallback,
    augmentedSeeds,
    failedSeeds: failures.length,
  };
}
