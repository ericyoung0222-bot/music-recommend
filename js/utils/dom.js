// =====================================================================
// DOM 도우미 함수
// 규칙: JS는 요소를 data-js 속성으로만 찾고, class로는 찾지 않습니다.
//       상태는 is-로 시작하는 클래스로만 표현하고, 인라인 style은 쓰지 않습니다.
// =====================================================================

// data-js 이름으로 요소 하나 찾기
export function $(name, root = document) {
  return root.querySelector(`[data-js="${name}"]`);
}

// data-js 이름으로 요소 여러 개 찾기 (배열로 반환)
export function $$(name, root = document) {
  return Array.from(root.querySelectorAll(`[data-js="${name}"]`));
}

// data-js 자리에 글자 넣기 (textContent라서 HTML이 실행되지 않아 안전)
export function setText(root, name, text) {
  const el = $(name, root);
  if (el) el.textContent = text ?? '';
  return el;
}

// 상태 클래스 켜기/끄기 (is-loading, is-active 같은 is- 클래스만 허용)
export function setState(el, state, on = true) {
  if (!el) return;
  if (!state.startsWith('is-')) {
    throw new Error(`상태 클래스는 is-로 시작해야 해요: ${state}`);
  }
  el.classList.toggle(state, Boolean(on));
}

// 버튼/입력창 비활성화 (disabled 속성 + is-disabled 클래스)
export function setDisabled(el, disabled) {
  if (!el) return;
  el.disabled = Boolean(disabled);
  setState(el, 'is-disabled', disabled);
}

// 버튼을 "처리 중" 상태로 (누를 수 없고 is-loading 표시)
export function setBusy(button, busy) {
  if (!button) return;
  button.disabled = Boolean(busy);
  button.setAttribute('aria-busy', String(Boolean(busy)));
  setState(button, 'is-loading', busy);
}

// http/https 주소만 허용 (javascript: 같은 위험한 주소 차단)
export function safeUrl(url, fallback = '') {
  if (!url) return fallback;
  try {
    const parsed = new URL(url, window.location.href);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : fallback;
  } catch {
    return fallback;
  }
}

// 링크 주소 넣기 (안전하지 않은 주소면 링크를 숨김)
export function setLink(root, name, url) {
  const el = $(name, root);
  if (!el) return null;
  const href = safeUrl(url);
  el.hidden = !href;
  if (href) el.href = href;
  return el;
}

// 이미지 넣기 (주소가 없거나 깨지면 기본 이미지로 바꿈)
export function setImage(img, src, alt, fallbackSrc) {
  if (!img) return;
  img.alt = alt ?? '';
  const safeSrc = safeUrl(src);
  if (fallbackSrc) {
    img.addEventListener('error', () => {
      if (img.getAttribute('src') !== fallbackSrc) img.src = fallbackSrc;
    }, { once: true });
  }
  img.src = safeSrc || fallbackSrc || '';
}
