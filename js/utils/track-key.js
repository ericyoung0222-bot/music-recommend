// =====================================================================
// 곡 키 만들기 (프로젝트 전체에서 곡을 구분하는 유일한 방법)
// 플레이리스트 중복 확인, 평점 문서 ID, 추천 결과 중복 제거에 모두 이 함수만 씁니다.
// =====================================================================

// 글자 정리: 앞뒤 공백 제거 → 연속 공백을 하나로 → 소문자
function normalizePart(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// "가수::곡명" 형태로 합친 뒤 URL 인코딩 (Firestore 문서 ID로 써도 안전)
export function makeTrackKey(artist, title) {
  return encodeURIComponent(`${normalizePart(artist)}::${normalizePart(title)}`);
}
