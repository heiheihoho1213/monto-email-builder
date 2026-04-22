import type { CSSProperties } from 'react';

import { getFontFamily, styleToCss } from 'monto-email-block-text';
import type { TextProps } from 'monto-email-block-text';

import type { TStyle } from '../helpers/TStyle';

const FONT_ORDER = [
  'MODERN_SANS',
  'BOOK_SANS',
  'ORGANIC_SANS',
  'GEOMETRIC_SANS',
  'HEAVY_SANS',
  'ROUNDED_SANS',
  'MODERN_SERIF',
  'BOOK_SERIF',
  'MONOSPACE',
] as const;

function inferFontFamilyEnum(cssFont: string): TStyle['fontFamily'] {
  const s = cssFont.trim().toLowerCase();
  if (!s) return undefined;
  for (const key of FONT_ORDER) {
    const stack = getFontFamily(key);
    if (!stack) continue;
    const first = stack.split(',')[0].replace(/"/g, '').trim().toLowerCase();
    if (first && s.includes(first)) return key;
  }
  return undefined;
}

function rgbToHex(rgb: string): string | undefined {
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return undefined;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function getFlattenedText(root: Node): string {
  let out = '';
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let t: Node | null;
  while ((t = w.nextNode())) {
    out += t.textContent ?? '';
  }
  return out;
}

export function getFlattenedLength(root: Node): number {
  return getFlattenedText(root).length;
}

type Pos = { node: Node; offset: number };

/** 按“字符索引(0-based)”定位到该字符所在文本节点。用于样式读取，避免边界命中到前一节点末尾。 */
function resolveCharIndex(root: Node, charIndex: number): Pos | null {
  if (charIndex < 0) return null;
  let cur = 0;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let t: Node | null;
  while ((t = w.nextNode())) {
    const len = (t.textContent ?? '').length;
    if (len <= 0) continue;
    if (charIndex < cur + len) {
      return { node: t, offset: Math.max(0, charIndex - cur) };
    }
    cur += len;
  }
  return null;
}

function resolveOffset(root: Node, globalOffset: number): Pos | null {
  let cur = 0;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let t: Node | null;
  while ((t = w.nextNode())) {
    const len = (t.textContent ?? '').length;
    if (globalOffset <= cur + len) {
      return { node: t, offset: Math.max(0, globalOffset - cur) };
    }
    cur += len;
  }
  const lastText = lastTextNode(root);
  if (lastText && globalOffset === cur) {
    return { node: lastText, offset: (lastText.textContent ?? '').length };
  }
  return null;
}

function lastTextNode(root: Node): Node | null {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let t: Node | null;
  let last: Node | null = null;
  while ((t = w.nextNode())) last = t;
  return last;
}

export function offsetsToRange(root: HTMLElement, start: number, end: number): Range | null {
  if (start > end) return null;
  const total = getFlattenedLength(root);
  if (start < 0 || end > total) return null;
  const a = resolveOffset(root, start);
  const b = resolveOffset(root, end);
  if (!a || !b) return null;
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  return range;
}

export function rangeToOffsets(root: HTMLElement, range: Range): { start: number; end: number } {
  const start = getCharacterOffset(root, range.startContainer, range.startOffset);
  const end = getCharacterOffset(root, range.endContainer, range.endOffset);
  const s = Math.min(start, end);
  const e = Math.max(start, end);
  return { start: s, end: e };
}

/** focus 后若选区为空或不在 root 内，浏览器常不画 caret；仅在此时把折叠选区落到末尾（与 Heading/Button 编辑器一致） */
export function ensureCaretInContentEditable(root: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  let ok = false;
  if (sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    ok = root.contains(r.startContainer) && root.contains(r.endContainer);
  }
  if (ok) return;
  const range = document.createRange();
  const last = lastTextNode(root);
  if (last && last.nodeType === Node.TEXT_NODE) {
    const len = (last as Text).length;
    range.setStart(last, len);
    range.collapse(true);
  } else {
    range.selectNodeContents(root);
    range.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(range);
}

function getCharacterOffset(container: Node, targetNode: Node, targetOffset: number): number {
  try {
    const r = document.createRange();
    r.setStart(container, 0);
    r.setEnd(targetNode, targetOffset);
    return r.toString().length;
  } catch {
    return 0;
  }
}

export function getParagraphChildren(inner: HTMLElement): HTMLParagraphElement[] {
  return Array.from(inner.children).filter((c): c is HTMLParagraphElement => c.tagName === 'P');
}

function getParagraphOffsetRanges(inner: HTMLElement): { p: HTMLParagraphElement; start: number; end: number }[] {
  const out: { p: HTMLParagraphElement; start: number; end: number }[] = [];
  let off = 0;
  for (const p of getParagraphChildren(inner)) {
    const len = getFlattenedLength(p);
    out.push({ p, start: off, end: off + len });
    off += len;
  }
  return out;
}

function wrapRangeInSubtree(
  subtree: HTMLElement,
  localStart: number,
  localEnd: number,
  buildWrapper: () => HTMLElement
): void {
  const range = offsetsToRange(subtree, localStart, localEnd);
  if (!range || range.collapsed) return;
  const el = buildWrapper();
  try {
    range.surroundContents(el);
  } catch {
    const frag = range.extractContents();
    el.appendChild(frag);
    range.insertNode(el);
  }
}

function unwrapAllAnchorsInFragment(frag: DocumentFragment): void {
  let a: HTMLAnchorElement | null;
  while ((a = frag.querySelector('a'))) {
    const parent = a.parentNode;
    if (!parent) break;
    while (a.firstChild) {
      parent.insertBefore(a.firstChild, a);
    }
    parent.removeChild(a);
  }
}

/** 去掉片段内 span 壳，避免每次滑块再包一层产生兄弟 span */
function unwrapAllSpansInFragment(frag: DocumentFragment): void {
  // 变量 token 是原子节点：必须保留 span[data-text-variable]
  // 这里“只解包非变量 span”，避免边界行为导致空壳 span 遗留
  while (true) {
    const span = Array.from(frag.querySelectorAll('span')).find((s) => !(s as HTMLElement).hasAttribute('data-text-variable')) as
      | HTMLSpanElement
      | undefined;
    if (!span) break;
    const parent = span.parentNode;
    if (!parent) break;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  }
}

/**
 * 用 extract + 单 span 包裹，避免 surroundContents 在部分选区下拆出多个兄弟 span（导致字号不生效、DOM 暴涨）
 */
function wrapRangeWithSingleSpan(
  p: HTMLParagraphElement,
  localStart: number,
  localEnd: number,
  filtered: Record<string, string>
): void {
  const range = offsetsToRange(p, localStart, localEnd);
  if (!range || range.collapsed) return;

  const frag = range.extractContents();
  unwrapAllSpansInFragment(frag);
  const span = document.createElement('span');
  assignFilteredStyle(span, filtered);
  span.appendChild(frag);
  range.insertNode(span);
}

function ensureAnchorInlineStyle(a: HTMLAnchorElement): void {
  // 链接默认：跟随文本颜色。
  // 下划线不在 normalize 中强制（否则用户无法移除 underline）。
  if (!a.style.color) a.style.color = 'inherit';
}

function wrapRangeWithSingleAnchor(
  p: HTMLParagraphElement,
  localStart: number,
  localEnd: number,
  href: string,
  targetBlank: boolean
): void {
  const range = offsetsToRange(p, localStart, localEnd);
  if (!range || range.collapsed) return;

  const frag = range.extractContents();
  // 规则：若选区里已包含 a，则移除 a（保留内容），再整体包一个新的 a
  unwrapAllAnchorsInFragment(frag);

  const a = document.createElement('a');
  a.href = href;
  if (targetBlank) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  ensureAnchorInlineStyle(a);
  // 新建链接默认下划线，但后续允许用户移除（不会被 normalize 强制加回）
  if (!a.style.textDecoration) a.style.textDecoration = 'underline';
  a.appendChild(frag);
  range.insertNode(a);
}

function isOnlyStyleSpan(el: Element): el is HTMLSpanElement {
  return el.tagName === 'SPAN' && hasOnlyStyleAttribute(el as HTMLElement);
}

function hoistFullCoverSpanStyleIntoAnchor(a: HTMLAnchorElement): void {
  // 若 <a> 内只有一个“全覆盖”的 <span style=...>，把 span 的样式提升到 a 上并拆掉 span，避免 <a><span/></a>
  const childrenEls = Array.from(a.children);
  if (childrenEls.length !== 1) return;
  const only = childrenEls[0];
  if (!isOnlyStyleSpan(only)) return;
  const span = only as HTMLSpanElement;
  const aText = (a.textContent ?? '').replace(/\u200B/g, '');
  const sText = (span.textContent ?? '').replace(/\u200B/g, '');
  if (aText !== sText) return;
  // 只在 a 缺该属性时提升（不覆盖用户对 a 的显式设置）
  const st = span.style;
  const promote = (k: keyof CSSStyleDeclaration) => {
    const key = k as string;
    const v = (st as unknown as Record<string, string>)[key];
    if (!v) return;
    const cur = (a.style as unknown as Record<string, string>)[key];
    if (!cur) (a.style as unknown as Record<string, string>)[key] = v;
  };
  promote('fontSize');
  promote('fontFamily');
  promote('fontWeight');
  promote('fontStyle');
  promote('letterSpacing');
  promote('color');
  promote('backgroundColor');
  promote('textDecoration');
  unwrapElement(span);
}

function wrapRangeWithSpansPreservingAnchors(
  p: HTMLParagraphElement,
  localStart: number,
  localEnd: number,
  filtered: Record<string, string>,
  patch: Partial<TStyle>
): void {
  const range = offsetsToRange(p, localStart, localEnd);
  if (!range || range.collapsed) return;

  const frag = range.extractContents();
  unwrapAllSpansInFragment(frag);

  const out = document.createDocumentFragment();
  const buffer: Node[] = [];
  const flushBuffer = () => {
    if (buffer.length === 0) return;
    // 去掉空文本（含纯 ZWSP），避免生成空壳 span
    const nodes = buffer.filter((n) => {
      if (n.nodeType !== Node.TEXT_NODE) return true;
      const t = (n.textContent ?? '').replace(/\u200B/g, '');
      return t.length > 0;
    });
    buffer.length = 0;
    if (nodes.length === 0) return;
    const span = document.createElement('span');
    assignFilteredStyle(span, filtered);
    for (const n of nodes) span.appendChild(n);
    // 再防御一次：如果最终还是空（比如被浏览器吞掉内容），不插入
    const txt = (span.textContent ?? '').replace(/\u200B/g, '');
    if (txt.length === 0 && span.children.length === 0) return;
    out.appendChild(span);
  };

  for (const node of Array.from(frag.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'A') {
      flushBuffer();
      const a = node as HTMLAnchorElement;
      // 规则：已有 a 直接在 a 上加样式，不用新包 span
      applyInlineStylePatchToElement(a, patch);
      ensureAnchorInlineStyle(a);
      out.appendChild(a);
      continue;
    }
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).tagName === 'SPAN' &&
      (node as Element).hasAttribute('data-text-variable')
    ) {
      flushBuffer();
      const v = node as HTMLSpanElement;
      // 变量是原子节点：直接在变量 span 上追加样式（不包裹、不拆分）
      applyInlineStylePatchToElement(v, patch);
      out.appendChild(v);
      continue;
    }
    buffer.push(node);
  }
  flushBuffer();
  range.insertNode(out);
}

/** 避免把 undefined/null 写入 style，浏览器会序列化成 "undefined" 字面量 */
function filterCssForDomAssign(css: CSSProperties): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(css)) {
    if (v == null) continue;
    if (typeof v === 'string' && (v === 'undefined' || v === 'null')) continue;
    if (typeof v === 'number' && Number.isNaN(v)) continue;
    if (k === 'lineHeight') continue;
    if (k === 'fontSize' && typeof v === 'number') {
      out.fontSize = `${v}px`;
      continue;
    }
    out[k] = typeof v === 'number' ? String(v) : v;
  }
  return out;
}

function cssPropsForInlineStyle(merged: Partial<TStyle>): CSSProperties {
  const css = styleToCss(merged as NonNullable<TextProps['style']>);
  delete (css as Record<string, unknown>).lineHeight;
  return css;
}

function applyInlineStylePatchToElement(el: HTMLElement, patch: Partial<TStyle>): void {
  // patch 语义：undefined = 不变；null = 清空；其它值 = 设置
  const setRaw = (k: string, v: string) => {
    (el.style as unknown as Record<string, string>)[k] = v;
  };
  const clearRaw = (k: string) => {
    (el.style as unknown as Record<string, string>)[k] = '';
  };

  if (patch.color === null) clearRaw('color');
  else if (patch.color !== undefined) setRaw('color', String(patch.color));

  if (patch.backgroundColor === null) clearRaw('backgroundColor');
  else if (patch.backgroundColor !== undefined) setRaw('backgroundColor', String(patch.backgroundColor));

  if (patch.fontSize === null) clearRaw('fontSize');
  else if (patch.fontSize !== undefined) {
    const n = Number(patch.fontSize);
    if (!Number.isNaN(n)) setRaw('fontSize', `${n}px`);
  }

  if (patch.fontFamily === null) clearRaw('fontFamily');
  else if (patch.fontFamily !== undefined) {
    const ff = getFontFamily(patch.fontFamily as any);
    if (ff) setRaw('fontFamily', ff);
    else clearRaw('fontFamily');
  }

  if (patch.fontWeight === null) clearRaw('fontWeight');
  else if (patch.fontWeight !== undefined) setRaw('fontWeight', String(patch.fontWeight));

  if (patch.fontStyle === null) clearRaw('fontStyle');
  else if (patch.fontStyle !== undefined) setRaw('fontStyle', String(patch.fontStyle));

  if (patch.textDecoration === null) clearRaw('textDecoration');
  else if (patch.textDecoration !== undefined) {
    const v = String(patch.textDecoration);
    // 对 <a> 来说，“移除下划线”必须显式写 none，否则会回退到浏览器默认 underline
    if (v === 'none') setRaw('textDecoration', 'none');
    else setRaw('textDecoration', v);
  }

  if (patch.letterSpacing === null) clearRaw('letterSpacing');
  else if (patch.letterSpacing !== undefined) {
    const v = patch.letterSpacing;
    if (typeof v === 'number') setRaw('letterSpacing', `${v}px`);
    else setRaw('letterSpacing', String(v));
  }
}

/** 段内 offset 精确命中同一 span：相同选区再次改样式时直接改该 span，避免生成嵌套 span。 */
function findSpanToMergeByOffsets(
  p: HTMLParagraphElement,
  localStart: number,
  localEnd: number
): HTMLSpanElement | null {
  const spans = Array.from(p.querySelectorAll('span')) as HTMLSpanElement[];
  for (const span of spans) {
    const r = document.createRange();
    r.selectNodeContents(span);
    const { start, end } = rangeToOffsets(p, r);
    if (start === localStart && end === localEnd) {
      return span;
    }
  }
  return null;
}

/** 变量 span 是“原子节点”：当选区精确等于该 span（元素本身）时，直接在该 span 上打补丁，避免把相邻空格包成新 span。 */
function findVariableSpanToMergeByOffsets(
  p: HTMLParagraphElement,
  localStart: number,
  localEnd: number
): HTMLSpanElement | null {
  const spans = Array.from(p.querySelectorAll('span[data-text-variable]')) as HTMLSpanElement[];
  for (const span of spans) {
    const r = document.createRange();
    r.selectNode(span);
    const { start, end } = rangeToOffsets(p, r);
    if (start === localStart && end === localEnd) return span;
  }
  return null;
}

function assignFilteredStyle(el: HTMLElement, filtered: Record<string, string>): void {
  for (const [k, v] of Object.entries(filtered)) {
    (el.style as unknown as Record<string, string>)[k] = v;
  }
}

function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

function hasOnlyStyleAttribute(el: HTMLElement): boolean {
  if (el.attributes.length === 0) return true;
  if (el.attributes.length === 1 && el.hasAttribute('style')) return true;
  return false;
}

function normalizeStyleCssText(styleText: string | null): string {
  const raw = (styleText ?? '').trim().toLowerCase();
  if (!raw) return '';
  const pairs = raw
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean)
    .sort();
  return pairs.join(';');
}

function canMergeSpan(a: HTMLSpanElement, b: HTMLSpanElement): boolean {
  if (!hasOnlyStyleAttribute(a) || !hasOnlyStyleAttribute(b)) return false;
  return normalizeStyleCssText(a.getAttribute('style')) === normalizeStyleCssText(b.getAttribute('style'));
}

function normalizeHrefForCompare(a: HTMLAnchorElement): string {
  // 用 attribute 优先，避免浏览器把相对路径规范化成绝对 URL 造成误判
  return (a.getAttribute('href') ?? '').trim();
}

function canMergeAnchor(a: HTMLAnchorElement, b: HTMLAnchorElement): boolean {
  // 只在关键属性完全一致时合并
  if (normalizeHrefForCompare(a) !== normalizeHrefForCompare(b)) return false;
  if ((a.getAttribute('target') ?? '') !== (b.getAttribute('target') ?? '')) return false;
  if ((a.getAttribute('rel') ?? '') !== (b.getAttribute('rel') ?? '')) return false;
  return normalizeStyleCssText(a.getAttribute('style')) === normalizeStyleCssText(b.getAttribute('style'));
}

function isSpanMeaningless(span: HTMLSpanElement): boolean {
  if (!hasOnlyStyleAttribute(span)) return false;
  const styleText = normalizeStyleCssText(span.getAttribute('style'));
  if (!styleText) return true;
  // 纯空格也可能承载有效样式（与 Word 行为一致），不能因为 trim 后为空就移除。
  // 仅当去掉 ZWSP 后确实没有任何字符时，才认为是无意义 span。
  const text = (span.textContent ?? '').replace(/\u200B/g, '');
  return text.length === 0;
}

function normalizeInlineDom(root: HTMLElement): void {
  const walk = (parent: HTMLElement) => {
    let i = 0;
    while (i < parent.childNodes.length) {
      const node = parent.childNodes[i];
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        walk(el);
        if (el.tagName === 'A') {
          // 选区跨普通文本与链接时，extract/surround 可能拆出空 <a> 壳；应移除壳但保留内容
          const txt = (el.textContent ?? '').replace(/\u200B/g, '').trim();
          if (txt.length === 0) {
            unwrapElement(el);
            continue;
          }
          hoistFullCoverSpanStyleIntoAnchor(el as HTMLAnchorElement);
          ensureAnchorInlineStyle(el as HTMLAnchorElement);
        }
        if (el.tagName === 'SPAN') {
          const span = el as HTMLSpanElement;
          // 防御：变量 token 文本被错误抽走时会留下空壳变量 span，应直接移除
          if (span.hasAttribute('data-text-variable')) {
            const txt = (span.textContent ?? '').replace(/\u200B/g, '');
            if (txt.length === 0) {
              parent.removeChild(span);
              continue;
            }
          }
          if (isSpanMeaningless(span)) {
            unwrapElement(span);
            continue;
          }
          if (normalizeStyleCssText(span.getAttribute('style')) === '' && hasOnlyStyleAttribute(span)) {
            unwrapElement(span);
            continue;
          }
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        // 删除纯空白文本节点，减少分裂后的噪音节点
        if ((node.textContent ?? '') === '') {
          parent.removeChild(node);
          continue;
        }
      }
      i++;
    }

    i = 0;
    while (i < parent.childNodes.length - 1) {
      const a = parent.childNodes[i];
      const b = parent.childNodes[i + 1];
      if (
        a.nodeType === Node.ELEMENT_NODE &&
        b.nodeType === Node.ELEMENT_NODE &&
        (a as HTMLElement).tagName === 'SPAN' &&
        (b as HTMLElement).tagName === 'SPAN' &&
        canMergeSpan(a as HTMLSpanElement, b as HTMLSpanElement)
      ) {
        const left = a as HTMLSpanElement;
        const right = b as HTMLSpanElement;
        while (right.firstChild) {
          left.appendChild(right.firstChild);
        }
        parent.removeChild(right);
        continue;
      }
      i++;
    }

    i = 0;
    while (i < parent.childNodes.length - 1) {
      const a = parent.childNodes[i];
      const b = parent.childNodes[i + 1];
      if (
        a.nodeType === Node.ELEMENT_NODE &&
        b.nodeType === Node.ELEMENT_NODE &&
        (a as HTMLElement).tagName === 'A' &&
        (b as HTMLElement).tagName === 'A' &&
        canMergeAnchor(a as HTMLAnchorElement, b as HTMLAnchorElement)
      ) {
        const left = a as HTMLAnchorElement;
        const right = b as HTMLAnchorElement;
        while (right.firstChild) {
          left.appendChild(right.firstChild);
        }
        parent.removeChild(right);
        continue;
      }
      i++;
    }
  };
  walk(root);
}

function stripEditorVariableDecoration(root: HTMLElement): void {
  const vars = Array.from(root.querySelectorAll('[data-text-variable]')) as HTMLElement[];
  for (const el of vars) {
    // 仅移除编辑态可视化壳样式，保留用户设置的文本样式（如 color/fontSize/backgroundColor）。
    el.style.removeProperty('border');
    el.style.removeProperty('border-radius');
    el.style.removeProperty('padding');
    el.style.removeProperty('box-shadow');
    el.style.removeProperty('user-select');
    el.style.removeProperty('-webkit-user-select');
  }
}

/** 侧栏传入的增量；global 为块级默认样式，用于首次包 span 时的初始行内表现 */
export type ApplyInlineStyleInput = {
  patch: Partial<TStyle>;
  global: TextProps['style'] | null | undefined;
};

/** 对象展开时 undefined 会覆盖前序已有字段，必须把 patch 里的 undefined 键去掉 */
function dropUndefinedKeys<T extends Record<string, unknown>>(o: T): Partial<TStyle> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<TStyle>;
}

/** 已有 span 且选区整段等于该 span：只把本次 patch 叠到行内，不覆盖未出现在 patch 里的属性 */
function mergePatchOntoSpan(span: HTMLSpanElement, patch: Partial<TStyle>): void {
  applyInlineStylePatchToElement(span, patch);
}

export function applyInlineStyleToRange(
  inner: HTMLElement,
  start: number,
  end: number,
  input: ApplyInlineStyleInput
): void {
  const { patch, global } = input;
  const patchClean = dropUndefinedKeys((patch ?? {}) as Record<string, unknown>);
  const patchHasKeys = Object.keys(patchClean).length > 0;
  const ranges = getParagraphOffsetRanges(inner);
  for (const { p, start: ps, end: pe } of ranges) {
    const s = Math.max(start, ps);
    const e = Math.min(end, pe);
    if (s >= e) continue;
    const range = offsetsToRange(p, s - ps, e - ps);
    if (!range || range.collapsed) continue;

    // offsetsToRange 会把元素选区映射到内部 text node。
    // 若选区边界落在同一个变量 span 内，extractContents 会把 token 文本掏空，留下空壳变量 span（看起来像“末尾空 span”）。
    // 这里必须直接在变量 span 上打补丁。
    try {
      const asEl = (n: Node) => (n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null));
      const sEl = asEl(range.startContainer);
      const eEl = asEl(range.endContainer);
      const sv = (sEl?.closest?.('[data-text-variable]') as HTMLElement | null) ?? null;
      const ev = (eEl?.closest?.('[data-text-variable]') as HTMLElement | null) ?? null;
      if (sv && sv === ev) {
        if (patchHasKeys) {
          applyInlineStylePatchToElement(sv, patchClean);
        }
        normalizeInlineDom(p);
        continue;
      }
    } catch {
      // ignore
    }

    // 变量原子：若选区刚好等于变量 span（元素本身），只改该 span，避免产生“末尾空 span”
    const mergeVar = findVariableSpanToMergeByOffsets(p, s - ps, e - ps);
    if (mergeVar) {
      if (patchHasKeys) {
        applyInlineStylePatchToElement(mergeVar, patchClean);
      }
      normalizeInlineDom(p);
      continue;
    }

    const mergeInto = findSpanToMergeByOffsets(p, s - ps, e - ps);
    if (mergeInto) {
      if (patchHasKeys) {
        mergePatchOntoSpan(mergeInto, patchClean);
      }
      normalizeInlineDom(p);
      continue;
    }

    const inlineSnap = readInlineStyleFromRangeForApply(inner, s, e);
    const mergedForNewSpan = { ...global, ...inlineSnap, ...patchClean };
    const filtered = filterCssForDomAssign(cssPropsForInlineStyle(mergedForNewSpan));
    if (Object.keys(filtered).length === 0) continue;

    // 若选区包含 a：只包纯文本，a 上直接加样式，避免 a 被包进 span 或被拆出多余 a
    const nodeRange = offsetsToRange(p, s - ps, e - ps);
    // 选区在 <a> 内部时，cloneContents 往往带不出 <a> 壳；此时不要插 span，直接改该 <a>
    const styleAnchorsIfSelectionInside = () => {
      if (!nodeRange || nodeRange.collapsed) return false;
      const startEl =
        nodeRange.startContainer.nodeType === Node.ELEMENT_NODE
          ? (nodeRange.startContainer as Element)
          : (nodeRange.startContainer.parentElement as Element | null);
      const endEl =
        nodeRange.endContainer.nodeType === Node.ELEMENT_NODE
          ? (nodeRange.endContainer as Element)
          : (nodeRange.endContainer.parentElement as Element | null);
      const aStart = startEl?.closest('a') as HTMLAnchorElement | null;
      const aEnd = endEl?.closest('a') as HTMLAnchorElement | null;
      if (aStart) {
        assignFilteredStyle(aStart, filtered);
        ensureAnchorInlineStyle(aStart);
      }
      if (aEnd && aEnd !== aStart) {
        assignFilteredStyle(aEnd, filtered);
        ensureAnchorInlineStyle(aEnd);
      }
      return Boolean(aStart || aEnd);
    };
    const extractedHasAtomic = (() => {
      if (!nodeRange || nodeRange.collapsed) return false;
      const frag = nodeRange.cloneContents();
      // 原子节点：链接与变量都不能被包进新 span
      return !!frag.querySelector?.('a,[data-text-variable]');
    })();
    if (extractedHasAtomic) {
      wrapRangeWithSpansPreservingAnchors(p, s - ps, e - ps, filtered, patchClean);
    } else if (styleAnchorsIfSelectionInside()) {
      // 选区在链接内部：只改 a，不插 span
    } else {
      wrapRangeWithSingleSpan(p, s - ps, e - ps, filtered);
    }
    normalizeInlineDom(p);
  }
}

export function applyLinkToRange(
  inner: HTMLElement,
  start: number,
  end: number,
  href: string,
  targetBlank: boolean
): void {
  const ranges = getParagraphOffsetRanges(inner);
  for (const { p, start: ps, end: pe } of ranges) {
    const s = Math.max(start, ps);
    const e = Math.min(end, pe);
    if (s >= e) continue;
    wrapRangeWithSingleAnchor(p, s - ps, e - ps, href, targetBlank);
    normalizeInlineDom(p);
  }
}

export function getLinkAtOffset(inner: HTMLElement, offset: number): { href: string; targetBlank: boolean } | null {
  const len = getFlattenedLength(inner);
  if (len === 0) return null;
  const pos = resolveOffset(inner, Math.min(offset, len - 1));
  if (!pos) return null;
  let el: Element | null =
    pos.node.nodeType === Node.TEXT_NODE ? (pos.node.parentElement as Element | null) : (pos.node as Element);
  while (el && el !== inner) {
    if (el.tagName === 'A') {
      const a = el as HTMLAnchorElement;
      return { href: a.getAttribute('href') ?? a.href, targetBlank: a.target === '_blank' };
    }
    el = el.parentElement;
  }
  return null;
}

export function getLinkAtOffsetFromHtmlString(html: string, offset: number): { href: string; targetBlank: boolean } | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return null;
  return getLinkAtOffset(root, offset);
}

export function getLinkInRangeFromHtmlString(
  html: string,
  start: number,
  end: number
): { href: string; targetBlank: boolean } | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return null;
  const len = getFlattenedLength(root);
  if (len === 0) return null;
  const s = Math.max(0, Math.min(start, len - 1));
  const e = Math.max(s + 1, Math.min(end, len));
  // 选区内逐字符探测，命中任意一个链接字符即回填该链接。
  for (let i = s; i < e; i++) {
    const link = getLinkAtOffset(root, i);
    if (link) return link;
  }
  return null;
}

export function readInlineStyleAtOffsetFromHtmlString(html: string, offset: number): Partial<TStyle> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return {};
  return readInlineStyleAtOffset(root, offset);
}

export function readInlineStyleInRangeFromHtmlString(html: string, start: number, end: number): Partial<TStyle> {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return {};
  const len = getFlattenedLength(root);
  if (len === 0) return {};
  const clamp = (o: number) => Math.max(0, Math.min(o, len - 1));
  // 侧栏显示规则：跨样式选区时以“最右侧字符”为准（空格也参与统计，贴近 Word 体验）
  // 仅忽略编辑器内部占位 ZWSP。
  const s = clamp(start);
  const e = clamp(end > start ? end - 1 : start);
  const flat = getFlattenedText(root);
  let probe = e;
  for (let i = e; i >= s; i--) {
    const ch = flat[i] ?? '';
    if (ch !== '\u200B') {
      probe = i;
      break;
    }
  }
  return readInlineStyleAtOffset(root, probe);
}

const VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function extractVariableNamesFromHtmlString(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return [];
  const text = getFlattenedText(root);
  return extractVariableNamesFromText(text);
}

function queryInsertedVariableElements(html: string): HTMLElement[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // 正文常为多个并列块级节点（多 p），不能只用 firstElementChild，否则漏掉后续段落里的变量
  return Array.from(doc.body.querySelectorAll('[data-text-variable]')) as HTMLElement[];
}

/** 只识别“插入式变量 span[data-text-variable]”，不识别用户手打的 {{...}} 文本 */
export function extractInsertedVariableNamesFromHtmlString(html: string): string[] {
  const out = new Set<string>();
  for (const el of queryInsertedVariableElements(html)) {
    const token = (el.getAttribute('data-text-variable') ?? '').trim();
    if (token.startsWith('{{') && token.endsWith('}}')) {
      const name = token.slice(2, -2);
      if (VARIABLE_NAME_RE.test(name)) out.add(name);
    }
  }
  return Array.from(out).sort();
}

export type InsertedVariableKind = { name: string; builtin: boolean; instanceId: string };

function parseDataTextVariableToken(token: string): Omit<InsertedVariableKind, 'instanceId'> | null {
  const t = token.trim();
  if (t.startsWith('{{') && t.endsWith('}}')) {
    const n = t.slice(2, -2);
    if (VARIABLE_NAME_RE.test(n)) return { name: n, builtin: false };
  }
  if (t.startsWith('{%') && t.endsWith('%}')) {
    const n = t.slice(2, -2);
    if (VARIABLE_NAME_RE.test(n)) return { name: n, builtin: true };
  }
  return null;
}

/** 新建插入式变量实例的稳定 id（落库在 span data-variable-instance-id） */
export function createVariableInstanceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 为 margin 内每个变量 span 补齐 data-variable-instance-id，并把 variableDefaults 从「按变量名」迁移为「按实例 id」。
 * 旧数据：variableDefaults[middle_name] 会赋给 DOM 中第一个 {{middle_name}} 实例，其余同名实例默认空串。
 */
export function migrateVariableInstanceIdsInMargin(
  margin: HTMLElement,
  variableDefaults: Record<string, string> | null | undefined,
): { variableDefaults: Record<string, string>; domTouched: boolean } {
  const vdIn = variableDefaults ? { ...variableDefaults } : {};
  let domTouched = false;

  const allSpans = Array.from(margin.querySelectorAll('[data-text-variable]')) as HTMLElement[];
  for (const el of allSpans) {
    if (!el.getAttribute('data-variable-instance-id')?.trim()) {
      el.setAttribute('data-variable-instance-id', createVariableInstanceId());
      domTouched = true;
    }
  }

  const instanceIdsInDom = new Set<string>();
  for (const el of allSpans) {
    const iid = el.getAttribute('data-variable-instance-id')?.trim();
    if (iid) instanceIdsInDom.add(iid);
  }

  const newVd: Record<string, string> = {};

  for (const k of Object.keys(vdIn)) {
    if (instanceIdsInDom.has(k)) {
      newVd[k] = vdIn[k] ?? '';
    }
  }

  const legacyNameValue = new Map<string, string>();
  for (const k of Object.keys(vdIn)) {
    if (instanceIdsInDom.has(k)) continue;
    if (VARIABLE_NAME_RE.test(k)) {
      legacyNameValue.set(k, vdIn[k] ?? '');
    }
  }

  const nameIndex = new Map<string, number>();
  for (const el of allSpans) {
    const parsed = parseDataTextVariableToken(el.getAttribute('data-text-variable') ?? '');
    if (!parsed || parsed.builtin) continue;
    const iid = el.getAttribute('data-variable-instance-id')?.trim();
    if (!iid) continue;

    const idx = nameIndex.get(parsed.name) ?? 0;
    nameIndex.set(parsed.name, idx + 1);

    if (newVd[iid] !== undefined) continue;

    if (Object.prototype.hasOwnProperty.call(vdIn, iid)) {
      newVd[iid] = vdIn[iid] ?? '';
    } else if (idx === 0 && legacyNameValue.has(parsed.name)) {
      newVd[iid] = legacyNameValue.get(parsed.name)!;
    } else {
      newVd[iid] = '';
    }
  }

  return { variableDefaults: newVd, domTouched };
}

/** 每个 span[data-text-variable] 一条，DOM 顺序，不去重（同 token 多次出现会多条） */
export function extractInsertedVariableOccurrencesFromHtmlString(html: string): InsertedVariableKind[] {
  const out: InsertedVariableKind[] = [];
  for (const el of queryInsertedVariableElements(html)) {
    const parsed = parseDataTextVariableToken(el.getAttribute('data-text-variable') ?? '');
    if (!parsed) continue;
    const instanceId = (el.getAttribute('data-variable-instance-id') ?? '').trim();
    out.push({ ...parsed, instanceId });
  }
  return out;
}

/**
 * 插入式变量按 DOM 顺序列出（同一块内去重）；含 `{{name}}` 与 `{%name%}`。
 * 去重键优先 instanceId，否则按 builtin+name（无 id 的旧 HTML）。
 */
export function extractInsertedVariablesWithKindFromHtmlString(html: string): InsertedVariableKind[] {
  const seen = new Set<string>();
  const out: InsertedVariableKind[] = [];
  for (const el of queryInsertedVariableElements(html)) {
    const parsed = parseDataTextVariableToken(el.getAttribute('data-text-variable') ?? '');
    if (!parsed) continue;
    const instanceId = (el.getAttribute('data-variable-instance-id') ?? '').trim();
    const key = instanceId ? `i:${instanceId}` : `${parsed.builtin ? 'b' : 'u'}:${parsed.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...parsed, instanceId });
  }
  return out;
}

export function extractVariableNamesFromText(text: string): string[] {
  const out = new Set<string>();
  // 规则：{{...}} 中间不能有空格/换行
  const re = /\{\{([^\s{}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    if (VARIABLE_NAME_RE.test(name)) out.add(name);
  }
  return Array.from(out).sort();
}

export function extractBuiltinVariableNamesFromText(text: string): string[] {
  const out = new Set<string>();
  // 规则：{%...%} 中间不能有空格/换行
  const re = /\{\%([^\s%{}]+)\%\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    if (VARIABLE_NAME_RE.test(name)) out.add(name);
  }
  return Array.from(out).sort();
}

export function isOffsetInsideVariableToken(text: string, offset: number): boolean {
  const off = Math.max(0, Math.min(offset, text.length));
  const check = (open: string, close: string) => {
    const left = text.lastIndexOf(open, off);
    if (left < 0) return false;
    const right = text.indexOf(close, off);
    if (right < 0) return false;
    const inside = text.slice(left + open.length, right);
    if (!inside) return false;
    if (/\s/.test(inside)) return false; // 中间不能有空格/换行
    return off > left && off < right + close.length;
  };
  return check('{{', '}}') || check('{%', '%}');
}

/** 从 text 节点向外遍历时，内层样式应先写入 merged；外层不得覆盖已有键（否则内层字号会被外层「继承到的」值盖住） */
function mergeInlineFromStyleDeclaration(st: CSSStyleDeclaration, merged: Partial<TStyle>): void {
  if (st.color && merged.color == null) {
    const c = st.color.trim();
    merged.color = c.startsWith('#') ? c : rgbToHex(c) ?? c;
  }
  if (st.backgroundColor && merged.backgroundColor == null) {
    const c = st.backgroundColor.trim();
    merged.backgroundColor = c.startsWith('#') ? c : rgbToHex(c) ?? c;
  }
  if (st.fontSize && merged.fontSize == null) {
    const px = parseFloat(st.fontSize);
    if (!Number.isNaN(px)) merged.fontSize = px;
  }
  if (st.fontFamily && st.fontFamily !== 'undefined' && merged.fontFamily == null) {
    const ff = inferFontFamilyEnum(st.fontFamily);
    if (ff) merged.fontFamily = ff;
  }
  if (merged.fontWeight == null) {
    const w = st.fontWeight;
    if (w === 'bold' || w === 'bolder' || w === '700') merged.fontWeight = 'bold';
    else if (typeof w === 'string' && w.trim() !== '') {
      const n = parseInt(w, 10);
      if (!Number.isNaN(n) && n >= 600) merged.fontWeight = 'bold';
    }
  }
  if (st.fontStyle === 'italic' && merged.fontStyle == null) merged.fontStyle = 'italic';
  if (st.textDecoration && st.textDecoration !== 'none' && merged.textDecoration == null) {
    merged.textDecoration = st.textDecoration.includes('line-through')
      ? st.textDecoration.includes('underline')
        ? 'underline line-through'
        : 'line-through'
      : st.textDecoration.includes('underline')
        ? 'underline'
        : 'none';
  }
  if (st.letterSpacing && st.letterSpacing !== 'normal' && merged.letterSpacing == null) {
    const ls = st.letterSpacing.endsWith('px') ? parseFloat(st.letterSpacing) : st.letterSpacing;
    merged.letterSpacing = ls as number | string;
  }
}

/** 包 span 前从选区多点采样：部分选区时单点 offset 可能落在未包 span 的文本上，导致读不到字号 */
function readInlineStyleFromRangeForApply(inner: HTMLElement, start: number, end: number): Partial<TStyle> {
  const len = getFlattenedLength(inner);
  if (len === 0) return {};
  const clamp = (o: number) => Math.max(0, Math.min(o, len - 1));
  if (end <= start) return readInlineStyleAtOffset(inner, clamp(start));
  const probes = [clamp(start), clamp(Math.floor((start + end - 1) / 2)), clamp(end - 1)];
  const uniq = [...new Set(probes)];
  const merged: Partial<TStyle> = {};
  let maxFont = -1;
  const fillKeys: (keyof TStyle)[] = [
    'color',
    'backgroundColor',
    'fontFamily',
    'fontWeight',
    'fontStyle',
    'textDecoration',
    'letterSpacing',
  ];
  for (const off of uniq) {
    const part = readInlineStyleAtOffset(inner, off);
    if (typeof part.fontSize === 'number') maxFont = Math.max(maxFont, part.fontSize);
    for (const k of fillKeys) {
      const v = part[k];
      if (v != null && merged[k] == null) (merged as Record<string, unknown>)[k as string] = v;
    }
  }
  if (maxFont >= 0) merged.fontSize = maxFont;
  return merged;
}

export function readInlineStyleAtOffset(inner: HTMLElement, offset: number): Partial<TStyle> {
  const total = getFlattenedLength(inner);
  const idx = Math.min(offset, Math.max(0, total - 1));
  const pos = resolveCharIndex(inner, idx);
  if (!pos) return {};
  let el: Element | null =
    pos.node.nodeType === Node.TEXT_NODE ? (pos.node.parentElement as Element | null) : (pos.node as Element);
  const merged: Partial<TStyle> = {};
  while (el && el !== inner) {
    const tag = el.tagName;
    if (tag === 'SPAN' || tag === 'A') {
      mergeInlineFromStyleDeclaration((el as HTMLElement).style, merged);
    }
    if (tag === 'STRONG' || tag === 'B') {
      if (merged.fontWeight == null) merged.fontWeight = 'bold';
    }
    if (tag === 'I' || tag === 'EM') {
      if (merged.fontStyle == null) merged.fontStyle = 'italic';
    }
    el = el.parentElement;
  }
  return merged;
}

/** 空段占位：无 ZWSP 时扁平 offset 无法区分多个空 <p> */
const ZWSP = '\u200B';

export function ensureParagraphStructure(inner: HTMLElement): void {
  if (getParagraphChildren(inner).length === 0) {
    const p = document.createElement('p');
    p.style.margin = '0';
    p.appendChild(document.createTextNode(ZWSP));
    p.appendChild(document.createElement('br'));
    inner.appendChild(p);
    return;
  }
  for (const p of getParagraphChildren(inner)) {
    p.style.margin = '0';
    const text = getFlattenedText(p);
    if (text.length === 0) {
      p.textContent = '';
      p.appendChild(document.createTextNode(ZWSP));
      p.appendChild(document.createElement('br'));
    }
  }
}

/** 复制到剪贴板：去掉 ZWSP，段落无分隔拼接 */
export function getFlattenedTextForCopy(root: Node): string {
  return getFlattenedText(root).replace(/\u200B/g, '');
}

export function serializeBodyHtml(marginRoot: HTMLElement): string {
  const cloned = marginRoot.cloneNode(true) as HTMLElement;
  ensureParagraphStructure(cloned);
  for (const p of getParagraphChildren(cloned)) {
    normalizeInlineDom(p);
  }
  stripEditorVariableDecoration(cloned);
  return cloned.outerHTML;
}
