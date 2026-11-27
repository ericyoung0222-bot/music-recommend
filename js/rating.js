// =====================================================================
// 평점 저장 / 삭제 / 조회 / 평균 (Firestore)
// 데이터 (writeBatch로 두 곳을 항상 함께 저장/삭제):
//   users/{uid}/ratings/{trackKey}  = { score, title, artist, image, url, updatedAt }
//   tracks/{trackKey}/ratings/{uid} = { score, updatedAt }
// 평균/인원수: tracks/{trackKey}/ratings에 average('score'), count() 집계 쿼리
// =====================================================================

import {
  db, collection, doc, getDocs, query, where, orderBy, writeBatch, serverTimestamp,
  getAggregateFromServer, average, count,
} from './firebase.js';
import { makeTrackKey } from './utils/track-key.js';

export const LOW_SCORE_MAX = 2;     // 이 점수 이하로 준 곡은 추천에서 제외
const MAX_FIELD_LENGTH = 200;

// 한 페이지 안에서 같은 곡 평균은 한 번만 조회하기 위한 캐시 (trackKey → Promise)
const statsCache = new Map();
// 내 평점 목록 캐시 (uid → Promise<Map>)
const myRatingsCache = new Map();

// 1~5 정수인지
export function isValidScore(score) {
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

// 에러를 사용자에게 보여줄 문장으로 (action: '저장' 또는 '삭제')
export function getRatingErrorMessage(error, action = '저장') {
  if (error?.code === 'permission-denied') return '권한이 없어요. 로그아웃 후 다시 로그인해 주세요.';
  if (error?.code === 'unavailable') return '인터넷 연결을 확인하고 다시 시도해 주세요.';
  return `평점을 ${action}하지 못했어요. 잠시 후 다시 시도해 주세요.`;
}

// 인터넷이 끊겨 있으면 바로 실패로 처리
// (오프라인에서 Firestore 쓰기는 끝나지 않고 기다리기만 해서 별이 계속 잠겨 있게 됨)
function assertOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw Object.assign(new Error('offline'), { code: 'unavailable' });
  }
}

// 문서 위치
function myRatingRef(uid, trackKey) {
  return doc(db, 'users', uid, 'ratings', trackKey);
}
function trackRatingRef(trackKey, uid) {
  return doc(db, 'tracks', trackKey, 'ratings', uid);
}

// 평점 저장 (새로 주기 + 수정 모두)
export async function saveRating(uid, track, score) {
  if (!isValidScore(score)) throw new Error('점수는 1~5 정수여야 해요');
  assertOnline();
  // 이미 만들어 둔 곡 키가 있으면 그대로 (저장된 제목이 200자로 잘린 경우에도 같은 문서를 가리키도록)
  const key = track.key || makeTrackKey(track.artist, track.title);
  const cut = (value) => String(value ?? '').slice(0, MAX_FIELD_LENGTH);
  // 주소는 자르면 깨진 링크가 되므로, 너무 길면 비워 둠
  const fit = (value) => { const text = String(value ?? ''); return text.length <= MAX_FIELD_LENGTH ? text : ''; };

  const batch = writeBatch(db);
  batch.set(myRatingRef(uid, key), {
    score,
    title: cut(track.title),
    artist: cut(track.artist),
    image: fit(track.image),
    url: fit(track.url),
    updatedAt: serverTimestamp(),
  });
  batch.set(trackRatingRef(key, uid), { score, updatedAt: serverTimestamp() });
  await batch.commit();

  statsCache.delete(key);
  const map = await myRatingsCache.get(uid)?.catch(() => null);
  map?.set(key, { key, score, title: track.title, artist: track.artist, image: track.image, url: track.url, updatedAt: new Date() });
  return key;
}

// 평점 삭제 (두 곳 함께)
export async function deleteRating(uid, trackKey) {
  assertOnline();
  const batch = writeBatch(db);
  batch.delete(myRatingRef(uid, trackKey));
  batch.delete(trackRatingRef(trackKey, uid));
  await batch.commit();

  statsCache.delete(trackKey);
  const map = await myRatingsCache.get(uid)?.catch(() => null);
  map?.delete(trackKey);
}

// 내가 평가한 곡 전체 (최근 평가 순)
export async function listMyRatings(uid) {
  const snapshot = await getDocs(query(collection(db, 'users', uid, 'ratings'), orderBy('updatedAt', 'desc')));
  // 서버에 못 닿아 빈 캐시가 돌아온 경우: "평가한 곡 없음" 대신 오류로 처리 (다시 시도 버튼이 보이게)
  if (snapshot.metadata.fromCache) throw Object.assign(new Error('offline'), { code: 'unavailable' });
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      key: d.id,
      score: data.score,
      title: data.title ?? '',
      artist: data.artist ?? '',
      image: data.image ?? '',
      url: data.url ?? '',
      updatedAt: data.updatedAt?.toDate?.() ?? null,
    };
  });
}

// 내 평점을 { 곡 키 → 평점 } 표로 (한 페이지에서 한 번만 불러옴)
export function getMyRatingsMap(uid) {
  if (!myRatingsCache.has(uid)) {
    const promise = listMyRatings(uid).then((list) => new Map(list.map((r) => [r.key, r])));
    promise.catch(() => myRatingsCache.delete(uid)); // 실패하면 다음에 다시 시도
    myRatingsCache.set(uid, promise);
  }
  return myRatingsCache.get(uid);
}

// 내가 2점 이하로 준 곡 키 (추천에서 제외용)
export async function getLowRatedKeys(uid) {
  const q = query(collection(db, 'users', uid, 'ratings'), where('score', '<=', LOW_SCORE_MAX));
  const snapshot = await getDocs(q);
  return new Set(snapshot.docs.map((d) => d.id));
}

// 곡의 평균 점수와 평가 인원 → { average, count } (같은 곡은 페이지당 한 번만 조회)
export function getTrackStats(trackKey) {
  if (!db) return Promise.resolve({ average: null, count: 0 });
  if (!statsCache.has(trackKey)) {
    const promise = getAggregateFromServer(collection(db, 'tracks', trackKey, 'ratings'), {
      average: average('score'),
      count: count(),
    }).then((snapshot) => {
      const data = snapshot.data();
      return { average: data.average ?? null, count: data.count ?? 0 };
    });
    promise.catch(() => statsCache.delete(trackKey)); // 실패하면 다음에 다시 시도
    statsCache.set(trackKey, promise);
  }
  return statsCache.get(trackKey);
}
