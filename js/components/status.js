// =====================================================================
// 상태 화면 (로딩 / 빈 화면 / 에러)
// 사용법: showStatus(자리요소, { type: 'loading' | 'empty' | 'error', message })
// 자리요소와 상태 화면 둘 다에 is-loading / is-empty / is-error 클래스가 붙습니다.
// =====================================================================

import { cloneTemplate } from './templates.js';
import { $, setText } from '../utils/dom.js';

const STATE_CLASSES = ['is-loading', 'is-empty', 'is-error'];

// 상태 화면을 자리요소 안에 그림
export function showStatus(slot, { type, message, linkText, linkHref, onRetry } = {}) {
  if (!slot) return null;
  clearStatus(slot);

  const el = cloneTemplate('status');
  const stateClass = `is-${type}`;
  el.classList.add(stateClass);
  slot.classList.add(stateClass);

  // 에러는 스크린리더가 바로 읽도록 alert, 로딩은 바쁨 표시
  if (type === 'error') el.setAttribute('role', 'alert');
  if (type === 'loading') el.setAttribute('aria-busy', 'true');

  setText(el, 'status-message', message);

  const link = $('status-link', el);
  if (link && linkText && linkHref) {
    link.textContent = linkText;
    link.href = linkHref;
    link.hidden = false;
  }

  const retry = $('status-retry', el);
  if (retry && typeof onRetry === 'function') {
    retry.hidden = false;
    retry.addEventListener('click', onRetry);
  }

  slot.append(el);
  return el;
}

// 상태 화면 지우기
export function clearStatus(slot) {
  if (!slot) return;
  slot.replaceChildren();
  STATE_CLASSES.forEach((cls) => slot.classList.remove(cls));
}
