import { useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Text, TextProps } from 'monto-email-block-text';
import { Box } from '@mui/material';
import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, useSelectedBlockId, editorStateStore, setTextSelection, setLastTextBlockContent, shouldIgnoreCollapsedSelectionForClear, useTextSelection, useLastInlineStyleApplyAt } from '../../editor/EditorContext';

function getCharacterOffset(container: Node, targetNode: Node, targetOffset: number): number {
  // 用 Range 计算“从容器起点到选择位置”的文本长度：
  // 1) 不依赖 anchorNode 是 TEXT_NODE 还是 ELEMENT_NODE
  // 2) DOM 重新分段（例如 inlineRuns 导致 span 切换）时也能保持字符偏移稳定
  const doc = window.document;
  try {
    const range = doc.createRange();
    range.setStart(container, 0);
    range.setEnd(targetNode, targetOffset);
    return range.toString().length;
  } catch {
    // 回退：旧逻辑（尽量避免完全失败）
    let offset = 0;
    const walk = (node: Node): boolean => {
      if (node === targetNode) {
        offset += targetOffset;
        return true;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        offset += (node.textContent ?? '').length;
        return false;
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        if (walk(node.childNodes[i])) return true;
      }
      return false;
    };
    walk(container);
    return offset;
  }
}

/** 根据 oldText -> newText 的单一连续变更，调整所有 run/link 的 start/end 偏移，避免插入/删除后样式与链接错位 */
function adjustOffsetsForTextEdit<T extends { start: number; end: number }>(
  oldText: string,
  newText: string,
  items: T[]
): T[] {
  const oldLen = oldText.length;
  const newLen = newText.length;
  if (oldLen === 0 && newLen === 0) return items;
  let i = 0;
  while (i < oldLen && i < newLen && oldText[i] === newText[i]) i++;
  let oldEnd = oldLen;
  let newEnd = newLen;
  while (oldEnd > i && newEnd > i && oldText[oldEnd - 1] === newText[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const delta = newEnd - oldEnd;

  const result: T[] = [];
  for (const item of items) {
    let start = item.start;
    let end = item.end;
    if (end <= i) {
      // 变更区间之前，不变
    } else if (start >= oldEnd) {
      start += delta;
      end += delta;
    } else {
      start = Math.min(start, i);
      end = end + delta;
    }
    start = Math.max(0, Math.min(start, newLen));
    end = Math.max(0, Math.min(end, newLen));
    if (end <= start) continue;
    result.push({ ...item, start, end });
  }
  return result;
}

export default function TextEditor(props: TextProps) {
  const blockId = useCurrentBlockId();
  const selectedBlockId = useSelectedBlockId();
  const textSelection = useTextSelection();
  const lastInlineStyleApplyAt = useLastInlineStyleApplyAt();
  const textRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLElement | null>(null);
  const isEditingRef = useRef(false);
  const isSelected = selectedBlockId === blockId;


  // 更新 document 的函数：同步文本并按编辑区间调整 inlineRuns / inlineLinks 偏移，避免插入/删除后样式与链接错位
  const updateDocument = useCallback((newText: string) => {
    const currentBlock = editorStateStore.getState().document[blockId];
    if (currentBlock && currentBlock.type !== 'Text') return;
    const oldText = (currentBlock?.data?.props as { text?: string } | undefined)?.text ?? '';
    const props = currentBlock!.data.props as Record<string, unknown>;
    const inlineRuns = (props.inlineRuns as { start: number; end: number }[] | undefined) ?? [];
    const inlineLinks = (props.inlineLinks as { start: number; end: number }[] | undefined) ?? [];
    const nextRuns = adjustOffsetsForTextEdit(oldText, newText, inlineRuns);
    const nextLinks = adjustOffsetsForTextEdit(oldText, newText, inlineLinks);
    setDocument({
      [blockId]: {
        ...currentBlock!,
        data: {
          ...currentBlock!.data,
          props: {
            ...props,
            text: newText,
            inlineRuns: nextRuns.length ? nextRuns : undefined,
            inlineLinks: nextLinks.length ? nextLinks : undefined,
            markdown: false,
          },
        },
      } as (typeof currentBlock) & { data: { props: typeof props } },
    } as Parameters<typeof setDocument>[0]);
  }, [blockId]);

  // 当选中时，查找 Text 组件渲染的根元素并设置为可编辑
  useEffect(() => {
    if (isSelected && textRef.current) {
      // 查找 Text 组件渲染的文本容器（优先查找 div，而不是 p）
      const findTextContainer = (element: HTMLElement): HTMLElement | null => {
        // 优先查找 div 容器（这是可编辑的外层容器）
        const divContainer = element.querySelector('div');
        if (divContainer) {
          // 确保返回的是最外层的 div，而不是嵌套的 div
          // 查找直接子元素中的 div
          const directDiv = Array.from(element.children).find(
            child => child.tagName === 'DIV'
          ) as HTMLElement;
          if (directDiv) {
            return directDiv;
          }
          return divContainer as HTMLElement;
        }
        // 如果没有 div，查找第一个包含文本的子元素
        const children = Array.from(element.children) as HTMLElement[];
        for (const child of children) {
          if (child.textContent && child.textContent.trim()) {
            return child;
          }
        }
        // 如果都没有，返回元素本身
        return element;
      };

      // 先清理之前的容器（如果存在且不在编辑状态）
      if (textContainerRef.current && !isEditingRef.current) {
        textContainerRef.current.contentEditable = 'false';
        textContainerRef.current.style.cursor = '';
        textContainerRef.current = null;
      }

      const textContainer = findTextContainer(textRef.current);
      // 如果找到容器且与当前不同，需要重新设置
      if (textContainer && textContainer !== textContainerRef.current) {
        // 清理之前的容器
        if (textContainerRef.current) {
          textContainerRef.current.contentEditable = 'false';
          textContainerRef.current.style.cursor = '';
        }

        textContainerRef.current = textContainer;
        textContainer.contentEditable = 'true';
        textContainer.style.cursor = 'text';

        // 自动聚焦并定位光标到文本末尾（用容器 child 数量作为 offset，避免 lastNode 为 span 时把字符数当子节点索引导致 IndexSizeError）
        setTimeout(() => {
          if (textContainer) {
            textContainer.focus();
            const range = window.document.createRange();
            const selection = window.getSelection();
            if (selection) {
              try {
                range.setStart(textContainer, textContainer.childNodes.length);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
              } catch {
                range.selectNodeContents(textContainer);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }
        }, 0);

        const handleBlur = () => {
          isEditingRef.current = false;
          // 不在此处清空 textSelection，否则点击右侧面板时先失焦会清掉选区，导致改样式仍作用到全局
          // 用 innerText 保留换行；仅把连续 3+ 换行压成 \n\n，不触碰 \n\n
          let newText = '';
          if (textContainer) {
            const raw = (textContainer.innerText ?? textContainer.textContent ?? '').replace(/\r\n?/g, '\n');
            newText = raw.replace(/\n{3,}/g, '\n\n');
          }
          updateDocument(newText);
        };

        // input 事件中不更新 document，让浏览器自动保持光标位置
        // 只在失焦时更新，避免频繁重新渲染导致光标位置丢失
        const handleInput = () => {
          isEditingRef.current = true;
          // 不在这里更新 document，只在 blur 时更新
        };

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            textContainer.blur();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // 禁用规则：1. 当前行没文字且上一行是空白行 → 拦截  2. 当前行有文字或上一行有文字 → 允许
          if (e.key === 'Enter') {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              try {
                const range = sel.getRangeAt(0).cloneRange();
                range.setStart(textContainer, 0);
                range.setEnd(sel.focusNode!, sel.focusOffset);
                const fragment = range.cloneContents();
                const wrap = document.createElement('div');
                wrap.appendChild(fragment);
                const textBefore = (wrap.innerText ?? wrap.textContent ?? '').replace(/\r\n?/g, '\n');
                const lines = textBefore.split('\n');
                const currentLine = lines[lines.length - 1] ?? '';
                const previousLine = lines.length >= 2 ? lines[lines.length - 2] : '';
                const textBasedBlock = currentLine.trim() === '' && previousLine.trim() === '';
                // DOM 兜底：光标所在「行块」与上一行块均为空时也拦截（仅看容器直接子节点，避免误判）
                let domBasedBlock = false;
                let node: Node | null = sel.focusNode;
                while (node && node.parentNode !== textContainer) node = node.parentNode;
                if (node && node.nodeType === Node.ELEMENT_NODE) {
                  const curBlock = node as HTMLElement;
                  const prevBlock = curBlock.previousElementSibling as HTMLElement | null;
                  if (prevBlock && (curBlock.innerText ?? curBlock.textContent ?? '').trim() === '' && (prevBlock.innerText ?? prevBlock.textContent ?? '').trim() === '') {
                    domBasedBlock = true;
                  }
                }
                if (textBasedBlock || domBasedBlock) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
              } catch {
                // 边界情况忽略
              }
            }
          }
          e.stopPropagation();
        };

        const handleClick = (e: MouseEvent) => {
          e.stopPropagation();
        };

        const handleSelectionChange = () => {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return;
          // 选区移出当前块（例如点击右侧面板）时不清空 textSelection，保留上次选区，以便在面板中操作仍作用到该范围
          if (!textContainer.contains(sel.anchorNode) || !textContainer.contains(sel.focusNode)) {
            return;
          }
          // 应用选区样式后会触发 DOM 结构变化，浏览器 selection 可能“自动折返/跳动”
          // 在短时间窗口内直接忽略 selectionchange，避免把“跳动后的范围”写回 store
          if (shouldIgnoreCollapsedSelectionForClear()) return;
          const range = sel.getRangeAt(0);
          if (range.collapsed) {
            // 刚在面板应用过选区样式后 re-render 会导致选区折叠，此时不清空，避免拖拽颜色时后续变成改全局
            if (shouldIgnoreCollapsedSelectionForClear()) return;
            // 点击右侧面板按钮会让 contentEditable 失焦并触发 selection 折叠；
            // 这类场景应保留上次选区，让面板操作仍作用到原选区。
            const active = document.activeElement;
            const focusStillInEditor = !!active && textContainer.contains(active);
            if (!focusStillInEditor) return;
            setTextSelection(null);
            return;
          }
          const start = getCharacterOffset(textContainer, sel.anchorNode!, sel.anchorOffset);
          const end = getCharacterOffset(textContainer, sel.focusNode!, sel.focusOffset);
          const textLen = (textContainer.textContent ?? '').length;
          const s = Math.max(0, Math.min(start, end));
          const e = Math.min(textLen, Math.max(start, end));
          if (s >= e) {
            setTextSelection(null);
            return;
          }
          const currentText = (textContainer.textContent ?? '').replace(/\r\n?/g, '\n');
          setLastTextBlockContent({ blockId, text: currentText });
          setTextSelection({ blockId, start: s, end: e });
        };

        textContainer.addEventListener('blur', handleBlur);
        textContainer.addEventListener('input', handleInput);
        textContainer.addEventListener('keydown', handleKeyDown);
        textContainer.addEventListener('click', handleClick);
        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
          document.removeEventListener('selectionchange', handleSelectionChange);
          if (textContainer) {
            textContainer.contentEditable = 'false';
            textContainer.style.cursor = '';
            textContainer.removeEventListener('blur', handleBlur);
            textContainer.removeEventListener('input', handleInput);
            textContainer.removeEventListener('keydown', handleKeyDown);
            textContainer.removeEventListener('click', handleClick);
          }
          textContainerRef.current = null;
          isEditingRef.current = false;
          setTextSelection(null);
        };
      }
    } else if (!isSelected && textContainerRef.current) {
      // 取消选中时，恢复 contentEditable
      textContainerRef.current.contentEditable = 'false';
      textContainerRef.current.style.cursor = '';
      textContainerRef.current = null;
      isEditingRef.current = false;
    }
  }, [isSelected, blockId, updateDocument]);

  // 应用选区样式后 DOM 重新分段，浏览器可能导致 selection 范围视觉上跳动；
  // 通过 store 里的字符偏移把 selection 还原回“原来的字符区间”。
  // 使用 useLayoutEffect：在浏览器绘制前同步恢复 selection，减少闪烁。
  useLayoutEffect(() => {
    if (!isSelected) return;
    if (!shouldIgnoreCollapsedSelectionForClear()) return;
    if (!textSelection || textSelection.blockId !== blockId) return;
    if (textSelection.start >= textSelection.end) return;
    if (!textContainerRef.current) return;

    const container = textContainerRef.current;

    const getTextNodeAtCharOffset = (root: Node, targetOffset: number): { node: Node; nodeOffset: number } | null => {
      let current = 0;
      const walker = window.document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        const len = (textNode.textContent ?? '').length;
        if (targetOffset <= current + len) {
          return { node: textNode, nodeOffset: targetOffset - current };
        }
        current += len;
        textNode = walker.nextNode();
      }
      return null;
    };

    const setSelectionByOffsets = (startOffset: number, endOffset: number) => {
      const selection = window.getSelection();
      if (!selection) return;
      const start = getTextNodeAtCharOffset(container, startOffset);
      const end = getTextNodeAtCharOffset(container, endOffset);
      if (!start || !end) return;

      const range = window.document.createRange();
      range.setStart(start.node, start.nodeOffset);
      range.setEnd(end.node, end.nodeOffset);
      selection.removeAllRanges();
      selection.addRange(range);
    };

    setSelectionByOffsets(textSelection.start, textSelection.end);
  }, [isSelected, lastInlineStyleApplyAt, textSelection, blockId]);

  return (
    <Box ref={textRef}>
      <Text {...props} />
    </Box>
  );
}
