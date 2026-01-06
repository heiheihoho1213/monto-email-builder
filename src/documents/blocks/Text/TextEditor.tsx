import React, { useRef, useEffect, useCallback } from 'react';
import { Text, TextProps } from '@usewaypoint/block-text';
import { Box } from '@mui/material';
import { useCurrentBlockId } from '../../editor/EditorBlock';
import { useDocument, setDocument, useSelectedBlockId, editorStateStore } from '../../editor/EditorContext';

export default function TextEditor(props: TextProps) {
  const blockId = useCurrentBlockId();
  const selectedBlockId = useSelectedBlockId();
  const textRef = useRef<HTMLDivElement>(null);
  const textContainerRef = useRef<HTMLElement | null>(null);
  const isEditingRef = useRef(false);
  const isSelected = selectedBlockId === blockId;


  // 更新 document 的函数
  const updateDocument = useCallback((newText: string) => {
    const currentBlock = editorStateStore.getState().document[blockId];
    if (currentBlock && currentBlock.type === 'Text') {
      setDocument({
        [blockId]: {
          ...currentBlock,
          data: {
            ...currentBlock.data,
            props: {
              ...currentBlock.data.props,
              text: newText,
              markdown: false, // 确保 markdown 始终为 false
            },
          },
        },
      });
    }
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

        // 自动聚焦并定位光标到文本末尾
        setTimeout(() => {
          if (textContainer) {
            textContainer.focus();
            const range = window.document.createRange();
            const selection = window.getSelection();
            if (selection && textContainer.childNodes.length > 0) {
              // 如果有文本节点，定位到末尾
              const lastNode = textContainer.childNodes[textContainer.childNodes.length - 1];
              range.setStart(lastNode, lastNode.textContent?.length || 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              // 如果没有文本，直接定位到元素末尾
              range.selectNodeContents(textContainer);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }
        }, 0);

        const handleBlur = () => {
          isEditingRef.current = false;
          // 只在失焦时更新 document，让浏览器自动保持光标位置
          // 直接使用 textContent 获取纯文本
          let newText = '';
          if (textContainer) {
            newText = textContainer.textContent || textContainer.innerText || '';
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
          // 阻止回车键，不允许换行
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // 只在按 Escape 时失焦
          if (e.key === 'Escape') {
            textContainer.blur();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // 其他键只阻止冒泡
          e.stopPropagation();
        };

        const handleClick = (e: MouseEvent) => {
          // 允许点击来聚焦和编辑
          e.stopPropagation();
        };

        textContainer.addEventListener('blur', handleBlur);
        textContainer.addEventListener('input', handleInput);
        textContainer.addEventListener('keydown', handleKeyDown);
        textContainer.addEventListener('click', handleClick);

        return () => {
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

  return (
    <Box ref={textRef}>
      <Text {...props} />
    </Box>
  );
}
