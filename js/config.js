// =====================================================================
// 설정 파일: API 키와 Firebase 설정은 이 파일 한 곳에만 둡니다.
// 아래 'YOUR_...' 자리표시자를 실제 값으로 바꾸세요. (README.md 참고)
//
// ⚠️ 정적 사이트라서 이 파일의 값은 누구나 볼 수 있습니다.
//    Last.fm 키는 과제용으로 따로 발급하고, 과제가 끝나면 폐기하세요.
// =====================================================================

// Last.fm API 키 (https://www.last.fm/api/account/create 에서 발급)
export const LASTFM_API_KEY = 'YOUR_LASTFM_API_KEY';

// Firebase 콘솔 → 프로젝트 설정 → 내 앱 → SDK 설정 및 구성 → "구성"에 있는 값
export const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// 값이 아직 자리표시자인지 검사 (자리표시자면 기능 대신 "설정 필요" 안내를 보여줌)
function isPlaceholder(value) {
  return typeof value !== 'string' || value.trim() === '' || value.includes('YOUR_');
}

// Last.fm 키가 입력되었는지 확인
export function isLastfmConfigured() {
  return !isPlaceholder(LASTFM_API_KEY);
}

// Firebase 설정이 입력되었는지 확인
export function isFirebaseConfigured() {
  return !isPlaceholder(firebaseConfig.apiKey) && !isPlaceholder(firebaseConfig.projectId);
}
