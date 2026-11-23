// 선택한 곡 칩 렌더링 (템플릿: "chip")
import { cloneTemplate } from './templates.js';
import { $, setText } from '../utils/dom.js';

// 칩 하나 만들기 (label: 보이는 글자, removeLabel: X 버튼 설명, onRemove: X를 눌렀을 때)
export function renderChip({ label, removeLabel, onRemove } = {}) {
  const chip = cloneTemplate('chip');
  setText(chip, 'chip-label', label);
  chip.title = label; // 글자가 잘려도 마우스를 올리면 전체가 보이게

  const removeButton = $('chip-remove', chip);
  if (removeButton) {
    removeButton.setAttribute('aria-label', removeLabel || `${label} 선택 취소`);
    removeButton.addEventListener('click', () => onRemove?.());
  }
  return chip;
}
