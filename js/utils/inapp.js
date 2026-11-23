// =====================================================================
// 앱 안 브라우저(인앱 브라우저) 감지
// 카카오톡, 인스타그램, 에브리타임 등 앱 안에서 열린 화면에서는
// Google이 보안상 로그인을 막습니다(disallowed_useragent).
// =====================================================================

// 인앱 브라우저 종류 반환: 'kakao' | 'other' | null(일반 브라우저)
export function detectInAppBrowser(userAgent = window.navigator.userAgent) {
  if (/KAKAOTALK/i.test(userAgent)) return 'kakao';
  if (/NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|Whale\/.*inapp|; wv\)/i.test(userAgent)) {
    return 'other';
  }
  return null;
}

// 기본 브라우저로 여는 주소 (카카오톡, 안드로이드만 가능 / 그 외 null)
export function getExternalOpenUrl(kind, url = window.location.href) {
  if (kind === 'kakao') {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  }
  if (/Android/i.test(window.navigator.userAgent)) {
    const withoutScheme = url.replace(/^https?:\/\//, '');
    return `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return null;
}
