// =====================================================================
// 플레이리스트 CRUD (Firestore)
// 데이터: users/{uid}/playlists/{playlistId}
//   = { name, createdAt, updatedAt, tracks: [{ key, title, artist, image, url, addedAt }] }
// =====================================================================

import {
  db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, Timestamp, runTransaction,
} from './firebase.js';
import { makeTrackKey } from './utils/track-key.js';

export const MAX_TRACKS = 200;      // 플레이리스트 하나당 최대 곡 수
export const MAX_NAME_LENGTH = 50;  // 플레이리스트 이름 최대 글자 수
const MAX_FIELD_LENGTH = 200;       // 곡 정보 각 필드 최대 글자 수

// 플레이리스트 관련 에러 (code: empty-name, long-name, not-found, duplicate, full)
export class PlaylistError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PlaylistError';
    this.code = code;
  }
}

// 에러를 사용자에게 보여줄 문장으로
export function getPlaylistErrorMessage(error) {
  if (error instanceof PlaylistError) return error.message;
  if (error?.code === 'permission-denied') return '권한이 없어요. 로그아웃 후 다시 로그인해 주세요.';
  if (error?.code === 'unavailable') return '인터넷 연결을 확인하고 다시 시도해 주세요.';
  return '플레이리스트를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

// 내 플레이리스트 컬렉션 / 문서 위치
function playlistsRef(uid) {
  return collection(db, 'users', uid, 'playlists');
}
function playlistRef(uid, playlistId) {
  return doc(db, 'users', uid, 'playlists', playlistId);
}

// 이름 검사: 앞뒤 공백 제거, 비어 있거나 50자 넘으면 에러
export function normalizeName(name) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!clean) throw new PlaylistError('플레이리스트 이름을 입력해 주세요.', 'empty-name');
  if (clean.length > MAX_NAME_LENGTH) {
    throw new PlaylistError(`이름은 ${MAX_NAME_LENGTH}자까지 쓸 수 있어요.`, 'long-name');
  }
  return clean;
}

// Firestore 문서 → 화면에서 쓰기 쉬운 객체
function fromSnapshot(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name ?? '',
    tracks: Array.isArray(data.tracks) ? data.tracks : [],
    createdAt: data.createdAt?.toDate?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.() ?? null,
  };
}

// 저장할 곡 정보 만들기 (필드 길이 제한, 곡 키는 항상 makeTrackKey로)
function toStoredTrack(track) {
  const cut = (value) => String(value ?? '').slice(0, MAX_FIELD_LENGTH);
  return {
    key: makeTrackKey(track.artist, track.title),
    title: cut(track.title),
    artist: cut(track.artist),
    image: cut(track.image),
    url: cut(track.url),
    addedAt: Timestamp.now(), // 배열 안에는 serverTimestamp를 쓸 수 없어서 현재 시각 사용
  };
}

// 내 플레이리스트 목록 (최근 수정 순)
export async function listPlaylists(uid) {
  const snapshot = await getDocs(query(playlistsRef(uid), orderBy('updatedAt', 'desc')));
  return snapshot.docs.map(fromSnapshot);
}

// 플레이리스트 하나 (없으면 null)
export async function getPlaylist(uid, playlistId) {
  const snapshot = await getDoc(playlistRef(uid, playlistId));
  return snapshot.exists() ? fromSnapshot(snapshot) : null;
}

// 새 플레이리스트 만들기 → 새 ID 반환
export async function createPlaylist(uid, name) {
  const ref = await addDoc(playlistsRef(uid), {
    name: normalizeName(name),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    tracks: [],
  });
  return ref.id;
}

// 이름 바꾸기
export async function renamePlaylist(uid, playlistId, name) {
  const clean = normalizeName(name);
  await updateDoc(playlistRef(uid, playlistId), { name: clean, updatedAt: serverTimestamp() });
  return clean;
}

// 플레이리스트 삭제
export async function deletePlaylist(uid, playlistId) {
  await deleteDoc(playlistRef(uid, playlistId));
}

// 곡 추가 (트랜잭션: 동시에 눌러도 중복/200곡 초과가 생기지 않음) → 추가 후 곡 수 반환
export async function addTrackToPlaylist(uid, playlistId, track) {
  const ref = playlistRef(uid, playlistId);
  const item = toStoredTrack(track);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new PlaylistError('플레이리스트를 찾을 수 없어요.', 'not-found');

    const tracks = Array.isArray(snapshot.data().tracks) ? snapshot.data().tracks : [];
    if (tracks.some((t) => t.key === item.key)) {
      throw new PlaylistError('이미 이 플레이리스트에 있는 곡이에요.', 'duplicate');
    }
    if (tracks.length >= MAX_TRACKS) {
      throw new PlaylistError(`플레이리스트에는 최대 ${MAX_TRACKS}곡까지 담을 수 있어요.`, 'full');
    }

    transaction.update(ref, { tracks: [...tracks, item], updatedAt: serverTimestamp() });
    return tracks.length + 1;
  });
}

// 곡 빼기 → 남은 곡 목록 반환
export async function removeTrackFromPlaylist(uid, playlistId, trackKey) {
  const ref = playlistRef(uid, playlistId);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new PlaylistError('플레이리스트를 찾을 수 없어요.', 'not-found');
    const tracks = (snapshot.data().tracks || []).filter((t) => t.key !== trackKey);
    transaction.update(ref, { tracks, updatedAt: serverTimestamp() });
    return tracks;
  });
}
