// 배열을 비동기로 변환하되, 동시에 최대 limit개만 실행 (API를 한꺼번에 너무 많이 부르지 않게)
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  // 일꾼 하나: 남은 항목을 하나씩 꺼내 처리
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
