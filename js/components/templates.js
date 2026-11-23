// =====================================================================
// 컴포넌트 템플릿 불러오기
// partials/templates.html 안의 <template data-template="이름">을 읽어 두고,
// cloneTemplate("이름")으로 복사본을 만들어 줍니다.
// 덕분에 컴포넌트의 HTML/class는 디자이너가 HTML 파일에서만 고치면 됩니다.
// =====================================================================

const TEMPLATE_PATH = 'partials/templates.html';
const templates = new Map();
let loadingPromise = null;

// 템플릿 파일을 한 번만 불러옴 (여러 번 불러도 같은 Promise 반환)
export function loadTemplates() {
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const response = await fetch(TEMPLATE_PATH);
      if (!response.ok) throw new Error(`템플릿을 불러오지 못했어요 (${response.status})`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('template[data-template]').forEach((tpl) => {
        templates.set(tpl.dataset.template, tpl);
      });
    })();
  }
  return loadingPromise;
}

// 템플릿 복사본(맨 바깥 요소 하나)을 만들어 반환
export function cloneTemplate(name) {
  const tpl = templates.get(name);
  if (!tpl) {
    throw new Error(`partials/templates.html에서 "${name}" 템플릿을 찾을 수 없어요`);
  }
  const fragment = document.importNode(tpl.content, true);
  const element = fragment.firstElementChild;
  if (!element) throw new Error(`"${name}" 템플릿이 비어 있어요`);
  return element;
}
