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

  // 링크·다시 시도 버튼은 필요할 때만 보이고, 아니면 숨김
  // (템플릿의 hidden 속성이 디자인 수정 중 빠져도 빈 링크나 눌러도 안 되는 버튼이 보이지 않게)
  const link = $('status-link', el);
  if (link) {
    const hasLink = Boolean(linkText && linkHref);
    link.hidden = !hasLink;
    if (hasLink) {
      link.textContent = linkText;
      link.href = linkHref;
    }
  }

  const retry = $('status-retry', el);
  if (retry) {
    retry.hidden = typeof onRetry !== 'function';
    if (!retry.hidden) retry.addEventListener('click', onRetry);
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
