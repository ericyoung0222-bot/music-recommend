// =====================================================================
// 로그인 페이지(login.html) 동작
// - 이미 로그인했으면 바로 원래 페이지(next)로 이동
// - 인앱 브라우저(카카오톡 등)면 외부 브라우저로 열라는 안내 표시
// - 구글 로그인 성공 → next 페이지로 이동
// =====================================================================

import { initLayout } from '../layout.js';
import { $, setBusy, setDisabled } from '../utils/dom.js';
import { readNextPath } from '../utils/page.js';
import { detectInAppBrowser, getExternalOpenUrl } from '../utils/inapp.js';
import {
  isAuthAvailable, getCurrentUser, loginWithGoogle, getAuthErrorMessage,
} from '../auth.js';
import { showStatus, clearStatus } from '../components/status.js';
import { showToast } from '../components/toast.js';

// 인앱 브라우저 안내 보이기
function setupInAppNotice() {
  const kind = detectInAppBrowser();
  const notice = $('inapp-notice');
  if (!kind || !notice) return;
  notice.hidden = false;

  const openLink = $('open-external', notice);
  const externalUrl = getExternalOpenUrl(kind);
  if (openLink && externalUrl) {
    openLink.href = externalUrl; // 우리가 만든 고정 형식의 주소
    openLink.hidden = false;
  }

  $('copy-url', notice)?.addEventListener('click', async () => {
    try {
      await window.navigator.clipboard.writeText(window.location.href);
      showToast('주소를 복사했어요. Chrome이나 Safari에 붙여 넣어 주세요.', { type: 'success' });
    } catch {
      showToast('복사하지 못했어요. 주소창의 주소를 직접 복사해 주세요.', { type: 'error' });
    }
  });
}

// 페이지 시작
async function main() {
  await initLayout();
  const button = $('google-login');
  const statusSlot = $('login-status');
  const next = readNextPath();

  setupInAppNotice();

  if (!isAuthAvailable()) {
    setDisabled(button, true);
    showStatus(statusSlot, {
      type: 'error',
      message: 'Firebase 설정이 아직 없어서 로그인할 수 없어요. README의 "Firebase 설정"을 보고 js/config.js를 채워 주세요.',
    });
    return;
  }

  // 이미 로그인한 상태면 바로 이동
  setBusy(button, true);
  const user = await getCurrentUser();
  setBusy(button, false);
  if (user) {
    window.location.replace(next);
    return;
  }

  button.addEventListener('click', async () => {
    clearStatus(statusSlot);
    setBusy(button, true);
    try {
      await loginWithGoogle();
      window.location.replace(next);
    } catch (error) {
      console.error('[login] 로그인 실패', error);
      const message = getAuthErrorMessage(error);
      if (message) showStatus(statusSlot, { type: 'error', message });
      setBusy(button, false);
    }
  });
}

main().catch((error) => console.error('[login] 초기화 실패', error));
