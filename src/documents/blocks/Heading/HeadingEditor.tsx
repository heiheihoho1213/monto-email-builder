import React, { useRef, useEffect, useCallback } from 'react';
import { Heading, HeadingProps } from '@usewaypoint/block-heading';
import { Box } from '@mui/material';
import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, useSelectedBlockId, editorStateStore } from '../../editor/EditorContext';

export default function HeadingEditor(props: HeadingProps) {
  const blockId = useCurrentBlockId();
  const selectedBlockId = useSelectedBlockId();
  const headingRef = useRef<HTMLDivElement>(null);
  const headingElementRef = useRef<HTMLElement | null>(null);
  const isEditingRef = useRef(false);
  const isSelected = selectedBlockId === blockId;


  // 更新 document 的函数
  const updateDocument = useCallback((newText: string) => {
    const currentBlock = editorStateStore.getState().document[blockId];
    if (currentBlock && currentBlock.type === 'Heading') {
      setDocument({
        [blockId]: {
          ...currentBlock,
          data: {
            ...currentBlock.data,
            props: {
              ...currentBlock.data.props,
              text: newText,
            },
          },
        },
      });
    }
  }, [blockId]);

  // 当选中时，查找 Heading 组件渲染的根元素并设置为可编辑
  useEffect(() => {
    if (isSelected && headingRef.current && !isEditingRef.current) {
      // 查找 Heading 组件渲染的标题元素 (h1, h2, h3)
      const headingElement = headingRef.current.querySelector('h1, h2, h3') as HTMLElement;
      if (headingElement && headingElement !== headingElementRef.current) {
        headingElementRef.current = headingElement;
        headingElement.contentEditable = 'true';
        headingElement.style.cursor = 'text';
        
        // 自动聚焦并定位光标到文本末尾
        setTimeout(() => {
          if (headingElement) {
            headingElement.focus();
            const range = window.document.createRange();
            const selection = window.getSelection();
            if (selection && headingElement.childNodes.length > 0) {
              // 如果有文本节点，定位到末尾
              const lastNode = headingElement.childNodes[headingElement.childNodes.length - 1];
              range.setStart(lastNode, lastNode.textContent?.length || 0);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            } else {
              // 如果没有文本，直接定位到元素末尾
              range.selectNodeContents(headingElement);
              range.collapse(false);
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          }
        }, 0);
        
        const handleBlur = () => {
          isEditingRef.current = false;
          // 只在失焦时更新 document，让浏览器自动保持光标位置
          const newText = headingElement.textContent || '';
          updateDocument(newText);
        };

        // input 事件中不更新 document，让浏览器自动保持光标位置
        // 只在失焦时更新，避免频繁重新渲染导致光标位置丢失
        const handleInput = () => {
          isEditingRef.current = true;
          // 不在这里更新 document，只在 blur 时更新
        };

        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            headingElement.blur();
          }
          if (e.key === 'Escape') {
            headingElement.blur();
          }
          e.stopPropagation();
        };

        const handleClick = (e: MouseEvent) => {
          // 允许点击来聚焦和编辑
          e.stopPropagation();
        };

        headingElement.addEventListener('blur', handleBlur);
        headingElement.addEventListener('input', handleInput);
        headingElement.addEventListener('keydown', handleKeyDown);
        headingElement.addEventListener('click', handleClick);

        return () => {
          if (headingElement) {
            headingElement.contentEditable = 'false';
            headingElement.style.cursor = '';
            headingElement.removeEventListener('blur', handleBlur);
            headingElement.removeEventListener('input', handleInput);
            headingElement.removeEventListener('keydown', handleKeyDown);
            headingElement.removeEventListener('click', handleClick);
          }
          headingElementRef.current = null;
          isEditingRef.current = false;
        };
      }
    } else if (!isSelected && headingElementRef.current) {
      // 取消选中时，恢复 contentEditable
      headingElementRef.current.contentEditable = 'false';
      headingElementRef.current.style.cursor = '';
      headingElementRef.current = null;
      isEditingRef.current = false;
    }
  }, [isSelected, blockId, updateDocument]);

  return (
    <Box ref={headingRef}>
      <Heading {...props} />
    </Box>
  );
}
