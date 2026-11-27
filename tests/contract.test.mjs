// =====================================================================
// 디자인 ↔ 기능 계약 검사 (설치 없음, 정적 검사)
// 실행: node tests/contract.test.mjs
//
// 디자인 PR(CSS, HTML class·문구 수정)이 기능을 깨뜨리지 않았는지 확인합니다.
//  1. JS가 찾는 data-js / data-template 이름이 HTML·partials·templates에 있는지
//  2. 템플릿: 이름이 하나씩만, 맨 바깥 요소가 하나, modal은 <dialog>, suggestion 바깥 요소에 data-js
//  3. 보안(CSP): 인라인 style= / <style> / 인라인 <script> / onclick 같은 속성 금지,
//     모든 페이지에 같은 CSP, 외부 CSS·글꼴 주소는 CSP에 허용된 곳만
//  4. 페이지: <body data-page>, 페이지 스크립트, 헤더·푸터 자리, 건너뛰기 링크(#main)
//  5. 처음에 숨겨 둬야 하는 요소의 hidden, 버튼 type, 별 data-score 1~5, 정렬 option 값
//  6. id 참조(for, aria-controls, aria-labelledby, href="#...")가 같은 페이지에 있는지
//  7. 기능용 CSS: [hidden]{display:none !important}, .visually-hidden, 건너뛰기 링크 :focus,
//     토스트 영역 pointer-events
//  8. HTML/CSS가 가리키는 로컬 파일(css, js, 이미지, 페이지)이 실제로 있는지
//
// 다른 폴더에서 검사하려면: node tests/contract.test.mjs <프로젝트 폴더>
// =====================================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------
// 설정: 기능이 기대하는 것들 (JS를 바꿀 때 같이 고치세요)
// ---------------------------------------------------------------------

// 처음에 hidden이어야 하는 data-js (JS는 필요할 때 보이게만 함)
const MUST_START_HIDDEN = {
  pages: ['page-content', 'results-section', 'suggestions', 'inapp-notice', 'open-external', 'rename-form'],
  partials: ['user-menu'],
  templates: ['status-link', 'status-retry', 'toast-link', 'card-meta', 'star-clear'],
};

// 템플릿별 맨 바깥 요소 조건
const TEMPLATE_ROOT_RULES = {
  modal: { tag: 'dialog', why: 'modal.js가 dialog.showModal()을 호출함' },
  suggestion: { dataJs: 'suggestion', why: '후보 선택/키보드 이동이 맨 바깥 요소 기준' },
};

// <select data-js="...">에 꼭 있어야 하는 option value
const REQUIRED_OPTION_VALUES = { 'ratings-sort': ['recent', 'score'] };

// ---------------------------------------------------------------------
// 도우미
// ---------------------------------------------------------------------

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const read = (file) => fs.readFileSync(file, 'utf8').replace(/^﻿/, '');

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });
}

const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
// JS 주석 제거 (문자열 속 "https://"는 남김)
const stripJsComments = (js) => js
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:\\'"`])\/\/[^\n]*/g, '$1');

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const TAG_RE = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
const ATTR_RE = /([^\s=>/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

// HTML 태그 목록 [{ tag, attrs, closing, selfClosing, index }]
function parseTags(html) {
  const tags = [];
  for (const m of stripHtmlComments(html).matchAll(TAG_RE)) {
    const attrs = {};
    for (const a of m[3].matchAll(ATTR_RE)) {
      attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? a[5] ?? '';
    }
    tags.push({ tag: m[2].toLowerCase(), attrs, closing: m[1] === '/', selfClosing: m[4] === '/', index: m.index });
  }
  return tags;
}
const openTags = (html) => parseTags(html).filter((t) => !t.closing);
const classesOf = (t) => (t.attrs.class || '').split(/\s+/).filter(Boolean);

// 맨 바깥 요소 목록 (템플릿 내용용)
function rootElements(html) {
  const roots = [];
  let depth = 0;
  for (const t of parseTags(html)) {
    if (t.closing) { depth -= 1; continue; }
    if (depth === 0) roots.push(t);
    if (!VOID_TAGS.has(t.tag) && !t.selfClosing) depth += 1;
  }
  return roots;
}

// CSS 규칙 목록 [{ selectors: [...], decls: { prop: value } }]
function parseCss(css) {
  const rules = [];
  for (const m of stripCssComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].trim().split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const decls = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i > 0) decls[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim().replace(/\s+/g, ' ');
    }
    rules.push({ selectors, decls });
  }
  return rules;
}
const rulesFor = (rules, selector) => rules.filter((r) => r.selectors.includes(selector));
const declOf = (rules, selector, prop) => rulesFor(rules, selector).map((r) => r.decls[prop]).filter(Boolean).pop();

// ---------------------------------------------------------------------
// 파일 읽기
// ---------------------------------------------------------------------

const pageFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => path.join(ROOT, f));
const partialFiles = {
  header: path.join(ROOT, 'partials', 'header.html'),
  footer: path.join(ROOT, 'partials', 'footer.html'),
  templates: path.join(ROOT, 'partials', 'templates.html'),
};
const jsFiles = walk(path.join(ROOT, 'js'), '.js').filter((f) => path.basename(f) !== 'config.js');
const cssFiles = walk(path.join(ROOT, 'css'), '.css');

const html = Object.fromEntries([...pageFiles, ...Object.values(partialFiles)].map((f) => [f, read(f)]));
const cssRules = cssFiles.flatMap((f) => parseCss(read(f)));
const headerFooter = html[partialFiles.header] + html[partialFiles.footer];

// 템플릿 { 이름: [내용, ...] }
const templateBodies = {};
for (const m of stripHtmlComments(html[partialFiles.templates]).matchAll(/<template\b([^>]*)>([\s\S]*?)<\/template>/g)) {
  const name = /data-template\s*=\s*"([^"]*)"/.exec(m[1])?.[1];
  if (name !== undefined) (templateBodies[name] ||= []).push(m[2]);
}
const templateOf = (name) => (templateBodies[name] || [''])[0];

const dataJsIn = (src) => openTags(src).map((t) => t.attrs['data-js']).filter(Boolean);

// JS가 쓰는 이름 수집
const JS_USE_RES = [
  { kind: 'one', re: /(?<![\w.$])\$\(\s*(['"`])([^'"`$]+)\1/g },
  { kind: 'many', re: /(?<![\w.$])\$\$\(\s*(['"`])([^'"`$]+)\1/g },
  { kind: 'one', re: /\b(?:setText|setLink)\(\s*[\w.]+\s*,\s*(['"`])([^'"`$]+)\1/g },
  { kind: 'one', re: /\binsertPartial\(\s*(['"`])([^'"`$]+)\1/g },
  { kind: 'one', re: /data-js\s*=\s*\\?(["'])([^"'$\\]+)\\?\1/g },
];
const jsUses = jsFiles.map((file) => {
  const src = stripJsComments(read(file));
  const names = new Map(); // name -> 'one' | 'many'
  for (const { kind, re } of JS_USE_RES) {
    for (const m of src.matchAll(re)) names.set(m[2], names.get(m[2]) === 'many' ? 'many' : kind);
  }
  const templates = [...src.matchAll(/\bcloneTemplate\(\s*(['"`])([^'"`$]+)\1/g)].map((m) => m[2]);
  return { file, names, templates };
});
const manyNames = new Set(jsUses.flatMap((u) => [...u.names].filter(([, k]) => k === 'many').map(([n]) => n)));

// 페이지 이름 ↔ 파일 (js/utils/page.js의 PAGE_FILES)
const pageJs = read(path.join(ROOT, 'js', 'utils', 'page.js'));
const pageFilesBlock = /PAGE_FILES\s*=\s*\{([\s\S]*?)\}/.exec(pageJs)?.[1] ?? '';
const PAGE_FILES = Object.fromEntries([...pageFilesBlock.matchAll(/(\w+)\s*:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));

// ---------------------------------------------------------------------
// 아주 작은 테스트 실행기
// ---------------------------------------------------------------------

let failed = 0;
let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  ✘ ${name}\n${String(error.message).split('\n').map((l) => `      ${l}`).join('\n')}`);
  }
}
// 문제 목록이 비어 있어야 통과
function expectNone(problems, title) {
  assert.ok(problems.length === 0, `${title}\n- ${problems.join('\n- ')}`);
}

// ---------------------------------------------------------------------
// 1. data-js / data-template 이름
// ---------------------------------------------------------------------
console.log('\n== 1. JS가 찾는 이름이 HTML에 있는지 ==');

const allHtmlDataJs = new Set(Object.values(html).flatMap(dataJsIn));

test('기본 검사 대상 파일을 찾음', () => {
  assert.ok(pageFiles.length >= 1, '루트에 *.html이 없어요');
  assert.ok(jsFiles.length >= 1, 'js/ 파일이 없어요');
  assert.ok(Object.keys(PAGE_FILES).length >= 1, 'js/utils/page.js에서 PAGE_FILES를 읽지 못했어요');
  for (const f of Object.values(partialFiles)) assert.ok(fs.existsSync(f), `${rel(f)} 파일이 없어요`);
});

test('JS가 쓰는 data-js 이름이 어딘가의 HTML에 있음', () => {
  const problems = [];
  for (const { file, names } of jsUses) {
    for (const name of names.keys()) {
      if (!allHtmlDataJs.has(name)) problems.push(`${rel(file)}: data-js="${name}"를 찾는데 HTML·partials·templates 어디에도 없어요`);
    }
  }
  expectNone(problems, '없는 data-js');
});

test('페이지 스크립트가 쓰는 이름이 그 페이지(+헤더·푸터·템플릿)에 있음', () => {
  const problems = [];
  for (const { file, names } of jsUses.filter((u) => /[\\/]pages[\\/][\w-]+-page\.js$/.test(u.file))) {
    const page = path.basename(file).replace(/-page\.js$/, '');
    const pageFile = PAGE_FILES[page] && path.join(ROOT, PAGE_FILES[page]);
    if (!pageFile || !html[pageFile]) { problems.push(`${rel(file)}: 짝이 되는 HTML(${page})을 못 찾음`); continue; }
    const scope = new Set(dataJsIn(html[pageFile] + headerFooter + html[partialFiles.templates]));
    for (const name of names.keys()) {
      if (!scope.has(name)) problems.push(`${rel(file)}: data-js="${name}"가 ${rel(pageFile)}에 없어요`);
    }
  }
  expectNone(problems, '페이지에 없는 data-js');
});

test('컴포넌트가 쓰는 이름이 자기 템플릿(또는 헤더·푸터)에 있음', () => {
  const problems = [];
  for (const { file, names, templates } of jsUses.filter((u) => u.templates.length && !/[\\/]pages[\\/]/.test(u.file))) {
    const scope = new Set(dataJsIn(templates.map(templateOf).join('') + headerFooter));
    for (const name of names.keys()) {
      if (!scope.has(name)) problems.push(`${rel(file)}: data-js="${name}"가 템플릿 ${templates.map((t) => `"${t}"`).join(', ')} 안에 없어요`);
    }
  }
  expectNone(problems, '템플릿 밖으로 옮겨진 data-js');
});

test('cloneTemplate로 부르는 템플릿이 정확히 하나씩 있음', () => {
  const problems = [];
  const used = new Set(jsUses.flatMap((u) => u.templates));
  for (const name of used) {
    const count = templateBodies[name]?.length ?? 0;
    if (count !== 1) problems.push(`data-template="${name}"가 ${count}개 (1개여야 함)`);
  }
  for (const [name, bodies] of Object.entries(templateBodies)) {
    if (bodies.length > 1 && !used.has(name)) problems.push(`data-template="${name}"가 ${bodies.length}개`);
  }
  expectNone(problems, '템플릿 개수 문제');
});

test('템플릿마다 맨 바깥 요소가 하나 (+ modal/suggestion 조건)', () => {
  const problems = [];
  for (const [name, bodies] of Object.entries(templateBodies)) {
    const roots = rootElements(bodies[0]);
    if (roots.length !== 1) {
      problems.push(`"${name}": 맨 바깥 요소가 ${roots.length}개 (<${roots.map((r) => r.tag).join('>, <')}>) → 첫 번째만 쓰이고 나머지는 사라져요`);
      continue;
    }
    const rule = TEMPLATE_ROOT_RULES[name];
    if (rule?.tag && roots[0].tag !== rule.tag) problems.push(`"${name}": 맨 바깥 요소가 <${roots[0].tag}> (<${rule.tag}>여야 함: ${rule.why})`);
    if (rule?.dataJs && roots[0].attrs['data-js'] !== rule.dataJs) problems.push(`"${name}": 맨 바깥 요소에 data-js="${rule.dataJs}"가 있어야 해요 (${rule.why})`);
  }
  expectNone(problems, '템플릿 구조 문제');
});

test('한 페이지(또는 템플릿) 안에서 data-js가 겹치지 않음 ($$로 찾는 이름 제외)', () => {
  const problems = [];
  const check = (label, src) => {
    const seen = new Map();
    for (const name of dataJsIn(src)) seen.set(name, (seen.get(name) || 0) + 1);
    for (const [name, count] of seen) {
      if (count > 1 && !manyNames.has(name)) problems.push(`${label}: data-js="${name}"가 ${count}개 (JS는 첫 번째만 씀)`);
    }
  };
  for (const f of pageFiles) check(rel(f), html[f] + headerFooter);
  for (const [name, bodies] of Object.entries(templateBodies)) check(`템플릿 "${name}"`, bodies[0]);
  expectNone(problems, '겹치는 data-js');
});

test('별점: data-js="star" 버튼 5개, data-score 1~5', () => {
  const stars = openTags(templateOf('star-rating')).filter((t) => t.attrs['data-js'] === 'star');
  assert.deepEqual(stars.map((t) => t.attrs['data-score']).sort(), ['1', '2', '3', '4', '5'], 'data-score가 1~5 하나씩이어야 해요');
  assert.ok(stars.every((t) => t.tag === 'button'), '별은 <button>이어야 해요 (키보드·disabled)');
});

test('<select>의 option value가 JS가 기대하는 값', () => {
  const problems = [];
  for (const [name, values] of Object.entries(REQUIRED_OPTION_VALUES)) {
    for (const f of pageFiles) {
      const src = stripHtmlComments(html[f]);
      const m = new RegExp(`<select\\b[^>]*data-js="${name}"[^>]*>([\\s\\S]*?)</select>`).exec(src);
      if (!m) continue;
      const found = openTags(m[1]).filter((t) => t.tag === 'option').map((t) => t.attrs.value);
      for (const v of values) if (!found.includes(v)) problems.push(`${rel(f)}: ${name}에 <option value="${v}">가 없어요`);
    }
  }
  expectNone(problems, 'option value 문제');
});

test('헤더 메뉴의 data-page가 실제 페이지 이름', () => {
  const links = openTags(html[partialFiles.header]).filter((t) => t.attrs['data-js'] === 'nav-link');
  assert.ok(links.length > 0, 'nav-link가 없어요');
  for (const l of links) assert.ok(l.attrs['data-page'] in PAGE_FILES, `nav-link data-page="${l.attrs['data-page']}"는 없는 페이지예요`);
});

// ---------------------------------------------------------------------
// 2. 보안(CSP)과 페이지 구조
// ---------------------------------------------------------------------
console.log('\n== 2. CSP와 페이지 구조 ==');

test('HTML에 인라인 style / <style> / 인라인 <script> / on... 속성 / javascript: 주소가 없음 (CSP)', () => {
  const problems = [];
  for (const [f, src] of Object.entries(html)) {
    const clean = stripHtmlComments(src);
    for (const t of openTags(clean)) {
      if ('style' in t.attrs) problems.push(`${rel(f)}: <${t.tag} style="..."> (CSP가 막음 → class와 CSS로)`);
      for (const a of Object.keys(t.attrs)) if (/^on[a-z]+$/.test(a)) problems.push(`${rel(f)}: <${t.tag} ${a}=...> (CSP가 막음)`);
      for (const a of ['href', 'src', 'action']) if (/^\s*javascript:/i.test(t.attrs[a] || '')) problems.push(`${rel(f)}: ${a}="javascript:..."`);
      if (t.tag === 'style') problems.push(`${rel(f)}: <style> 태그 (CSP가 막음 → css/ 파일로)`);
    }
    for (const m of clean.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/\bsrc\s*=/.test(m[1]) || m[2].trim()) problems.push(`${rel(f)}: 인라인 <script> (CSP가 막음)`);
    }
  }
  expectNone(problems, 'CSP 위반');
});

const cspOf = (src) => {
  const meta = openTags(src).find((t) => t.tag === 'meta' && (t.attrs['http-equiv'] || '').toLowerCase() === 'content-security-policy');
  return meta?.attrs.content ?? null;
};
const parseCsp = (csp) => Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v]));

test('모든 페이지에 같은 CSP meta가 있고 unsafe-inline이 없음', () => {
  const problems = [];
  const csps = new Set();
  for (const f of pageFiles) {
    const csp = cspOf(html[f]);
    if (!csp) { problems.push(`${rel(f)}: CSP meta가 없어요`); continue; }
    csps.add(csp);
    if (/unsafe-inline|unsafe-eval/.test(csp)) problems.push(`${rel(f)}: CSP에 unsafe-inline/unsafe-eval`);
  }
  if (csps.size > 1) problems.push(`페이지마다 CSP가 달라요 (${csps.size}가지) → 한 곳만 고친 것 같아요`);
  expectNone(problems, 'CSP meta 문제');
});

// CSP 소스 목록이 주소를 허용하는지 (간단 버전: 'self', https://host, https://*.host)
function cspAllows(sources = [], url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  return sources.some((s) => {
    if (s === '*' || s === `${u.protocol}`) return true;
    const m = /^(https?:)\/\/(\*\.)?([^/:]+)/.exec(s);
    if (!m || m[1] !== u.protocol) return false;
    return m[2] ? u.hostname.endsWith(`.${m[3]}`) : u.hostname === m[3];
  });
}

test('외부 CSS·글꼴·이미지 주소가 CSP에 허용된 곳 (예: 웹폰트 CDN 추가 시)', () => {
  const firstCsp = pageFiles.map((f) => cspOf(html[f])).find(Boolean);
  assert.ok(firstCsp, 'CSP가 없어 검사할 수 없어요');
  const csp = parseCsp(firstCsp);
  const pick = (k) => csp[k] || csp['default-src'] || [];
  const problems = [];
  for (const [f, src] of Object.entries(html)) {
    for (const t of openTags(src)) {
      if (t.tag === 'link' && /^https?:/i.test(t.attrs.href || '') && /stylesheet|preload/.test(t.attrs.rel || '')
        && !cspAllows(pick('style-src'), t.attrs.href)) problems.push(`${rel(f)}: <link href="${t.attrs.href}"> → CSP style-src에 없음 (개발 담당에게 요청)`);
    }
  }
  for (const f of cssFiles) {
    const css = stripCssComments(read(f));
    for (const m of css.matchAll(/@import\s+(?:url\()?\s*['"]?(https?:[^'")\s]+)/gi)) {
      if (!cspAllows(pick('style-src'), m[1])) problems.push(`${rel(f)}: @import ${m[1]} → CSP style-src에 없음`);
    }
    for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
      for (const m of block[1].matchAll(/url\(\s*['"]?(https?:[^'")\s]+)/gi)) {
        if (!cspAllows(pick('font-src'), m[1])) problems.push(`${rel(f)}: 글꼴 ${m[1]} → CSP font-src에 없음`);
      }
    }
    for (const m of css.replace(/@font-face\s*\{[^}]*\}/gi, '').replace(/@import[^;]*;/gi, '').matchAll(/url\(\s*['"]?(https?:[^'")\s]+)/gi)) {
      if (!cspAllows(pick('img-src'), m[1])) problems.push(`${rel(f)}: 이미지 ${m[1]} → CSP img-src에 없음`);
    }
  }
  expectNone(problems, 'CSP가 막는 외부 주소');
});

test('페이지마다 data-page, 페이지 스크립트, 헤더·푸터 자리가 있음', () => {
  const problems = [];
  for (const f of pageFiles) {
    const tags = openTags(html[f]);
    const body = tags.find((t) => t.tag === 'body');
    const page = body?.attrs['data-page'];
    if (!page) { problems.push(`${rel(f)}: <body data-page="...">가 없어요`); continue; }
    if (PAGE_FILES[page] !== path.basename(f)) problems.push(`${rel(f)}: data-page="${page}"인데 PAGE_FILES에는 ${PAGE_FILES[page] ?? '없음'}`);
    const want = `js/pages/${page}-page.js`;
    // ?v=... (캐시 무효화 번호)는 허용
    const script = tags.find((t) => t.tag === 'script' && (t.attrs.src || '').split('?')[0] === want);
    if (!script) problems.push(`${rel(f)}: <script type="module" src="${want}">가 없어요`);
    else if (script.attrs.type !== 'module') problems.push(`${rel(f)}: ${want}는 type="module"이어야 해요`);
    for (const slot of ['site-header', 'site-footer']) {
      if (!tags.some((t) => t.attrs['data-js'] === slot)) problems.push(`${rel(f)}: data-js="${slot}" 자리가 없어요 (헤더/푸터·토스트가 안 나옴)`);
    }
  }
  expectNone(problems, '페이지 구조 문제');
});

test('건너뛰기 링크(#main)와 <main id="main">', () => {
  const problems = [];
  for (const f of pageFiles) {
    const tags = openTags(html[f]);
    const skip = tags.find((t) => t.tag === 'a' && t.attrs.href === '#main');
    if (!skip) { problems.push(`${rel(f)}: <a href="#main"> 건너뛰기 링크가 없어요`); continue; }
    if (!tags.some((t) => t.attrs.id === 'main')) problems.push(`${rel(f)}: id="main"이 없어요`);
    const cls = classesOf(skip);
    const ok = cls.some((c) => rulesFor(cssRules, `.${c}`).length
      && cssRules.some((r) => r.selectors.some((s) => new RegExp(`^\\.${c}:focus(-visible|-within)?$`).test(s))));
    if (!ok) problems.push(`${rel(f)}: 건너뛰기 링크 class(${cls.join(' ') || '없음'})에 CSS 규칙과 :focus 규칙이 없어요`);
  }
  expectNone(problems, '건너뛰기 링크 문제');
});

test('처음에 숨겨 둬야 하는 요소에 hidden 속성이 있음', () => {
  const problems = [];
  const checkIn = (label, src, names) => {
    for (const t of openTags(src)) {
      if (names.includes(t.attrs['data-js']) && !('hidden' in t.attrs)) problems.push(`${label}: data-js="${t.attrs['data-js']}"에 hidden이 빠졌어요`);
    }
  };
  for (const f of pageFiles) checkIn(rel(f), html[f], MUST_START_HIDDEN.pages);
  checkIn('partials/header.html', html[partialFiles.header], MUST_START_HIDDEN.partials);
  checkIn('partials/templates.html', html[partialFiles.templates], MUST_START_HIDDEN.templates);
  expectNone(problems, 'hidden 누락');
});

test('모든 <button>에 type이 있음 (form 안에서 실수로 제출되지 않게)', () => {
  const problems = [];
  for (const [f, src] of Object.entries(html)) {
    for (const t of openTags(src)) {
      if (t.tag === 'button' && !t.attrs.type) problems.push(`${rel(f)}: <button${t.attrs['data-js'] ? ` data-js="${t.attrs['data-js']}"` : ''}>에 type이 없어요 (type="button")`);
    }
  }
  expectNone(problems, 'type 없는 버튼');
});

test('id 참조(for, aria-*, href="#...")가 같은 페이지에 있음', () => {
  const problems = [];
  for (const f of pageFiles) {
    const tags = openTags(html[f] + headerFooter);
    const ids = new Set(tags.map((t) => t.attrs.id).filter(Boolean));
    for (const t of tags) {
      const refs = [
        ['for', t.attrs.for],
        ['aria-controls', t.attrs['aria-controls']],
        ['aria-labelledby', t.attrs['aria-labelledby']],
        ['aria-describedby', t.attrs['aria-describedby']],
        ['href', /^#[^#]+$/.test(t.attrs.href || '') ? t.attrs.href.slice(1) : ''],
      ];
      for (const [attr, value] of refs) {
        for (const id of (value || '').split(/\s+/).filter(Boolean)) {
          if (!ids.has(id)) problems.push(`${rel(f)}: <${t.tag} ${attr}="${attr === 'href' ? '#' : ''}${id}">가 가리키는 id가 없어요`);
        }
      }
    }
  }
  expectNone(problems, '끊어진 id 참조');
});

test('HTML·CSS가 가리키는 로컬 파일이 있음', () => {
  const problems = [];
  const exists = (base, ref) => fs.existsSync(path.join(base, decodeURIComponent(ref.split(/[?#]/)[0])));
  const isLocal = (ref) => ref && !/^([a-z]+:|\/\/|#|data:)/i.test(ref);
  for (const [f, src] of Object.entries(html)) {
    for (const t of openTags(src)) {
      const refs = [];
      if (t.tag === 'link') refs.push(t.attrs.href);
      if (t.tag === 'script' || t.tag === 'img') refs.push(t.attrs.src);
      if (t.tag === 'a' && /\.html([?#]|$)/.test(t.attrs.href || '')) refs.push(t.attrs.href);
      // partials/templates는 페이지(루트) 기준 경로
      for (const ref of refs.filter(isLocal)) if (!exists(ROOT, ref)) problems.push(`${rel(f)}: "${ref}" 파일이 없어요`);
    }
  }
  for (const f of cssFiles) {
    for (const m of stripCssComments(read(f)).matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      if (isLocal(m[1]) && !exists(path.dirname(f), m[1])) problems.push(`${rel(f)}: url(${m[1]}) 파일이 없어요`);
    }
  }
  expectNone(problems, '없는 파일');
});

// ---------------------------------------------------------------------
// 3. 기능에 필요한 CSS
// ---------------------------------------------------------------------
console.log('\n== 3. 기능용 CSS ==');

test('[hidden] { display: none !important }', () => {
  const value = declOf(cssRules, '[hidden]', 'display');
  assert.ok(value && /^none\s*!important$/.test(value), `[hidden] 규칙이 없거나 바뀌었어요 (지금: ${value ?? '없음'}) → 숨긴 요소가 보이게 돼요`);
});

test('.visually-hidden이 화면에서 숨김 (스크린리더 전용 글자)', () => {
  assert.ok(rulesFor(cssRules, '.visually-hidden').length, '.visually-hidden 규칙이 없어요');
  assert.equal(declOf(cssRules, '.visually-hidden', 'position'), 'absolute', 'position: absolute가 필요해요');
  assert.equal(declOf(cssRules, '.visually-hidden', 'overflow'), 'hidden', 'overflow: hidden이 필요해요');
  const clip = declOf(cssRules, '.visually-hidden', 'clip') || declOf(cssRules, '.visually-hidden', 'clip-path');
  const tiny = declOf(cssRules, '.visually-hidden', 'width') === '1px';
  assert.ok(clip || tiny, 'clip(또는 clip-path)이나 width: 1px가 필요해요');
  // 쓰는 곳이 있으면 HTML에서 class를 지우지 않았는지도 확인
  const used = Object.values(html).some((src) => openTags(src).some((t) => classesOf(t).includes('visually-hidden')));
  assert.ok(used, 'HTML에서 visually-hidden class를 쓰는 곳이 하나도 없어요 (숨김 제목이 화면에 보일 수 있음)');
});

test('토스트 영역이 클릭을 막지 않고, 토스트 자체는 눌림', () => {
  const region = openTags(html[partialFiles.footer]).find((t) => t.attrs['data-js'] === 'toast-region');
  assert.ok(region, 'footer에 toast-region이 없어요');
  const toastRoot = rootElements(templateOf('toast'))[0];
  assert.ok(toastRoot, 'toast 템플릿이 없어요');
  const regionNone = classesOf(region).some((c) => declOf(cssRules, `.${c}`, 'pointer-events') === 'none');
  if (regionNone) {
    const toastAuto = classesOf(toastRoot).some((c) => declOf(cssRules, `.${c}`, 'pointer-events') === 'auto');
    assert.ok(toastAuto, '토스트 영역이 pointer-events: none인데 토스트에 pointer-events: auto가 없어요 → 닫기·로그인 링크가 안 눌려요');
  }
});

// ---------------------------------------------------------------------
console.log(failed ? `\n실패 ${failed}개 / 통과 ${passed}개` : `\n모든 계약 검사 통과 (${passed}개)`);
process.exitCode = failed ? 1 : 0;
