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

  // 링크는 있을 때만 보이고, 아니면 숨김 (템플릿의 hidden이 빠져도 빈 링크가 보이지 않게)
  const link = $('toast-link', el);
  if (link) {
    const hasLink = Boolean(linkText && linkHref);
    link.hidden = !hasLink;
    if (hasLink) {
      link.textContent = linkText;
      link.href = linkHref;
    }
  }

  const remove = () => el.remove();
  $('toast-close', el)?.addEventListener('click', remove);

  // 너무 많이 쌓이지 않게 오래된 것부터 지움
  while (region.children.length >= MAX_TOASTS) region.firstElementChild.remove();
  region.append(el);

  // 링크가 있으면 누를 시간을 더 줌
  const time = duration ?? (linkText ? 7000 : 4000);
  let timer = window.setTimeout(remove, time);
  // 키보드로 들어가 있거나 마우스를 올려 둔 동안은 사라지지 않게 (링크를 누르기 전에 사라져 포커스를 잃지 않도록)
  const pause = () => window.clearTimeout(timer);
  const resume = () => {
    if (el.contains(document.activeElement) || el.matches(':hover')) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(remove, 3000);
  };
  el.addEventListener('focusin', pause);
  el.addEventListener('focusout', (event) => { if (!el.contains(event.relatedTarget)) resume(); });
  el.addEventListener('mouseenter', pause);
  el.addEventListener('mouseleave', resume);
  return el;
}
