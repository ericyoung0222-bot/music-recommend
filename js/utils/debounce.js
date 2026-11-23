// 마지막 호출 후 wait(ms) 동안 다시 호출되지 않을 때만 실행 (검색 자동완성용)
// 반환된 함수의 .cancel()로 예약된 실행을 취소할 수 있음
export function debounce(fn, wait = 300) {
  let timer = null;
  const debounced = (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
  debounced.cancel = () => window.clearTimeout(timer);
  return debounced;
}
