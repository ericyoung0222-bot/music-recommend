// =====================================================================
// Last.fm API 호출 래퍼
// - 모든 응답을 { title, artist, image, url, ... } 형태로 정리해서 돌려줍니다.
// - 같은 요청은 sessionStorage에 캐시해서 API 호출을 줄입니다. (탭을 닫으면 사라짐)
// API 문서: https://www.last.fm/api
// =====================================================================

import { LASTFM_API_KEY, isLastfmConfigured } from './config.js';
import { makeTrackKey } from './utils/track-key.js';

const API_ROOT = 'https://ws.audioscrobbler.com/2.0/';
const CACHE_PREFIX = 'lastfm:v1:';

// Last.fm이 "이미지 없음" 대신 돌려주는 회색 별 그림의 ID (이 그림은 없는 것으로 취급)
const PLACEHOLDER_IMAGE_ID = '2a96cbd8b46e442fc41c2b86b821562f';

// 앨범 이미지가 없을 때 쓰는 기본 이미지 (HTML 기준 상대 경로)
export const DEFAULT_ALBUM_IMAGE = 'assets/default-album.svg';

// 진행 중인 같은 요청은 한 번만 보내기 위한 표
const inFlight = new Map();

// Last.fm 에러 (code: Last.fm 에러 번호 또는 'NO_KEY', 'NETWORK')
export class LastfmError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'LastfmError';
    this.code = code;
  }
}

// 에러를 사용자에게 보여줄 한국어 문장으로 바꿈
export function getLastfmErrorMessage(error) {
  switch (error?.code) {
    case 'NO_KEY':
      return 'Last.fm API 키가 설정되지 않았어요. js/config.js에 키를 넣어 주세요.';
    case 'NETWORK':
      return '인터넷 연결을 확인해 주세요. Last.fm에 연결하지 못했어요.';
    case 10:
    case 26:
      return 'Last.fm API 키가 올바르지 않아요. js/config.js의 키를 확인해 주세요.';
    case 29:
      return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.';
    case 11:
    case 16:
      return 'Last.fm 서버가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.';
    default:
      return 'Last.fm에서 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

// sessionStorage에서 캐시 읽기 (실패해도 조용히 null)
function readCache(key) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// sessionStorage에 캐시 저장 (용량 초과 등은 무시)
// 저장 공간(탭마다 약 5MB)이 차면 Last.fm 캐시만 비우고 한 번 더 시도
// (그대로 두면 고른 곡 목록 같은 더 중요한 값도 저장되지 않음)
function writeCache(key, value) {
  let json;
  try {
    json = JSON.stringify(value);
    window.sessionStorage.setItem(key, json);
  } catch {
    try {
      Object.keys(window.sessionStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .forEach((k) => window.sessionStorage.removeItem(k));
      if (json) window.sessionStorage.setItem(key, json);
    } catch {
      /* 캐시는 없어도 동작에 문제 없음 */
    }
  }
}

// API 한 번 호출 (캐시 → 진행 중 요청 공유 → 실제 요청 순서)
async function callApi(method, params) {
  if (!isLastfmConfigured()) {
    throw new LastfmError('Last.fm API 키가 없어요', 'NO_KEY');
  }

  // 캐시 키에는 API 키를 넣지 않음 (파라미터 순서를 정렬해 같은 요청이면 같은 키)
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const cacheKey = `${CACHE_PREFIX}${method}?${new URLSearchParams(sorted)}`;

  const cached = readCache(cacheKey);
  if (cached) return cached;
  if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);

  const query = new URLSearchParams({ method, ...params, api_key: LASTFM_API_KEY, format: 'json' });

  const request = (async () => {
    let response;
    try {
      response = await fetch(`${API_ROOT}?${query}`);
    } catch {
      throw new LastfmError('네트워크 오류', 'NETWORK');
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      /* JSON이 아니면 아래에서 에러 처리 */
    }

    if (data && data.error) throw new LastfmError(data.message || 'Last.fm 오류', data.error);
    if (!response.ok || !data) throw new LastfmError(`HTTP ${response.status}`, response.status);

    writeCache(cacheKey, data);
    return data;
  })();

  inFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inFlight.delete(cacheKey);
  }
}

// "찾을 수 없음"(에러 6)은 빈 결과로 취급
async function callApiOrEmpty(method, params) {
  try {
    return await callApi(method, params);
  } catch (error) {
    if (error instanceof LastfmError && error.code === 6) return null;
    throw error;
  }
}

// 값이 배열이 아니면 배열로 (Last.fm은 결과가 1개면 배열 대신 객체를 줄 때가 있음)
function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

// 이미지 목록에서 큰 이미지 주소 고르기 (회색 별 자리표시자는 제외)
export function pickImage(images) {
  const list = toArray(images);
  const order = ['extralarge', 'large', 'mega', 'medium', 'small'];
  for (const size of order) {
    const found = list.find((img) => img?.size === size);
    const url = found?.['#text'];
    if (url && !url.includes(PLACEHOLDER_IMAGE_ID)) return url;
  }
  return '';
}

// 가수 이름 꺼내기 (문자열 또는 { name } 객체 둘 다 처리)
function readArtistName(artist) {
  if (typeof artist === 'string') return artist;
  return artist?.name ?? artist?.['#text'] ?? '';
}

// Last.fm 곡 데이터를 우리 형식으로 정리
function normalizeTrack(raw) {
  const title = String(raw?.name ?? '').trim();
  const artist = String(readArtistName(raw?.artist)).trim();
  return {
    key: makeTrackKey(artist, title),
    title,
    artist,
    url: String(raw?.url ?? ''),
    image: pickImage(raw?.image),
    listeners: Number(raw?.listeners) || 0, // 검색 결과 정렬용 (검색 응답에만 있음)
  };
}

// 제목과 가수가 모두 있는 곡만 남기고, 같은 곡은 하나만
function cleanTracks(tracks) {
  const seen = new Set();
  return tracks.filter((track) => {
    if (!track.title || !track.artist || seen.has(track.key)) return false;
    seen.add(track.key);
    return true;
  });
}

// track.search 한 번 호출
async function searchOnce(params, limit) {
  const data = await callApiOrEmpty('track.search', { ...params, limit: String(limit) });
  return toArray(data?.results?.trackmatches?.track).map(normalizeTrack);
}

// 검색어 비교용: 소문자, 글자·숫자만
function compact(text) {
  return String(text ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

// 곡 검색 (자동완성용, 최대 limit개)
// - 제목만 입력해도 되고, "곡 제목 가수" / "가수 곡 제목"으로 입력해도 찾음
//   (예: "아이유 밤편지", "Lemon 米津玄師", "Hype Boy NewJeans", "Blinding Lights The Weeknd")
// - 앞/뒤 1~2단어를 가수로 가정해 몇 번 더 찾은 뒤,
//   "검색어에 제목과 가수가 모두 들어 있는 곡" → "청취자 많은 곡" 순으로 정렬
// - 가장 인기 있는 결과의 1%도 안 되는 청취자 수의 곡(커버·잘못 올라온 곡 등)은 뺌
export async function searchTracks(query, limit = 8) {
  const q = String(query ?? '').trim().replace(/\s+/g, ' ');
  if (!q) return [];
  const words = q.split(' ');

  const variants = [{ track: q }];
  [1, 2].forEach((n) => {
    if (words.length <= n) return;
    variants.push({ artist: words.slice(0, n).join(' '), track: words.slice(n).join(' ') });
    variants.push({ artist: words.slice(-n).join(' '), track: words.slice(0, -n).join(' ') });
  });

  const results = await Promise.allSettled(variants.map((params) => searchOnce(params, 10)));
  const ok = results.filter((r) => r.status === 'fulfilled');
  if (!ok.length) throw results[0].reason;

  const tracks = cleanTracks(ok.flatMap((r) => r.value));
  if (!tracks.length) return [];

  const qc = compact(q);
  const matchScore = (t) => {
    const title = compact(t.title);
    const artist = compact(t.artist);
    return (title && qc.includes(title) ? 1 : 0) + (artist && qc.includes(artist) ? 1 : 0);
  };
  const maxListeners = Math.max(...tracks.map((t) => t.listeners));
  const popular = tracks.filter((t) => t.listeners >= maxListeners * 0.01);

  return (popular.length ? popular : tracks)
    .map((t) => ({ track: t, score: matchScore(t) }))
    .sort((a, b) => (b.score - a.score) || (b.track.listeners - a.track.listeners))
    .slice(0, limit)
    .map(({ track }) => track);
}

// 비슷한 곡 (match: 0~1 사이 유사도)
export async function getSimilarTracks(artist, title, limit = 50) {
  const data = await callApiOrEmpty('track.getSimilar', {
    artist, track: title, limit: String(limit), autocorrect: '1',
  });
  const raw = toArray(data?.similartracks?.track);
  return cleanTracks(raw.map((item) => ({ ...normalizeTrack(item), match: Number(item?.match) || 0 })));
}

// 비슷한 가수 (match: 0~1 사이 유사도)
export async function getSimilarArtists(artist, limit = 5) {
  const data = await callApiOrEmpty('artist.getSimilar', {
    artist, limit: String(limit), autocorrect: '1',
  });
  return toArray(data?.similarartists?.artist)
    .map((item) => ({ name: String(item?.name ?? '').trim(), match: Number(item?.match) || 0 }))
    .filter((item) => item.name);
}

// 가수의 인기곡
export async function getArtistTopTracks(artist, limit = 3) {
  const data = await callApiOrEmpty('artist.getTopTracks', {
    artist, limit: String(limit), autocorrect: '1',
  });
  return cleanTracks(toArray(data?.toptracks?.track).map(normalizeTrack)).slice(0, limit);
}

// 곡 상세 정보 (앨범 이미지를 얻기 위해 사용, 없으면 null)
export async function getTrackInfo(artist, title) {
  const data = await callApiOrEmpty('track.getInfo', { artist, track: title, autocorrect: '1' });
  if (!data?.track) return null;
  return {
    image: pickImage(data.track.album?.image),
    url: String(data.track.url ?? ''),
  };
}
