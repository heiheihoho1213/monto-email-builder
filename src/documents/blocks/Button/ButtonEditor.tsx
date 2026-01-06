import React, { useRef, useEffect, useCallback } from 'react';
import { Button, ButtonProps } from '@usewaypoint/block-button';
import { Box } from '@mui/material';
import { useCurrentBlockId } from '../../editor/EditorBlock';
import { setDocument, useSelectedBlockId, editorStateStore } from '../../editor/EditorContext';

export default function ButtonEditor(props: ButtonProps) {
  const blockId = useCurrentBlockId();
  const selectedBlockId = useSelectedBlockId();
  const buttonRef = useRef<HTMLDivElement>(null);
  const buttonTextRef = useRef<HTMLElement | null>(null);
  const isEditingRef = useRef(false);
  const isSelected = selectedBlockId === blockId;

  // 更新 document 的函数
  const updateDocument = useCallback((newText: string) => {
    const currentBlock = editorStateStore.getState().document[blockId];
    if (currentBlock && currentBlock.type === 'Button') {
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

  // 当选中时，查找 Button 组件渲染的按钮元素并设置文本为可编辑
  useEffect(() => {
    if (isSelected && buttonRef.current && !isEditingRef.current) {
      // 查找 Button 组件渲染的按钮元素 (button, a)
      const findButtonElement = (element: HTMLElement): HTMLElement | null => {
        // 先查找 button 标签
        const buttonTag = element.querySelector('button') as HTMLElement;
        if (buttonTag) {
          return buttonTag;
        }
        // 再查找 a 标签（不管是否有 role="button"）
        const aTag = element.querySelector('a') as HTMLElement;
        if (aTag) {
          return aTag;
        }
        // 如果都没有，返回 null（不设置外层 div 为可编辑）
        return null;
      };

      const buttonElement = findButtonElement(buttonRef.current);
      if (buttonElement) {
        // 直接使用 button 元素本身作为可编辑容器，统一整个按钮的文字在一个可编辑区域
        const textContainer = buttonElement;

        if (textContainer && textContainer !== buttonTextRef.current) {
          // 清理之前的 textContainer
          if (buttonTextRef.current) {
            buttonTextRef.current.contentEditable = 'false';
            buttonTextRef.current.style.cursor = '';
          }

          buttonTextRef.current = textContainer;
          textContainer.contentEditable = 'true';
          textContainer.style.cursor = 'text';

          // 确保外层 div 不可编辑
          if (buttonRef.current) {
            buttonRef.current.contentEditable = 'false';
            buttonRef.current.style.cursor = '';
          }

          // 如果是 <a> 标签，移除 href 或设置为 javascript:void(0)，防止跳转
          if (buttonElement.tagName === 'A') {
            const originalHref = buttonElement.getAttribute('href');
            buttonElement.setAttribute('data-original-href', originalHref || '');
            buttonElement.setAttribute('href', 'javascript:void(0)');
          }

          // 阻止按钮的默认点击行为（当选中时，始终阻止，以便可以编辑）
          const handleButtonClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            // 点击按钮时，聚焦到文本容器以便编辑
            if (textContainer) {
              textContainer.focus();
            }
          };
          buttonElement.addEventListener('click', handleButtonClick, true); // 使用 capture 阶段，确保先执行

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
            const newText = textContainer?.textContent || '';
            // 如果文本为空，保留原来的文本（从 props 中获取）
            const finalText = newText.trim() || props.props?.text || 'Button';
            updateDocument(finalText);
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
              textContainer?.blur();
            }
            if (e.key === 'Escape') {
              textContainer?.blur();
            }
            e.stopPropagation();
          };

          const handleClick = (e: MouseEvent) => {
            // 允许点击来聚焦和编辑
            e.stopPropagation();
            // 确保聚焦
            if (textContainer) {
              textContainer.focus();
            }
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
            buttonElement.removeEventListener('click', handleButtonClick, true);
            // 恢复 <a> 标签的原始 href
            if (buttonElement.tagName === 'A') {
              const originalHref = buttonElement.getAttribute('data-original-href');
              if (originalHref) {
                buttonElement.setAttribute('href', originalHref);
              } else {
                buttonElement.removeAttribute('href');
              }
              buttonElement.removeAttribute('data-original-href');
            }
            // 确保外层 div 不可编辑
            if (buttonRef.current) {
              buttonRef.current.contentEditable = 'false';
              buttonRef.current.style.cursor = '';
            }
            buttonTextRef.current = null;
            isEditingRef.current = false;
          };
        }
      }
    } else if (!isSelected && buttonTextRef.current) {
      // 取消选中时，恢复 contentEditable
      buttonTextRef.current.contentEditable = 'false';
      buttonTextRef.current.style.cursor = '';
      buttonTextRef.current = null;
      isEditingRef.current = false;
      // 确保外层 div 不可编辑
      if (buttonRef.current) {
        buttonRef.current.contentEditable = 'false';
        buttonRef.current.style.cursor = '';
      }
    }
  }, [isSelected, blockId, updateDocument]);

  return (
    <Box ref={buttonRef}>
      <Button {...props} />
    </Box>
  );
}
