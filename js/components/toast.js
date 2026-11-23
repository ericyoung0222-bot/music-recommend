// =====================================================================
// 토스트 알림 (화면 아래에 잠깐 떴다 사라지는 메시지)
// 사용법: showToast('저장했어요', { type: 'success' })
//         showToast('로그인 후 평가할 수 있어요', { linkText: '로그인', linkHref: 'login.html' })
// =====================================================================

import { cloneTemplate } from './templates.js';
import { $, setText } from '../utils/dom.js';

const MAX_TOASTS = 3;

// 토스트 하나 띄우기
export function showToast(message, { type, linkText, linkHref, duration } = {}) {
  const region = $('toast-region');
  if (!region) {
    console.warn('[toast] toast-region이 없어요:', message);
    return null;
  }

  const el = cloneTemplate('toast');
  if (type) el.classList.add(`is-${type}`); // is-success / is-error
  if (type === 'error') el.setAttribute('role', 'alert');
  setText(el, 'toast-message', message);

  const link = $('toast-link', el);
  if (link && linkText && linkHref) {
    link.textContent = linkText;
    link.href = linkHref;
    link.hidden = false;
  }

  const remove = () => el.remove();
  $('toast-close', el)?.addEventListener('click', remove);

  // 너무 많이 쌓이지 않게 오래된 것부터 지움
  while (region.children.length >= MAX_TOASTS) region.firstElementChild.remove();
  region.append(el);

  // 링크가 있으면 누를 시간을 더 줌
  const time = duration ?? (linkText ? 7000 : 4000);
  window.setTimeout(remove, time);
  return el;
}
