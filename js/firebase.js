// =====================================================================
// Firebase 초기화
// - Firebase SDK는 공식 CDN(gstatic)에서 불러오고, 버전은 이 파일 한 곳에만 씁니다.
//   (다른 파일은 Firebase 함수를 모두 여기서 import → 모든 파일이 같은 버전 사용)
// - 버전을 올릴 때는 아래 URL 3개의 숫자만 함께 바꾸세요.
// - config.js가 자리표시자 상태면 초기화하지 않고 auth/db가 null입니다.
// =====================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp, writeBatch, runTransaction,
  getAggregateFromServer, average, count,
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import { firebaseConfig, isFirebaseConfigured } from './config.js';

// Firebase 설정이 입력되어 있는지
export const firebaseReady = isFirebaseConfigured();

// 앱, 인증, DB (설정이 없으면 null)
export const app = firebaseReady ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// 구글 로그인 창을 한국어로
if (auth) auth.languageCode = 'ko';

// 다른 파일에서 쓰는 Firebase 함수들 (여기서만 CDN을 import하도록 다시 내보냄)
export {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp, writeBatch, runTransaction,
  getAggregateFromServer, average, count,
};
