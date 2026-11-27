// =====================================================================
// 모달 (브라우저 기본 <dialog> 사용 → Esc로 닫기, 포커스 가두기 자동 지원)
// openModal({ title, body })   : 내용 요소(body)를 넣은 모달 열기
// confirmModal({ message })    : "취소 / 확인" 모달, 확인을 누르면 true
// =====================================================================

import { cloneTemplate } from './templates.js';
import { $, setText } from '../utils/dom.js';

let modalCount = 0;

// 모달 열기. 닫히면 onClose 호출, 원래 포커스로 돌아감
export function openModal({ title, body, onClose } = {}) {
  const dialog = cloneTemplate('modal');
  const previousFocus = document.activeElement;

  // 제목을 모달 이름으로 연결 (스크린리더용)
  const titleEl = setText(dialog, 'modal-title', title);
  if (titleEl) {
    modalCount += 1;
    titleEl.id = `modal-title-${modalCount}`;
    dialog.setAttribute('aria-labelledby', titleEl.id);
  }

  if (body) $('modal-body', dialog)?.append(body);

  $('modal-close', dialog)?.addEventListener('click', () => dialog.close());

  // 모달 바깥(어두운 배경)을 눌렀다 뗐을 때만 닫기
  // - 상자 안(패딩 포함) 클릭은 무시 → 디자인에서 .modal에 padding을 줘도 안전
  // - 입력칸에서 드래그하다 바깥에서 손을 떼도 닫히지 않음 (입력한 내용 보호)
  // - 여는 버튼을 더블클릭해서 두 번째 클릭이 배경에 떨어져도 닫히지 않음
  const isOnBackdrop = (event) => {
    if (event.target !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right
      || event.clientY < box.top || event.clientY > box.bottom;
  };
  let pressedOnBackdrop = false;
  dialog.addEventListener('pointerdown', (event) => { pressedOnBackdrop = isOnBackdrop(event); });
  dialog.addEventListener('click', (event) => {
    const close = pressedOnBackdrop && isOnBackdrop(event) && event.detail < 2;
    pressedOnBackdrop = false;
    if (close) dialog.close();
  });

  // 닫히면 화면에서 지우고 원래 위치로 포커스 복귀
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (typeof onClose === 'function') onClose();
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  });

  document.body.append(dialog);
  dialog.showModal();

  return {
    dialog,
    close: () => dialog.close(),
  };
}

// 확인 모달. 확인 → true, 취소/닫기 → false
export function confirmModal({ title = '확인', message = '', confirmText = '확인', cancelText = '취소' } = {}) {
  return new Promise((resolve) => {
    let confirmed = false;
    const body = cloneTemplate('confirm-body');
    setText(body, 'confirm-message', message);

    const okButton = $('confirm-ok', body);
    const cancelButton = $('confirm-cancel', body);
    if (okButton) okButton.textContent = confirmText;
    if (cancelButton) cancelButton.textContent = cancelText;

    const modal = openModal({ title, body, onClose: () => resolve(confirmed) });

    okButton?.addEventListener('click', () => {
      confirmed = true;
      modal.close();
    });
    cancelButton?.addEventListener('click', () => modal.close());

    // 실수 방지: 처음 포커스는 "취소" 버튼에
    cancelButton?.focus();
  });
}
