import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Text, TextProps, getResolvedTextBodyHtml, styleToCss } from 'monto-email-block-text';

import {
  applyInlineStyleToRange,
  applyLinkToRange,
  createVariableInstanceId,
  ensureParagraphStructure,
  extractInsertedVariableOccurrencesFromHtmlString,
  getFlattenedLength,
  getFlattenedText,
  getFlattenedTextForCopy,
  migrateVariableInstanceIdsInMargin,
  offsetsToRange,
  rangeToOffsets,
  readInlineStyleAtOffset,
  serializeBodyHtml,
} from './textDom';
import { useCurrentBlockId } from '../../editor/EditorBlock';
import {
  clearTextDomApplyRequest,
  editorStateStore,
  markLastInlineStyleApply,
  setDocument,
  setLastTextBlockContent,
  setTextCaret,
  setTextSelection,
  useSelectedBlockId,
  useTextCaret,
  useContactAttributes,
  useTextDomApplyRequest,
  useTextSelection,
} from '../../editor/EditorContext';
import { BASE_VARIABLE_GROUPS, buildAllowedVariableNameSets } from './variableCatalog';

function getPaddingCss(style: TextProps['style']): string | undefined {
  const p = style?.padding;
  if (!p) return undefined;
  return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

function insertPlainTextWithNewlines(marginRoot: HTMLElement, raw: string): void {
  marginRoot.focus();
  const normalized = raw.replace(/\r\n/g, '\n');
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '\n') {
      document.execCommand('insertParagraph', false);
    } else {
      document.execCommand('insertText', false, ch);
    }
  }
  ensureParagraphStructure(marginRoot);
}

function placeCaretByPoint(root: HTMLElement, x: number, y: number): boolean {
  const docWithCaretRange = document as Document & {
    caretRangeFromPoint?: (px: number, py: number) => Range | null;
    caretPositionFromPoint?: (px: number, py: number) => { offsetNode: Node; offset: number } | null;
  };
  let range: Range | null = null;
  if (docWithCaretRange.caretPositionFromPoint) {
    const pos = docWithCaretRange.caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  } else if (docWithCaretRange.caretRangeFromPoint) {
    range = docWithCaretRange.caretRangeFromPoint(x, y);
  }
  if (!range) return false;
  if (!root.contains(range.startContainer)) return false;
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  return true;
}

function placeCaretAtEnd(root: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtEndOfLastParagraph(root: HTMLElement): void {
  ensureParagraphStructure(root);
  const ps = root.querySelectorAll('p');
  const last = ps.length ? (ps[ps.length - 1] as HTMLParagraphElement) : null;
  if (!last) {
    placeCaretAtEnd(root);
    return;
  }
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(last);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function forceCollapseSelectionIn(root: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const r = sel.getRangeAt(0);
  const inRoot = root.contains(r.startContainer) && root.contains(r.endContainer);
  if (!inRoot) return;
  if (r.collapsed) return;
  const cr = document.createRange();
  cr.setStart(r.endContainer, r.endOffset);
  cr.collapse(true);
  sel.removeAllRanges();
  sel.addRange(cr);
}

function createVariableSpan(tokenText: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = tokenText;
  span.setAttribute('data-text-variable', tokenText);
  span.setAttribute('data-variable-instance-id', createVariableInstanceId());
  // 变量作为不可编辑原子：内部不允许回车/拆分
  span.contentEditable = 'false';
  // 有些浏览器/序列化路径只认 attribute；显式写入，保证落库/HTML 里可见
  span.setAttribute('contenteditable', 'false');
  // 再写一份驼峰 attribute（某些 DOM inspector/序列化路径更“偏好”它；重复无害）
  span.setAttribute('contentEditable', 'false');
  // 显示为整体 token（允许整体换行到下一行，但不允许 token 内部断行）
  span.style.whiteSpace = 'nowrap';
  span.style.display = 'inline-block';
  span.style.overflowWrap = 'normal';
  span.style.wordBreak = 'normal';
  applyEditorVariableDecoration(span);
  return span;
}

function applyEditorVariableDecoration(span: HTMLElement): void {
  // 选择行为：任何触达都“整体选中”，避免变量被部分选中后套样式破坏结构
  (span.style as any).userSelect = 'all';
  (span.style as any).webkitUserSelect = 'all';
  // 视觉高亮：边框 + 轻微底色（不用 backgroundColor，避免与用户设置的背景色冲突）
  span.style.border = '1px solid rgba(25, 118, 210, 0.55)';
  span.style.borderRadius = '4px';
  span.style.padding = '0 4px';
  span.style.boxShadow = 'inset 0 -999px 0 rgba(25, 118, 210, 0.08)';
}

function ensureVariableSpanAttrs(el: HTMLElement): void {
  if (!el.hasAttribute('data-text-variable')) return;
  // property + attribute 双写，避免出现“property 是 false 但 attribute 不落库/不展示”的情况
  try {
    (el as any).contentEditable = 'false';
  } catch {
    // ignore
  }
  el.setAttribute('contenteditable', 'false');
  el.setAttribute('contentEditable', 'false');
}

function ensureEditableRootAttrs(el: HTMLElement): void {
  try {
    (el as any).contentEditable = 'true';
  } catch {
    // ignore
  }
  el.setAttribute('contenteditable', 'true');
  el.setAttribute('contentEditable', 'true');
}

function isPlaceholderParagraph(p: HTMLParagraphElement): boolean {
  const txt = (p.textContent ?? '').replace(/\u200B/g, '');
  return !!p.querySelector('br') && txt.length === 0;
}

function computeMessageFromMargin(margin: HTMLElement): string {
  const ps = Array.from(margin.querySelectorAll('p')) as HTMLParagraphElement[];
  const lines: string[] = [];
  for (const p of ps) {
    if (isPlaceholderParagraph(p)) {
      lines.push('');
      continue;
    }
    lines.push(getFlattenedTextForCopy(p));
  }
  return lines.join('\n');
}

/** 与 monto-email-block-text `props.variables` 对齐，按 DOM 顺序落库 */
function buildPropsVariablesFromBodyHtml(html: string) {
  return extractInsertedVariableOccurrencesFromHtmlString(html)
    .filter((o) => o.instanceId)
    .map((o) => ({
      variableInstanceId: o.instanceId,
      attribute: o.name,
      variable: o.builtin ? `{%${o.name}%}` : `{{${o.name}}}`,
    }));
}

function insertVariableTokenAtCaret(margin: HTMLElement, token: string): void {
  const sel = window.getSelection();
  if (!sel) return;
  if (sel.rangeCount === 0) {
    placeCaretAtEndOfLastParagraph(margin);
  }
  if (sel.rangeCount === 0) return;
  const r0 = sel.getRangeAt(0);
  if (!margin.contains(r0.startContainer) || !margin.contains(r0.endContainer)) {
    placeCaretAtEndOfLastParagraph(margin);
  }
  if (sel.rangeCount === 0) return;
  const r = sel.getRangeAt(0);
  // 没有落在 <p> 内时，强制把插入点移动到最后一个 <p> 末尾
  const startNode =
    r.startContainer.nodeType === Node.ELEMENT_NODE ? (r.startContainer as Element) : r.startContainer.parentElement;
  const inP = !!startNode?.closest('p');
  if (!inP) {
    placeCaretAtEndOfLastParagraph(margin);
  }
  if (sel.rangeCount === 0) return;
  const r2 = sel.getRangeAt(0);
  // 不允许在“旧版变量 span”内部继续插入（兼容历史内容）
  const startEl =
    r2.startContainer.nodeType === Node.ELEMENT_NODE
      ? (r2.startContainer as Element)
      : (r2.startContainer.parentElement as Element | null);
  const inVariable = startEl?.closest('[data-text-variable]') as HTMLElement | null;
  if (inVariable) {
    // 若恢复的 caret 落在变量原子内部，自动移到变量后继续插入，避免“点击插入无反应”。
    const rr = document.createRange();
    rr.setStartAfter(inVariable);
    rr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(rr);
  }

  const current = sel.getRangeAt(0);
  current.deleteContents();
  // 变量以“span 原子节点”插入（用于稳定识别与禁止内部换行）
  const span = createVariableSpan(token);
  current.insertNode(span);

  const after = document.createRange();
  after.setStartAfter(span);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}

function normalizeKnownVariableTokensInMargin(
  margin: HTMLElement,
  allowedUser: Set<string>,
  allowedBuiltin: Set<string>
): boolean {
  const full = getFlattenedText(margin);
  if (!full) return false;

  const re = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}|\{\%([A-Za-z_][A-Za-z0-9_]*)\%\}/g;
  const matches: Array<{ start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(full))) {
    const name = m[1] ?? m[2];
    const isUser = !!m[1];
    const allowed = isUser ? allowedUser : allowedBuiltin;
    if (!allowed.has(name)) continue;
    matches.push({ start: m.index, end: m.index + m[0].length });
  }
  if (matches.length === 0) return false;

  const asEl = (n: Node) => (n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null));

  let changed = false;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end } = matches[i];
    const r = offsetsToRange(margin, start, end);
    if (!r) continue;

    const sp = asEl(r.startContainer)?.closest('p');
    const ep = asEl(r.endContainer)?.closest('p');
    if (!sp || !ep || sp !== ep) continue;

    const sa = asEl(r.startContainer)?.closest('a');
    const ea = asEl(r.endContainer)?.closest('a');
    if (sa !== ea) continue;

    const tokenText = full.slice(start, end);
    const startVar = asEl(r.startContainer)?.closest?.('[data-text-variable]') as HTMLElement | null;
    const endVar = asEl(r.endContainer)?.closest?.('[data-text-variable]') as HTMLElement | null;
    // 若 token 已经完整落在同一个变量 span 内，且该 span 本身就是正确 token，则不做任何处理
    if (startVar && startVar === endVar) {
      const curToken = startVar.textContent ?? '';
      const attrToken = startVar.getAttribute('data-text-variable') ?? '';
      if (curToken === tokenText && attrToken === tokenText) continue;
      // 否则用“替换整个 span 元素”的方式归一化，避免掏空旧 span 留下空壳
      try {
        const rr = document.createRange();
        rr.setStartBefore(startVar);
        rr.setEndAfter(startVar);
        rr.deleteContents();
        rr.insertNode(createVariableSpan(tokenText));
        changed = true;
        continue;
      } catch {
        // fallback to range replacement below
      }
    }

    // 如果已经在同一 text node 且内容一致，就跳过
    if (r.startContainer === r.endContainer && r.startContainer.nodeType === Node.TEXT_NODE) {
      const t = r.startContainer.textContent ?? '';
      if (t.slice(r.startOffset, r.endOffset) === tokenText) continue;
    }

    // 用单个“变量 span”替换 token 覆盖范围内内容（span/碎片会被移除并归一化）
    r.deleteContents();
    r.insertNode(createVariableSpan(tokenText));
    changed = true;
  }

  if (changed) {
    // 清理空的变量 span（常见于某些浏览器/execCommand 边界行为）
    const vars = Array.from(margin.querySelectorAll('[data-text-variable]')) as HTMLElement[];
    for (const el of vars) {
      const txt = (el.textContent ?? '').replace(/\u200B/g, '');
      if (txt.length === 0) {
        el.parentElement?.removeChild(el);
      }
    }
  }

  return changed;
}

export default function TextEditor(props: TextProps) {
  const blockId = useCurrentBlockId();
  const selectedBlockId = useSelectedBlockId();
  const textSelection = useTextSelection();
  const textCaret = useTextCaret();
  const contactAttributes = useContactAttributes();
  const textDomApplyRequest = useTextDomApplyRequest();

  const shellRef = useRef<HTMLDivElement>(null);
  const marginRootRef = useRef<HTMLElement | null>(null);
  const lastSyncedHtmlRef = useRef<string>('');
  const isEditingRef = useRef(false);
  const mouseDownPointRef = useRef<{ x: number; y: number } | null>(null);
  const inputRafRef = useRef<number | null>(null);

  const isSelected = selectedBlockId === blockId;

  const { allowedUser, allowedBuiltin } = useMemo(
    () => buildAllowedVariableNameSets({ baseGroups: BASE_VARIABLE_GROUPS, contactAttributes }),
    [contactAttributes]
  );

  // 明确需求：用户手打的 {{...}}/{%...%} 永远当普通文本，不做变量识别与限制。

  const baseStyle = {
    ...styleToCss(props.style ?? null),
    textAlign: props.style?.textAlign ?? undefined,
    padding: getPaddingCss(props.style ?? null),
    margin: 0,
  };

  const syncHtmlFromProps = useCallback(() => {
    if (!isSelected) return;
    const shell = shellRef.current;
    if (!shell || isEditingRef.current) return;
    const next = getResolvedTextBodyHtml(props.props ?? null);
    // Strict Mode 会卸载再挂载：ref 仍保留旧 lastSynced，但 shell 已是新空节点，必须强制灌入
    const domEmpty = !shell.innerHTML.trim() || !shell.firstElementChild;
    const marginEl = shell.firstElementChild as HTMLElement | null;
    const focusInsideEditable =
      !!marginEl &&
      marginEl.isConnected &&
      (document.activeElement === marginEl || marginEl.contains(document.activeElement));
    // 焦点已在可编辑区内时不要用 props 覆盖 innerHTML：serialize 与 getResolved 的细微差异会整段替换 DOM，选区会落到开头
    if (focusInsideEditable && !domEmpty) {
      if (next === lastSyncedHtmlRef.current) return;
      return;
    }
    if (!domEmpty && next === lastSyncedHtmlRef.current) return;
    shell.innerHTML = next;
    lastSyncedHtmlRef.current = next;
    marginRootRef.current = shell.firstElementChild as HTMLElement | null;
  }, [props.props, isSelected]);

  useLayoutEffect(() => {
    syncHtmlFromProps();
  }, [syncHtmlFromProps, props.props?.html, props.props?.text, props.props?.message, props.props?.variables, isSelected]);

  const updateDocumentHtml = useCallback(
    (html: string, message: string, variableDefaultsOverride?: Record<string, string>) => {
      const currentBlock = editorStateStore.getState().document[blockId];
      if (!currentBlock || currentBlock.type !== 'Text') return;
      lastSyncedHtmlRef.current = html;
      const variables = buildPropsVariablesFromBodyHtml(html);
      setDocument({
        [blockId]: {
          ...currentBlock,
          data: {
            ...currentBlock.data,
            props: {
              ...(currentBlock.data.props as object),
              html,
              message,
              variables,
              ...(variableDefaultsOverride !== undefined ? { variableDefaults: variableDefaultsOverride } : {}),
            },
          },
        },
      });
    },
    [blockId],
  );

  const handleBlur = useCallback(() => {
    isEditingRef.current = false;
    const margin = marginRootRef.current;
    if (!margin) return;
    ensureParagraphStructure(margin);
    const { variableDefaults: nextVd } = migrateVariableInstanceIdsInMargin(margin, props.props?.variableDefaults ?? null);
    const html = serializeBodyHtml(margin);
    const message = computeMessageFromMargin(margin);
    updateDocumentHtml(html, message, nextVd);
  }, [updateDocumentHtml, props.props?.variableDefaults]);

  /** 选中块后把历史 HTML 上的变量实例 id / 默认值迁移到「按实例 id」存储，避免侧栏与 getVariables 不一致 */
  useLayoutEffect(() => {
    if (!isSelected) return;
    const margin = marginRootRef.current;
    if (!margin) return;
    const { variableDefaults: nextVd, domTouched } = migrateVariableInstanceIdsInMargin(
      margin,
      props.props?.variableDefaults ?? null,
    );
    const prev = props.props?.variableDefaults ?? {};
    if (!domTouched && JSON.stringify(nextVd) === JSON.stringify(prev)) return;
    const html = serializeBodyHtml(margin);
    const message = computeMessageFromMargin(margin);
    updateDocumentHtml(html, message, nextVd);
  }, [isSelected, blockId, props.props?.html, props.props?.text, props.props?.message, props.props?.variables, updateDocumentHtml]);

  useEffect(() => {
    if (!isSelected) return;
    const shell = shellRef.current;
    if (!shell) return;
    marginRootRef.current = shell.firstElementChild as HTMLElement | null;
    const margin = marginRootRef.current;
    if (!margin) return;

    ensureEditableRootAttrs(margin);
    margin.setAttribute('data-monto-text-block-id', blockId);
    margin.style.outline = 'none';
    margin.style.cursor = 'text';
    // 防御：历史内容/外部灌入的 HTML 可能缺少变量的 contenteditable attribute
    for (const v of Array.from(margin.querySelectorAll('[data-text-variable]')) as HTMLElement[]) {
      ensureVariableSpanAttrs(v);
      applyEditorVariableDecoration(v);
    }

    const selectionNormalizeLockRef = { current: false };
    const normalizeSelectionForVariableAtomic = (sel: Selection): Range | null => {
      if (selectionNormalizeLockRef.current) return null;
      if (sel.rangeCount === 0) return null;
      const r = sel.getRangeAt(0);
      if (!margin.contains(r.startContainer) || !margin.contains(r.endContainer)) return null;

      const asEl = (n: Node) =>
        n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
      const sEl = asEl(r.startContainer);
      const eEl = asEl(r.endContainer);
      const sv = (sEl?.closest?.('[data-text-variable]') as HTMLElement | null) ?? null;
      const ev = (eEl?.closest?.('[data-text-variable]') as HTMLElement | null) ?? null;

      // 只要触达变量（起点/终点在变量内，或选区内容包含变量），就按“原子”规则归一化选区
      const intersectedVars = (() => {
        try {
          const vars = Array.from(margin.querySelectorAll('[data-text-variable]')) as HTMLElement[];
          const out: HTMLElement[] = [];
          for (const v of vars) {
            // intersectsNode: 选区部分覆盖变量时为 true（拖选进入变量的关键）
            if (r.intersectsNode(v)) out.push(v);
          }
          return out;
        } catch {
          return [];
        }
      })();

      const hitsVar = !!sv || !!ev || intersectedVars.length > 0;
      if (!hitsVar) return null;

      const target = sv ?? ev ?? intersectedVars[0] ?? null;
      if (!target) return null;
      ensureVariableSpanAttrs(target);

      try {
        selectionNormalizeLockRef.current = true;
        const rr = document.createRange();
        if (r.collapsed) {
          // caret 绝不允许落在变量内部：强制到变量后
          rr.setStartAfter(target);
          rr.collapse(true);
        } else {
          // 不允许“部分选中变量”：
          // - 若用户拖选从外侧进入变量：扩展 range 边界，把变量整体纳入选区
          // - 若用户只选中变量内部：退化为整块选中该变量
          const first = intersectedVars.length ? intersectedVars[0] : target;
          const last = intersectedVars.length ? intersectedVars[intersectedVars.length - 1] : target;

          // 是否“完全落在单个变量内部”
          const startInVar = !!sv;
          const endInVar = !!ev;
          const onlyOne = first === last;
          if (onlyOne && startInVar && endInVar) {
            rr.selectNode(first);
          } else {
            // 默认：保留原来的 start/end，只在 start/end 命中变量时扩展到变量边界
            rr.setStart(r.startContainer, r.startOffset);
            rr.setEnd(r.endContainer, r.endOffset);
            if (startInVar) rr.setStartBefore(sv as Node);
            if (endInVar) rr.setEndAfter(ev as Node);
            // 若选区内容包含变量但 start/end 不在变量内（例如跨越变量的中段），也要扩展覆盖到变量边界
            try {
              if (!startInVar && intersectedVars.length > 0) {
                // 若 range 起点落在第一个变量之后，但 range 与第一个变量相交，说明是“中段覆盖”，把 start 调到变量前
                if (r.comparePoint(first, 0) > 0) rr.setStartBefore(first);
              }
            } catch {
              // ignore
            }
            try {
              if (!endInVar && intersectedVars.length > 0) {
                // 同理 end
                if (r.comparePoint(last, (last.textContent ?? '').length) < 0) rr.setEndAfter(last);
              }
            } catch {
              // ignore
            }
          }
        }
        sel.removeAllRanges();
        sel.addRange(rr);
        return rr;
      } finally {
        // 下一帧再解锁，避免 selectionchange 递归触发
        requestAnimationFrame(() => {
          selectionNormalizeLockRef.current = false;
        });
      }
    };

    const syncSelectionFromDom = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setTextSelection(null);
        setTextCaret(null);
        return;
      }
      // 变量必须是原子：先把 DOM selection 归一化（整块选中/光标移出）
      const normalized = normalizeSelectionForVariableAtomic(sel);
      const range = normalized ?? sel.getRangeAt(0);
      if (!margin.contains(range.startContainer) || !margin.contains(range.endContainer)) return;
      if (range.collapsed) {
        setTextSelection(null);
        const { start } = rangeToOffsets(margin, range);
        setTextCaret({ blockId, offset: start });
        return;
      }
      const { start, end } = rangeToOffsets(margin, range);
      const flat = getFlattenedText(margin);
      const s = Math.max(0, Math.min(start, end));
      const e = Math.min(flat.length, Math.max(start, end));
      if (s >= e) {
        setTextSelection(null);
        setTextCaret({ blockId, offset: s });
        return;
      }
      const snap = readInlineStyleAtOffset(margin, s);
      setLastTextBlockContent({ blockId, text: flat, styleSnapshot: snap });
      setTextSelection({ blockId, start: s, end: e });
      setTextCaret({ blockId, offset: e });
    };

    const syncLiveTextSnapshot = () => {
      inputRafRef.current = null;
      const flat = getFlattenedText(margin);
      const sel = window.getSelection();
      let snap: Record<string, unknown> = {};
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (margin.contains(r.startContainer) && margin.contains(r.endContainer)) {
          const { start } = rangeToOffsets(margin, r);
          snap = readInlineStyleAtOffset(margin, Math.min(Math.max(start, 0), Math.max(flat.length - 1, 0)));
        }
      }
      setLastTextBlockContent({ blockId, text: flat, styleSnapshot: snap as any });
    };

    // 明确需求：不对手打 token 做任何“识别/归一化”。

    const onSelectionChange = () => {
      syncSelectionFromDom();
    };

    const onInput = () => {
      isEditingRef.current = true;
      if (inputRafRef.current == null) {
        inputRafRef.current = requestAnimationFrame(syncLiveTextSnapshot);
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const plain = e.clipboardData?.getData('text/plain') ?? '';
      // 若当前选区命中变量，先把 caret 移到变量后，避免 paste 替换变量
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0);
          const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
          if (inMargin) {
            const asEl = (n: Node) =>
              n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
            const sEl = asEl(r.startContainer);
            const eEl = asEl(r.endContainer);
            const v =
              (sEl?.closest?.('[data-text-variable]') as HTMLElement | null) ||
              (eEl?.closest?.('[data-text-variable]') as HTMLElement | null) ||
              null;
            if (v) {
              const rr = document.createRange();
              rr.setStartAfter(v);
              rr.collapse(true);
              sel.removeAllRanges();
              sel.addRange(rr);
            }
          }
        }
      } catch {
        // ignore
      }
      insertPlainTextWithNewlines(margin, plain);
    };

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      const plain = getFlattenedTextForCopy(margin);
      e.clipboardData?.setData('text/plain', plain);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        margin.blur();
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // 变量是原子节点：阻止“选中变量后输入字符替换变量”
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        try {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0);
            const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
            if (inMargin) {
              const asEl = (n: Node) =>
                n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
              const sEl = asEl(r.startContainer);
              const eEl = asEl(r.endContainer);
              const inVar = !!(sEl?.closest('[data-text-variable]') || eEl?.closest('[data-text-variable]'));
              const hitsVar =
                inVar ||
                (() => {
                  try {
                    const frag = r.cloneContents();
                    return !!frag.querySelector?.('[data-text-variable]');
                  } catch {
                    return false;
                  }
                })();
              if (hitsVar) {
                e.preventDefault();
                e.stopPropagation();
                const v =
                  (sEl?.closest?.('[data-text-variable]') as HTMLElement | null) ||
                  (eEl?.closest?.('[data-text-variable]') as HTMLElement | null) ||
                  null;
                if (v) {
                  const rr = document.createRange();
                  rr.setStartAfter(v);
                  rr.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(rr);
                }
                const text = document.createTextNode(e.key);
                const r2 = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
                if (r2 && margin.contains(r2.startContainer)) {
                  r2.insertNode(text);
                  const after = document.createRange();
                  after.setStartAfter(text);
                  after.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(after);
                }
                requestAnimationFrame(syncSelectionFromDom);
                return;
              }
            }
          }
        } catch {
          // ignore
        }
      }
      if (e.key === 'Enter') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0);
          const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
          if (inMargin) {
            const asEl = (n: Node) =>
              n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
            const sEl = asEl(r.startContainer);
            const eEl = asEl(r.endContainer);
            const inLink = !!(sEl?.closest('a') || eEl?.closest('a'));
            const inVar = !!(sEl?.closest('[data-text-variable]') || eEl?.closest('[data-text-variable]'));
            const hitsLinkOrVar =
              inLink ||
              inVar ||
              (() => {
                try {
                  const frag = r.cloneContents();
                  return !!frag.querySelector?.('a,[data-text-variable]');
                } catch {
                  return false;
                }
              })();
            // 规则：变量/链接内部禁止任何换行（Enter / insertParagraph）
            if (hitsLinkOrVar) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }
        }
      }
      if (e.key === 'Backspace') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0);
          const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
          if (inMargin && r.collapsed) {
            const node = r.startContainer.nodeType === Node.ELEMENT_NODE ? (r.startContainer as Element) : r.startContainer.parentElement;
            const p = node?.closest('p') as HTMLParagraphElement | null;
            if (p) {
              const text = (p.textContent ?? '').replace(/\u200B/g, '');
              const hasOnlyBr = !!p.querySelector('br') && text.length === 0;
              const isPlaceholderEmptyLine = hasOnlyBr;
              // 空占位行：一次 Backspace 直接删除该 <p>（不需要先删 ZWSP / <br>）
              if (isPlaceholderEmptyLine) {
                const prev = p.previousElementSibling as HTMLElement | null;
                if (prev && prev.tagName === 'P') {
                  e.preventDefault();
                  e.stopPropagation();
                  p.parentElement?.removeChild(p);
                  ensureParagraphStructure(margin);
                  // 光标落到上一段末尾
                  const range = document.createRange();
                  range.selectNodeContents(prev);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  return;
                }
              }

              // 段首 Backspace：跳过并删除上方连续空占位段落，避免需要按多次才能跨过空行
              try {
                const head = document.createRange();
                head.setStart(p, 0);
                head.setEnd(r.startContainer, r.startOffset);
                const atStart = head.toString().replace(/\u200B/g, '').length === 0;
                if (atStart) {
                  let prev = p.previousElementSibling as HTMLElement | null;
                  let removed = false;
                  while (prev && prev.tagName === 'P') {
                    const prevP = prev as HTMLParagraphElement;
                    const prevText = (prevP.textContent ?? '').replace(/\u200B/g, '');
                    const prevIsPlaceholder = !!prevP.querySelector('br') && prevText.length === 0;
                    if (!prevIsPlaceholder) break;
                    const toRemove = prevP;
                    prev = toRemove.previousElementSibling as HTMLElement | null;
                    toRemove.parentElement?.removeChild(toRemove);
                    removed = true;
                  }
                  if (removed) {
                    e.preventDefault();
                    e.stopPropagation();
                    ensureParagraphStructure(margin);
                    // 此时让浏览器继续处理一次 backspace 的合并行为会更复杂；直接把 caret 保持在当前段首
                    const rr = document.createRange();
                    rr.selectNodeContents(p);
                    rr.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(rr);
                    return;
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        // 记录回车前所在段落：用于回车后强制把 caret 移到下一段
        const selBefore = window.getSelection();
        let pBefore: HTMLParagraphElement | null = null;
        let pBeforeWasPlaceholder = false;
        try {
          if (selBefore && selBefore.rangeCount > 0) {
            const rb = selBefore.getRangeAt(0);
            if (margin.contains(rb.startContainer) && margin.contains(rb.endContainer)) {
              const asEl = (n: Node) =>
                n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
              pBefore = (asEl(rb.startContainer)?.closest('p') as HTMLParagraphElement | null) ?? null;
              if (pBefore) pBeforeWasPlaceholder = isPlaceholderParagraph(pBefore);
            }
          }
        } catch {
          pBefore = null;
          pBeforeWasPlaceholder = false;
        }

        // 若光标正好在一个变量 span 前面，用手动分段避免 execCommand 在 contenteditable=false 边界产生“多空行”
        try {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0);
            const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
            if (inMargin && r.collapsed) {
              const asEl = (n: Node) =>
                n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
              const p = (asEl(r.startContainer)?.closest('p') as HTMLParagraphElement | null) ?? null;
              const nodeAfterCaret = (() => {
                const sc = r.startContainer;
                if (sc.nodeType === Node.TEXT_NODE) {
                  const t = (sc.textContent ?? '').length;
                  if (r.startOffset < t) return null; // 光标在文本内部
                  return sc.nextSibling;
                }
                if (sc.nodeType === Node.ELEMENT_NODE) {
                  return (sc as Element).childNodes[r.startOffset] ?? null;
                }
                return null;
              })();
              const afterIsVar =
                !!(nodeAfterCaret &&
                  nodeAfterCaret.nodeType === Node.ELEMENT_NODE &&
                  (nodeAfterCaret as Element).closest?.('[data-text-variable]'));
              if (p && afterIsVar) {
                // 把 caret 后面的内容（含变量 span）整体抽出到新段落
                const tail = document.createRange();
                tail.selectNodeContents(p);
                tail.setStart(r.startContainer, r.startOffset);
                const frag = tail.extractContents();
                const newP = document.createElement('p');
                newP.appendChild(frag);
                p.insertAdjacentElement('afterend', newP);
                ensureParagraphStructure(margin);
                // 光标落到新段落开头
                const rr = document.createRange();
                rr.selectNodeContents(newP);
                rr.collapse(true);
                sel.removeAllRanges();
                sel.addRange(rr);
                syncSelectionFromDom();
                e.stopPropagation();
                return;
              }
            }
          }
        } catch {
          // ignore
        }

        document.execCommand('insertParagraph', false);
        ensureParagraphStructure(margin);
        // 变量 span 边界处回车时，部分浏览器会把 selection 跑到 editable 外，导致看起来“失焦无光标”
        requestAnimationFrame(() => {
          try {
            margin.focus({ preventScroll: true } as any);
          } catch {
            // ignore
          }
          const sel = window.getSelection();
          // 优先：如果能定位到“回车前段落”的下一段，直接把 caret 放到下一段开头（不依赖浏览器回车后的 selection）
          try {
            if (pBefore && pBefore.isConnected) {
              const next = (pBefore.nextElementSibling as HTMLElement | null)?.tagName === 'P'
                ? (pBefore.nextElementSibling as HTMLParagraphElement)
                : null;
              if (next && sel) {
                // 防止“单次回车生成两个空占位段落”：仅当回车前段落不是占位空段时，才去重多余空段
                try {
                  if (!pBeforeWasPlaceholder && isPlaceholderParagraph(next)) {
                    const next2 = (next.nextElementSibling as HTMLElement | null)?.tagName === 'P'
                      ? (next.nextElementSibling as HTMLParagraphElement)
                      : null;
                    if (next2 && isPlaceholderParagraph(next2)) {
                      next2.parentElement?.removeChild(next2);
                      ensureParagraphStructure(margin);
                    }
                  }
                } catch {
                  // ignore
                }
                const rr = document.createRange();
                rr.selectNodeContents(next);
                rr.collapse(true);
                sel.removeAllRanges();
                sel.addRange(rr);
                syncSelectionFromDom();
                return;
              }
            }
          } catch {
            // ignore
          }

          if (!sel || sel.rangeCount === 0) {
            placeCaretAtEndOfLastParagraph(margin);
            syncSelectionFromDom();
            return;
          }
          const r = sel.getRangeAt(0);
          const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);

          const asEl = (n: Node) =>
            n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
          const sEl = asEl(r.startContainer);

          // 有时 selection 会落进变量 span（contenteditable=false）里，导致看起来“没光标”
          const inVarEl = !!sEl?.closest?.('[data-text-variable]');
          const inLinkEl = !!sEl?.closest?.('a');

          if (!inMargin) {
            placeCaretAtEndOfLastParagraph(margin);
          } else if (inVarEl) {
            const v = sEl?.closest?.('[data-text-variable]') as HTMLElement | null;
            if (v) {
              const rr = document.createRange();
              rr.setStartAfter(v);
              rr.collapse(true);
              sel.removeAllRanges();
              sel.addRange(rr);
            } else {
              placeCaretAtEndOfLastParagraph(margin);
            }
          } else if (inLinkEl && (sEl?.closest?.('a') as HTMLElement | null)?.getAttribute('contenteditable') === 'false') {
            // 防御：若未来 link 也变成不可编辑，避免 caret 落入其中
            placeCaretAtEndOfLastParagraph(margin);
          } else {
            // 若回车后光标仍停留在“当前段落末尾”，但下一段已经生成，则把 caret 移到下一段开头
            try {
              const p = (sEl?.closest?.('p') as HTMLParagraphElement | null) ?? null;
              const nextP = (p?.nextElementSibling as HTMLElement | null)?.tagName === 'P' ? (p?.nextElementSibling as HTMLParagraphElement) : null;
              if (p && nextP && r.collapsed) {
                // 1) 段尾判断：用 DOM Range 计算段内字符数（比节点级判断更稳）
                const head = document.createRange();
                head.setStart(p, 0);
                head.setEnd(r.startContainer, r.startOffset);
                const off = head.toString().length;
                const atEnd = off >= getFlattenedLength(p);

                // 2) 典型 Enter 行为：生成一个空占位的下一段（<p><br/></p>）
                const nextTxt = (nextP.textContent ?? '').replace(/\u200B/g, '');
                const nextIsPlaceholder = !!nextP.querySelector('br') && nextTxt.length === 0;

                if (atEnd || nextIsPlaceholder) {
                  const rr = document.createRange();
                  rr.selectNodeContents(nextP);
                  rr.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(rr);
                }
              }
            } catch {
              // ignore
            }
          }
          syncSelectionFromDom();
        });
        e.stopPropagation();
        return;
      }
      e.stopPropagation();
    };

    const onBeforeInput = (e: InputEvent) => {
      // 变量是原子节点：不允许“选中变量后输入文字把变量替换掉”，输入应落在变量外部
      // 处理 insertText / composition 等路径（多数浏览器都会走 beforeinput）
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const r = sel.getRangeAt(0);
          const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
          if (inMargin) {
            const asEl = (n: Node) =>
              n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
            const sEl = asEl(r.startContainer);
            const eEl = asEl(r.endContainer);
            const inVar = !!(sEl?.closest('[data-text-variable]') || eEl?.closest('[data-text-variable]'));
            const hitsVar =
              inVar ||
              (() => {
                try {
                  const frag = r.cloneContents();
                  return !!frag.querySelector?.('[data-text-variable]');
                } catch {
                  return false;
                }
              })();

            const t = e.inputType;
            const isTextInsert =
              t === 'insertText' ||
              t === 'insertCompositionText' ||
              t === 'insertFromPaste' ||
              t === 'insertFromDrop';

            if (hitsVar && isTextInsert) {
              e.preventDefault();
              e.stopPropagation();
              // 把 caret 强制放到变量后，并把文本插到变量外
              const varEl =
                (sEl?.closest?.('[data-text-variable]') as HTMLElement | null) ||
                (eEl?.closest?.('[data-text-variable]') as HTMLElement | null) ||
                null;
              if (varEl) {
                const rr = document.createRange();
                rr.setStartAfter(varEl);
                rr.collapse(true);
                sel.removeAllRanges();
                sel.addRange(rr);
              }
              const data = (e as any).data as string | null | undefined;
              if (typeof data === 'string' && data.length > 0) {
                const text = document.createTextNode(data);
                const r2 = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
                if (r2 && margin.contains(r2.startContainer)) {
                  r2.insertNode(text);
                  const after = document.createRange();
                  after.setStartAfter(text);
                  after.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(after);
                }
              }
              // 让侧栏/状态同步
              requestAnimationFrame(syncSelectionFromDom);
              return;
            }
          }
        }
      } catch {
        // ignore
      }

      // 覆盖所有换行输入路径（Enter、移动端、某些浏览器的 lineBreak/paragraph）
      const t = e.inputType;
      if (t !== 'insertParagraph' && t !== 'insertLineBreak') return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const r = sel.getRangeAt(0);
      const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
      if (!inMargin) return;
      const asEl = (n: Node) =>
        n.nodeType === Node.ELEMENT_NODE ? (n as Element) : (n.parentElement as Element | null);
      const sEl = asEl(r.startContainer);
      const eEl = asEl(r.endContainer);
      const inLink = !!(sEl?.closest('a') || eEl?.closest('a'));
      const inVar = !!(sEl?.closest('[data-text-variable]') || eEl?.closest('[data-text-variable]'));
      if (inLink || inVar) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClick = (e: MouseEvent) => {
      e.stopPropagation();
      const rawTarget = e.target as Node | null;
      const targetEl =
        rawTarget && rawTarget.nodeType === Node.ELEMENT_NODE
          ? (rawTarget as Element)
          : (rawTarget?.parentElement ?? null);
      // 编辑态：禁止 <a> 的默认交互，但不影响拖选（拖选发生在 mousedown/mousemove）
      if (targetEl?.closest('a')) {
        e.preventDefault();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
      // 点击变量时：直接整块选中变量（变量是原子节点，不允许部分选中/内部 caret）
      try {
        const rawTarget = e.target as Node | null;
        const targetEl =
          rawTarget && rawTarget.nodeType === Node.ELEMENT_NODE
            ? (rawTarget as Element)
            : (rawTarget?.parentElement ?? null);
        const v = (targetEl?.closest?.('[data-text-variable]') as HTMLElement | null) ?? null;
        if (v) {
          e.preventDefault();
          const sel = window.getSelection();
          if (sel) {
            const rr = document.createRange();
            rr.selectNode(v);
            sel.removeAllRanges();
            sel.addRange(rr);
          }
          margin.focus({ preventScroll: true } as any);
          setTextSelection(null);
          requestAnimationFrame(syncSelectionFromDom);
          return;
        }
      } catch {
        // ignore
      }
      mouseDownPointRef.current = { x: e.clientX, y: e.clientY };
      // 样式应用后的短暂保留窗口内，旧 textSelection 会被恢复逻辑重新选中；
      // 先清空可避免吞掉这次点击产生的折叠 caret。
      setTextSelection(null);
    };

    const onMouseUp = (e: MouseEvent) => {
      e.stopPropagation();
      const down = mouseDownPointRef.current;
      mouseDownPointRef.current = null;
      if (!down) return;
      const dx = Math.abs(e.clientX - down.x);
      const dy = Math.abs(e.clientY - down.y);
      const isClick = dx <= 3 && dy <= 3;
      if (!isClick) {
        requestAnimationFrame(syncSelectionFromDom);
        return;
      }
      // 双击选词会在 mouseup 后产生非折叠选区；此时不要强行折叠成 caret，否则会看起来“自动失焦/选不中”
      const liveSel = window.getSelection();
      if (liveSel && liveSel.rangeCount > 0) {
        const r = liveSel.getRangeAt(0);
        const inMargin = margin.contains(r.startContainer) && margin.contains(r.endContainer);
        if (inMargin && !r.collapsed) {
          requestAnimationFrame(syncSelectionFromDom);
          return;
        }
      }
      // 单击文本区：清掉旧高亮选区，折叠为 caret，等待下一步输入/选择
      margin.focus({ preventScroll: true });
      const placed = placeCaretByPoint(margin, e.clientX, e.clientY);
      if (!placed) {
        placeCaretAtEnd(margin);
      }
      forceCollapseSelectionIn(margin);
      setTextSelection(null);
      requestAnimationFrame(syncSelectionFromDom);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    margin.addEventListener('blur', handleBlur);
    margin.addEventListener('input', onInput);
    margin.addEventListener('paste', onPaste);
    margin.addEventListener('copy', onCopy);
    margin.addEventListener('keydown', onKeyDown);
    margin.addEventListener('beforeinput', onBeforeInput as unknown as EventListener);
    margin.addEventListener('mousedown', onMouseDown);
    margin.addEventListener('mouseup', onMouseUp);
    margin.addEventListener('click', onClick);

    // 不在此 focus/ensureCaret：程序化 focus 会把折叠选区落在开头，ensure 又认为「选区合法」而不再修正，
    // 会盖住用户 mousedown 已设好的插入符。焦点交给用户点击或 Tab，由浏览器决定 caret 位置。

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      margin.removeEventListener('blur', handleBlur);
      margin.removeEventListener('input', onInput);
      margin.removeEventListener('paste', onPaste);
      margin.removeEventListener('copy', onCopy);
      margin.removeEventListener('keydown', onKeyDown);
      margin.removeEventListener('beforeinput', onBeforeInput as unknown as EventListener);
      margin.removeEventListener('mousedown', onMouseDown);
      margin.removeEventListener('mouseup', onMouseUp);
      margin.removeEventListener('click', onClick);
      margin.contentEditable = 'false';
      margin.style.cursor = '';
      marginRootRef.current = null;
      if (inputRafRef.current != null) {
        cancelAnimationFrame(inputRafRef.current);
        inputRafRef.current = null;
      }
    };
  }, [isSelected, blockId, handleBlur, props.props?.html, props.props?.text, allowedUser, allowedBuiltin]);

  useEffect(() => {
    if (isSelected) return;
    setTextSelection(null);
  }, [isSelected]);

  useLayoutEffect(() => {
    const req = textDomApplyRequest;
    if (!req || req.blockId !== blockId) return;
    const margin = marginRootRef.current;
    if (!margin) {
      clearTextDomApplyRequest();
      return;
    }
    margin.focus();

    if (req.kind === 'variable') {
      // 侧栏点击会让浏览器选区跑到侧栏；用我们记录的 caret offset 恢复到正文再插入
      if (textCaret && textCaret.blockId === blockId) {
        const off = Math.max(0, Math.min(textCaret.offset, getFlattenedLength(margin)));
        const r = offsetsToRange(margin, off, off);
        const sel = window.getSelection();
        if (r && sel) {
          sel.removeAllRanges();
          sel.addRange(r);
        }
      } else {
        // 没有 caret 时按需求：插入到第一个/最后一个 <p> 末尾（当前结构一般只有一个 <p>）
        placeCaretAtEndOfLastParagraph(margin);
      }
      insertVariableTokenAtCaret(margin, req.token);
    } else {
      const ts = textSelection;
      if (!ts || ts.blockId !== blockId || ts.start >= ts.end) {
        clearTextDomApplyRequest();
        return;
      }
      const range = offsetsToRange(margin, ts.start, ts.end);
      if (!range) {
        clearTextDomApplyRequest();
        return;
      }
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      if (req.kind === 'style') {
        applyInlineStyleToRange(margin, ts.start, ts.end, {
          patch: req.style,
          global: props.style ?? null,
        });
      } else {
        applyLinkToRange(margin, ts.start, ts.end, req.href, req.targetBlank);
      }
    }

    ensureParagraphStructure(margin);
    const tb = editorStateStore.getState().document[blockId];
    const vdPrev = (tb?.data as TextProps)?.props?.variableDefaults ?? null;
    const { variableDefaults: nextVd } = migrateVariableInstanceIdsInMargin(margin, vdPrev);
    const html = serializeBodyHtml(margin);
    const message = computeMessageFromMargin(margin);
    updateDocumentHtml(html, message, nextVd);
    markLastInlineStyleApply();
    clearTextDomApplyRequest();

    const len = getFlattenedLength(margin);
    const rs = textSelection ? Math.min(textSelection.start, len) : len;
    const re = textSelection ? Math.min(textSelection.end, len) : len;
    const flatAfterApply = getFlattenedText(margin);
    const snapAfterApply =
      flatAfterApply.length > 0
        ? readInlineStyleAtOffset(margin, Math.min(rs, flatAfterApply.length - 1))
        : {};
    setLastTextBlockContent({ blockId, text: flatAfterApply, styleSnapshot: snapAfterApply });
    const r2 = offsetsToRange(margin, rs, re);
    if (r2 && rs < re) {
      const s2 = window.getSelection();
      s2?.removeAllRanges();
      s2?.addRange(r2);
    }
  }, [textDomApplyRequest?.id, textSelection, textCaret, blockId, updateDocumentHtml, props.style]);

  if (!isSelected) {
    return (
      <div>
        <Text {...props} />
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div key={blockId} ref={shellRef} style={{ margin: 0, padding: 0 }} />
    </div>
  );
}
