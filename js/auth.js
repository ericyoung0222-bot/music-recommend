// =====================================================================
// 로그인 / 로그아웃, 로그인 상태 구독, 로그인 필요 페이지 보호
// =====================================================================

import {
  auth, db, firebaseReady,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, serverTimestamp,
} from './firebase.js';
import { buildLoginUrl } from './utils/page.js';
import { showStatus, clearStatus } from './components/status.js';

// Firebase 설정이 되어 있어 로그인을 쓸 수 있는지
export function isAuthAvailable() {
  return firebaseReady && Boolean(auth);
}

// 로그인 상태가 바뀔 때마다 callback(user 또는 null) 호출. 구독 해제 함수 반환
export function onUserChanged(callback) {
  if (!auth) {
    window.queueMicrotask(() => callback(null));
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// 현재 로그인한 사용자 (처음 로그인 상태 확인이 끝날 때까지 기다림)
export async function getCurrentUser() {
  if (!auth) return null;
  await auth.authStateReady();
  return auth.currentUser;
}

// 최초 로그인 시 users/{uid} 문서 만들기 (이미 있으면 그대로)
async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;
  // 보안 규칙에 맞춰 문자열은 200자까지만 저장 (firestore.rules users 규칙)
  await setDoc(ref, {
    displayName: String(user.displayName ?? '').slice(0, 200),
    photoURL: String(user.photoURL ?? '').slice(0, 200),
    createdAt: serverTimestamp(),
  });
}

// 구글 로그인 (팝업)
export async function loginWithGoogle() {
  if (!isAuthAvailable()) {
    const error = new Error('Firebase 설정이 없어요');
    error.code = 'app/not-configured';
    throw error;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' }); // 매번 계정 선택 화면 보이기
  const result = await signInWithPopup(auth, provider);
  try {
    await ensureUserDoc(result.user);
  } catch (error) {
    // 사용자 문서 저장에 실패해도 로그인 자체는 성공이므로 경고만
    console.warn('[auth] users 문서 저장 실패', error);
  }
  return result.user;
}

// 로그아웃
export async function logout() {
  if (auth) await signOut(auth);
}

// 로그인 에러를 한국어 안내로 (안내할 필요 없는 경우 null)
export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null; // 사용자가 창을 닫은 경우는 조용히 넘어감
    case 'auth/popup-blocked':
      return '로그인 팝업이 차단됐어요. 주소창 옆의 팝업 차단을 풀고 다시 눌러 주세요.';
    case 'auth/unauthorized-domain':
      return '이 주소는 Firebase의 "승인된 도메인"에 등록되지 않았어요. README의 Firebase 설정을 확인해 주세요.';
    case 'auth/operation-not-allowed':
      return 'Firebase 콘솔에서 Google 로그인이 사용 설정되지 않았어요.';
    case 'auth/network-request-failed':
      return '인터넷 연결을 확인하고 다시 시도해 주세요.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase 설정값(apiKey)이 올바르지 않아요. js/config.js를 확인해 주세요.';
    case 'app/not-configured':
      return 'Firebase 설정이 아직 없어요. js/config.js에 Firebase 설정을 넣어 주세요.';
    default:
      return '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}

// 로그인 필요 페이지 보호
// - 로그인 상태면 본문(content)을 보여주고 user 반환
// - 로그아웃 상태면 login.html?next=현재페이지 로 보내고 null 반환
// - Firebase 설정이 없으면 안내를 띄우고 null 반환
export async function protectPage({ statusSlot, content } = {}) {
  if (!isAuthAvailable()) {
    showStatus(statusSlot, {
      type: 'error',
      message: 'Firebase 설정이 아직 없어서 로그인 기능을 쓸 수 없어요. README의 "Firebase 설정"을 확인해 주세요.',
    });
    return null;
  }

  showStatus(statusSlot, { type: 'loading', message: '로그인 정보를 확인하는 중이에요…' });
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace(buildLoginUrl());
    return null;
  }

  clearStatus(statusSlot);
  if (content) content.hidden = false;
  return user;
}
