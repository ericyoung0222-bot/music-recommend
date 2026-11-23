// HTML 특수문자를 안전한 문자로 바꿈 (innerHTML에 글자를 넣어야 할 때만 사용)
// 대부분은 textContent를 쓰므로 이 함수가 필요 없습니다.
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
