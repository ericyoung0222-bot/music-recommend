// =====================================================================
// 시작 실패 안내 (일반 script — 모듈보다 먼저 실행됨)
// 페이지 JS나 그 JS가 쓰는 파일(예: Firebase CDN www.gstatic.com)을 못 불러오면
// 페이지가 "불러오는 중…"에서 멈춘 채 아무 안내가 없으므로, 그 자리에 이유를 알려 줍니다.
// (학교·회사 네트워크나 광고 차단 프로그램이 Google 서비스를 막는 경우 등)
// =====================================================================
(function () {
  // 파일을 더블클릭해서 연 경우(file://)는 브라우저가 JS 모듈을 막으므로 로컬 서버 안내
  var MESSAGE = window.location.protocol === 'file:'
    ? '파일을 더블클릭해서 열면 동작하지 않아요. README의 "로컬에서 실행하기"대로 npx serve . -l 5173 으로 열어 주세요.'
    : '필요한 파일을 불러오지 못했어요. 인터넷 연결이나 광고 차단 설정을 확인하고 새로고침해 주세요. '
      + '(학교·회사 네트워크에서는 Google 서비스가 막혀 있을 수 있어요)';
  var shown = false;

  window.addEventListener('error', function (event) {
    var target = event.target;
    // type="module" 스크립트를 불러오지 못한 경우만 (다른 오류는 각 페이지가 처리)
    if (shown || !(target instanceof HTMLScriptElement) || target.type !== 'module') return;
    shown = true;

    var slot = document.querySelector('[data-js="site-header"]');
    var notice = document.createElement('p');
    notice.className = 'boot-notice';
    notice.setAttribute('role', 'alert');
    notice.textContent = MESSAGE;
    if (slot) slot.replaceChildren(notice);
    else document.body.prepend(notice);
  }, true);
}());
