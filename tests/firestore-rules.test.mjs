// =====================================================================
// Firestore 보안 규칙 테스트 (Firestore 에뮬레이터 사용, 실제 DB는 건드리지 않음)
// 사이트에는 포함되지 않는 개발용 파일입니다.
//
// 준비 (한 번만): Java 21 이상, Node.js
//   1) 영어로만 된 경로의 빈 폴더를 만듭니다 (Java 에뮬레이터가 한글 경로를 못 읽음). 예: C:\rules-test
//   2) 그 폴더에서:  npm install @firebase/rules-unit-testing@6 firebase@13 firebase-tools
//   3) 이 파일, firestore.rules, firebase.json을 그 폴더로 복사합니다.
// 실행 (그 폴더에서, PowerShell):
//   $env:RULES_FILE = "$PWD\firestore.rules"
//   npx firebase emulators:exec --only firestore --project demo-rules "node firestore-rules.test.mjs"
// =====================================================================
// firestore.rules 에뮬레이터 테스트: 클라이언트 코드(js/auth.js, js/playlist.js, js/rating.js)와 같은 필드로 읽기/쓰기
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, collection, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy,
  serverTimestamp, Timestamp, writeBatch, runTransaction, getAggregateFromServer, average, count,
} from 'firebase/firestore';

const RULES = readFileSync(process.env.RULES_FILE, 'utf8');
const env = await initializeTestEnvironment({
  projectId: 'demo-rules',
  firestore: { rules: RULES, host: '127.0.0.1', port: 8080 },
});

const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const guest = env.unauthenticatedContext().firestore();

const results = [];
// 기대대로 되면 ✔, 아니면 ✘
async function t(group, name, expectOk, fn) {
  try {
    await (expectOk ? assertSucceeds(fn()) : assertFails(fn()));
    results.push({ group, name, ok: true, expectOk });
  } catch (error) {
    results.push({ group, name, ok: false, expectOk, error: String(error?.message ?? error).slice(0, 160) });
  }
}

const KEY = encodeURIComponent('아이유::밤편지');
const track = (n = 0) => ({
  key: `k${n}`, title: `곡${n}`, artist: '가수', image: '', url: 'https://www.last.fm/', addedAt: Timestamp.now(),
});
const rating = (score) => ({ score, title: '밤편지', artist: '아이유', image: '', url: 'https://www.last.fm/', updatedAt: serverTimestamp() });

// ---------- 허용되어야 하는 것 (클라이언트 실제 동작) ----------
const P = '허용: 실제 기능';
await t(P, 'auth.ensureUserDoc 사용자 문서 만들기', true, () => setDoc(doc(alice, 'users/alice'), { displayName: '앨리스', photoURL: 'https://lh3.googleusercontent.com/a/x=s96-c', createdAt: serverTimestamp() }));
await t(P, '내 사용자 문서 읽기', true, () => getDoc(doc(alice, 'users/alice')));

let plId = null;
await t(P, 'createPlaylist (빈 플레이리스트)', true, async () => { const r = await addDoc(collection(alice, 'users/alice/playlists'), { name: '비 오는 날', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), tracks: [] }); plId = r.id; });
let pl2 = null;
await t(P, 'createPlaylistWithTrack (곡 1개와 함께)', true, async () => { const r = await addDoc(collection(alice, 'users/alice/playlists'), { name: '운동', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), tracks: [track(1)] }); pl2 = r.id; });
await t(P, 'renamePlaylist', true, () => updateDoc(doc(alice, `users/alice/playlists/${plId}`), { name: '새 이름', updatedAt: serverTimestamp() }));
await t(P, 'addTrackToPlaylist (트랜잭션)', true, () => runTransaction(alice, async (tx) => {
  const ref = doc(alice, `users/alice/playlists/${plId}`);
  const snap = await tx.get(ref);
  tx.update(ref, { tracks: [...snap.data().tracks, track(2)], updatedAt: serverTimestamp() });
}));
await t(P, 'removeTrackFromPlaylist (트랜잭션)', true, () => runTransaction(alice, async (tx) => {
  const ref = doc(alice, `users/alice/playlists/${plId}`);
  const snap = await tx.get(ref);
  tx.update(ref, { tracks: snap.data().tracks.filter((x) => x.key !== 'k2'), updatedAt: serverTimestamp() });
}));
await t(P, 'listPlaylists (updatedAt 내림차순)', true, () => getDocs(query(collection(alice, 'users/alice/playlists'), orderBy('updatedAt', 'desc'))));
await t(P, '200곡짜리 플레이리스트에 저장', true, () => updateDoc(doc(alice, `users/alice/playlists/${pl2}`), { tracks: Array.from({ length: 200 }, (_, i) => track(i)), updatedAt: serverTimestamp() }));
await t(P, 'deletePlaylist', true, () => deleteDoc(doc(alice, `users/alice/playlists/${pl2}`)));

await t(P, 'saveRating (writeBatch 두 곳)', true, () => { const b = writeBatch(alice); b.set(doc(alice, `users/alice/ratings/${KEY}`), rating(5)); b.set(doc(alice, `tracks/${KEY}/ratings/alice`), { score: 5, updatedAt: serverTimestamp() }); return b.commit(); });
await t(P, 'saveRating 점수 수정', true, () => { const b = writeBatch(alice); b.set(doc(alice, `users/alice/ratings/${KEY}`), rating(2)); b.set(doc(alice, `tracks/${KEY}/ratings/alice`), { score: 2, updatedAt: serverTimestamp() }); return b.commit(); });
await t(P, 'listMyRatings (updatedAt 내림차순)', true, () => getDocs(query(collection(alice, 'users/alice/ratings'), orderBy('updatedAt', 'desc'))));
await t(P, 'getLowRatedKeys (score <= 2)', true, () => getDocs(query(collection(alice, 'users/alice/ratings'), where('score', '<=', 2))));
await t(P, '곡 평균/인원 집계 (다른 사용자)', true, () => getAggregateFromServer(collection(bob, `tracks/${KEY}/ratings`), { average: average('score'), count: count() }));
await t(P, '곡 평균/인원 집계 (비로그인)', true, () => getAggregateFromServer(collection(guest, `tracks/${KEY}/ratings`), { average: average('score'), count: count() }));
await t(P, 'deleteRating (writeBatch 두 곳)', true, () => { const b = writeBatch(alice); b.delete(doc(alice, `users/alice/ratings/${KEY}`)); b.delete(doc(alice, `tracks/${KEY}/ratings/alice`)); return b.commit(); });

// ---------- 막혀야 하는 것 ----------
const N = '거부: 공격/잘못된 값';
await t(N, '다른 사람 사용자 문서 읽기', false, () => getDoc(doc(bob, 'users/alice')));
await t(N, '다른 사람 플레이리스트 목록 읽기', false, () => getDocs(collection(bob, 'users/alice/playlists')));
await t(N, '다른 사람 플레이리스트에 쓰기', false, () => addDoc(collection(bob, 'users/alice/playlists'), { name: 'x', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), tracks: [] }));
await t(N, '다른 사람 평점 목록 읽기', false, () => getDocs(collection(bob, 'users/alice/ratings')));
await t(N, '비로그인 곡별 평점 쓰기', false, () => setDoc(doc(guest, `tracks/${KEY}/ratings/alice`), { score: 5, updatedAt: serverTimestamp() }));
await t(N, '남의 uid로 곡별 평점 쓰기', false, () => setDoc(doc(alice, `tracks/${KEY}/ratings/bob`), { score: 1, updatedAt: serverTimestamp() }));
await t(N, '점수 6', false, () => setDoc(doc(alice, `tracks/${KEY}/ratings/alice`), { score: 6, updatedAt: serverTimestamp() }));
await t(N, '점수 0', false, () => setDoc(doc(alice, `users/alice/ratings/${KEY}`), rating(0)));
await t(N, '점수 3.5', false, () => setDoc(doc(alice, `tracks/${KEY}/ratings/alice`), { score: 3.5, updatedAt: serverTimestamp() }));
await t(N, '점수 문자열 "5"', false, () => setDoc(doc(alice, `users/alice/ratings/${KEY}`), rating('5')));
await t(N, '평점에 허용 안 된 필드 추가', false, () => setDoc(doc(alice, `users/alice/ratings/${KEY}`), { ...rating(4), admin: true }));
await t(N, '평점 필드 빠짐(title 없음)', false, () => { const r = rating(4); delete r.title; return setDoc(doc(alice, `users/alice/ratings/${KEY}`), r); });
await t(N, '평점 제목 201자', false, () => setDoc(doc(alice, `users/alice/ratings/${KEY}`), { ...rating(4), title: 'a'.repeat(201) }));
await t(N, '평점 updatedAt을 클라이언트 시각으로', false, () => setDoc(doc(alice, `tracks/${KEY}/ratings/alice`), { score: 4, updatedAt: Timestamp.now() }));
await t(N, '곡별 평점에 추가 필드', false, () => setDoc(doc(alice, `tracks/${KEY}/ratings/alice`), { score: 4, updatedAt: serverTimestamp(), name: 'x' }));
await t(N, '플레이리스트 이름 빈 문자열', false, () => addDoc(collection(alice, 'users/alice/playlists'), { name: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), tracks: [] }));
await t(N, '플레이리스트 이름 51자', false, () => addDoc(collection(alice, 'users/alice/playlists'), { name: 'a'.repeat(51), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), tracks: [] }));
await t(N, '플레이리스트 곡 201개', false, () => updateDoc(doc(alice, `users/alice/playlists/${plId}`), { tracks: Array.from({ length: 201 }, (_, i) => track(i)), updatedAt: serverTimestamp() }));
await t(N, 'tracks가 리스트가 아님', false, () => addDoc(collection(alice, 'users/alice/playlists'), { name: 'x', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), tracks: 'abc' }));
await t(N, '플레이리스트에 추가 필드', false, () => addDoc(collection(alice, 'users/alice/playlists'), { name: 'x', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), tracks: [], public: true }));
await t(N, '플레이리스트 createdAt 위조', false, () => addDoc(collection(alice, 'users/alice/playlists'), { name: 'x', createdAt: Timestamp.fromDate(new Date('2020-01-01')), updatedAt: serverTimestamp(), tracks: [] }));
await t(N, '플레이리스트 수정 때 createdAt 바꾸기', false, () => updateDoc(doc(alice, `users/alice/playlists/${plId}`), { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
await t(N, '플레이리스트 updatedAt 클라이언트 시각', false, () => updateDoc(doc(alice, `users/alice/playlists/${plId}`), { name: 'y', updatedAt: Timestamp.now() }));
await t(N, '사용자 문서 수정', false, () => updateDoc(doc(alice, 'users/alice'), { displayName: '바꿈' }));
await t(N, '사용자 문서에 추가 필드', false, () => setDoc(doc(bob, 'users/bob'), { displayName: 'b', photoURL: '', createdAt: serverTimestamp(), role: 'admin' }));
await t(N, '사용자 이름 201자', false, () => setDoc(doc(bob, 'users/bob'), { displayName: 'b'.repeat(201), photoURL: '', createdAt: serverTimestamp() }));
await t(N, '사용자 문서 삭제 (지우고 다시 만들기 우회)', false, () => deleteDoc(doc(alice, 'users/alice')));
await t(N, '새로 담는 곡에 허용 안 된 필드', false, () => updateDoc(doc(alice, `users/alice/playlists/${plId}`), { tracks: [track(1), { ...track(9), evil: '<script>' }], updatedAt: serverTimestamp() }));
await t(N, '새로 담는 곡 제목 201자', false, () => updateDoc(doc(alice, `users/alice/playlists/${plId}`), { tracks: [{ ...track(9), title: 'a'.repeat(201) }], updatedAt: serverTimestamp() }));
await t(N, '새로 담는 곡이 문자열', false, () => updateDoc(doc(alice, `users/alice/playlists/${plId}`), { tracks: ['그냥 글자'], updatedAt: serverTimestamp() }));
await t(N, '규칙에 없는 경로 쓰기', false, () => setDoc(doc(alice, 'admin/config'), { open: true }));
await t(N, '규칙에 없는 하위 경로 쓰기', false, () => setDoc(doc(alice, 'users/alice/secrets/x'), { a: 1 }));

await env.cleanup();

let fails = 0;
let lastGroup = '';
for (const r of results) {
  if (r.group !== lastGroup) { console.log(`\n== ${r.group} ==`); lastGroup = r.group; }
  console.log(`${r.ok ? '✔' : '✘'} ${r.name}${r.ok ? '' : `  ← ${r.expectOk ? '허용돼야 하는데 거부됨' : '거부돼야 하는데 허용됨'}: ${r.error}`}`);
  if (!r.ok) fails += 1;
}
console.log(`\n총 ${results.length}개 중 실패 ${fails}개`);
process.exit(fails ? 1 : 0);
