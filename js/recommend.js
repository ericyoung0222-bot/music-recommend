// =====================================================================
// 추천 알고리즘 (화면과 상관없는 순수 계산 + Last.fm 호출)
//
// 1. 입력곡마다 track.getSimilar(limit=50) 호출
// 2. 결과 곡마다 match 값을 점수로 더하고, 몇 개의 입력곡에서 나왔는지 셈
// 3. 입력곡 자체는 제외
// 4. 제외 목록(로그인 시 내가 2점 이하로 준 곡)도 제외
// 5. 점수 내림차순(동점이면 등장 횟수 순), 같은 가수는 최대 2곡
// 6. 상위 15곡
// 7. 5곡 미만이면 입력곡 가수의 비슷한 가수 → 그 가수 인기곡으로 보충 (점수 = 가수 match × 0.3)
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
  minResults: 5,           // 이보다 적으면 보충
  fallbackArtistLimit: 5,  // 보충: 비슷한 가수 수
  fallbackTopTracks: 3,    // 보충: 가수마다 인기곡 수
  fallbackWeight: 0.3,     // 보충곡 점수 = 가수 match × 이 값
  concurrency: 5,          // 동시에 보내는 API 요청 수
};

// 가수 이름 비교용 (공백/대소문자 무시)
function artistKey(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// 후보 점수표에 곡 하나 더하기 (sourceId가 처음 나온 경우에만 등장 횟수 +1)
function addCandidate(candidates, track, score, sourceId) {
  const key = track.key || makeTrackKey(track.artist, track.title);
  let entry = candidates.get(key);
  if (!entry) {
    entry = {
      key, title: track.title, artist: track.artist, url: track.url, image: track.image,
      score: 0, count: 0, sources: new Set(),
    };
    candidates.set(key, entry);
  }
  entry.score += score;
  if (!entry.sources.has(sourceId)) {
    entry.sources.add(sourceId);
    entry.count += 1;
  }
  if (!entry.image && track.image) entry.image = track.image;
  if (!entry.url && track.url) entry.url = track.url;
}

// 정렬 → 제외 → 가수당 최대 N곡 → 상위 limit곡
export function rankCandidates(entries, { excludeKeys = new Set(), maxPerArtist = 2, limit = 15 } = {}) {
  const sorted = entries
    .filter((entry) => !excludeKeys.has(entry.key))
    .sort((a, b) => (b.score - a.score) || (b.count - a.count));

  const perArtist = new Map();
  const picked = [];
  for (const entry of sorted) {
    const ak = artistKey(entry.artist);
    const used = perArtist.get(ak) || 0;
    if (used >= maxPerArtist) continue;
    perArtist.set(ak, used + 1);
    picked.push(entry);
    if (picked.length >= limit) break;
  }
  return picked;
}

// 보충: 입력곡 가수의 비슷한 가수 → 인기곡을 후보에 추가
async function addArtistFallback(seeds, candidates, options) {
  // 입력곡 가수 (중복 제거)
  const seedArtists = [...new Map(seeds.map((s) => [artistKey(s.artist), s.artist])).values()];

  const similarResults = await Promise.allSettled(
    seedArtists.map((name) => getSimilarArtists(name, options.fallbackArtistLimit)),
  );

  // 여러 입력 가수에서 같은 가수가 나오면 match가 큰 쪽을 사용
  const similarArtists = new Map();
  similarResults.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    result.value.forEach((artist) => {
      const ak = artistKey(artist.name);
      const prev = similarArtists.get(ak);
      if (!prev || artist.match > prev.match) similarArtists.set(ak, artist);
    });
  });

  const artists = [...similarArtists.values()];
  const topLists = await mapLimit(artists, options.concurrency, async (artist) => {
    try {
      return { artist, tracks: await getArtistTopTracks(artist.name, options.fallbackTopTracks) };
    } catch {
      return { artist, tracks: [] };
    }
  });

  topLists.forEach(({ artist, tracks }) => {
    tracks.forEach((track) => {
      addCandidate(candidates, track, artist.match * options.fallbackWeight, `artist:${artistKey(artist.name)}`);
    });
  });
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
// 반환: { tracks: [{ key, title, artist, image, url, score, count }], usedFallback, failedSeeds }
export async function getRecommendations(seeds, { excludeKeys = new Set(), options: custom = {} } = {}) {
  const options = { ...RECOMMEND_OPTIONS, ...custom };
  const seedKeys = seeds.map((s) => makeTrackKey(s.artist, s.title));
  const blocked = new Set([...seedKeys, ...excludeKeys]);
  const candidates = new Map();

  // 1~2단계: 입력곡마다 비슷한 곡 가져와서 점수 합산
  const results = await Promise.allSettled(
    seeds.map((seed) => getSimilarTracks(seed.artist, seed.title, options.similarLimit)),
  );
  const failures = results.filter((r) => r.status === 'rejected');
  if (seeds.length > 0 && failures.length === seeds.length) throw failures[0].reason;

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    result.value.forEach((track) => addCandidate(candidates, track, track.match, `seed:${index}`));
  });

  // 3~6단계: 제외, 정렬, 가수 제한, 상위 N곡
  const rankOptions = { excludeKeys: blocked, maxPerArtist: options.maxPerArtist, limit: options.resultLimit };
  let picked = rankCandidates([...candidates.values()], rankOptions);

  // 7단계: 결과가 너무 적으면 비슷한 가수의 인기곡으로 보충
  let usedFallback = false;
  if (picked.length < options.minResults) {
    usedFallback = true;
    await addArtistFallback(seeds, candidates, options);
    picked = rankCandidates([...candidates.values()], rankOptions);
  }

  await fillMissingImages(picked, options);

  return {
    tracks: picked.map(({ key, title, artist, image, url, score, count }) => ({
      key, title, artist, image, url, score, count,
    })),
    usedFallback,
    failedSeeds: failures.length,
  };
}
