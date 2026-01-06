import React, { CSSProperties, useState, useRef, useEffect } from 'react';

import { Box, IconButton } from '@mui/material';
import { DragIndicator } from '@mui/icons-material';

import { useCurrentBlockId } from '../../../editor/EditorBlock';
import { setSelectedBlockId, useSelectedBlockId, editorStateStore } from '../../../editor/EditorContext';

import TuneMenu from './TuneMenu';

type TEditorBlockWrapperProps = {
  children: JSX.Element;
};

export default function EditorBlockWrapper({ children }: TEditorBlockWrapperProps) {
  const selectedBlockId = useSelectedBlockId();
  const [mouseInside, setMouseInside] = useState(false);
  const [mouseOnChild, setMouseOnChild] = useState(false); // 跟踪鼠标是否在子元素上
  const [isDragging, setIsDragging] = useState(false);
  const blockId = useCurrentBlockId();
  const isHandlerClickedRef = useRef<boolean>(false); // 跟踪是否点击了 handler

  // 获取当前block的类型
  const editorDocument = editorStateStore.getState().document;
  const blockData = editorDocument[blockId];
  // ColumnsContainer 也可以拖拽，但需要在 handleDragStart 中检查是否点击的是列区域
  const isDraggable = true;

  // 检查是否是 Container 或 ColumnsContainer
  const isContainer = blockData?.type === 'Container' || blockData?.type === 'ColumnsContainer';

  let outline: CSSProperties['outline'];
  if (isDragging) {
    // 拖拽时显示虚线边框
    outline = '2px dashed rgba(0,121,204, 0.8)';
  } else if (selectedBlockId === blockId) {
    outline = '2px solid rgba(0,121,204, 1)';
  } else if (mouseInside) {
    outline = '2px solid rgba(0,121,204, 0.3)';
  }

  const renderMenu = () => {
    if (selectedBlockId !== blockId || isDragging) {
      return null;
    }
    return <TuneMenu blockId={blockId} />;
  };

  const handleDragStart = (e: React.DragEvent) => {
    // 检查是否是通过 handler 触发的拖拽
    if (!isHandlerClickedRef.current) {
      e.preventDefault();
      return;
    }

    const dragSource = e.target as HTMLElement;
    // 如果是 ColumnsContainer，需要检查是否点击的是列区域
    // 如果点击的是列区域（子元素），不应该拖动整个 ColumnsContainer
    if (blockData?.type === 'ColumnsContainer') {
      const target = e.target as HTMLElement;

      // 检查点击的目标是否是列区域或其子元素
      // 如果点击的是列内的元素，不应该拖动整个 ColumnsContainer
      const isColumnArea = target.closest('[data-column-area]') !== null;

      // 如果点击的是列区域，阻止拖拽整个 ColumnsContainer
      if (isColumnArea) {
        e.preventDefault();
        return;
      }
    }

    // 阻止事件冒泡，避免触发父元素的拖拽
    e.stopPropagation();

    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    // 设置全局变量，以便在 dragOver 事件中使用
    (window as any).__currentDraggedBlockId = blockId;
    // 保存被拖拽的block数据，用于跨容器拖拽
    if (blockData) {
      (window as any).__currentDraggedBlock = blockData;
    }
  };

  // Handler 鼠标按下事件
  const handleHandlerMouseDown = () => {
    isHandlerClickedRef.current = true;
  };

  // 鼠标松开时重置标记
  useEffect(() => {
    const handleMouseUp = () => {
      isHandlerClickedRef.current = false;
    };

    if (typeof window !== 'undefined' && window.document) {
      window.document.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, []);

  const handleDragEnd = () => {
    setIsDragging(false);
    (window as any).__currentDraggedBlockId = null;
    (window as any).__currentDraggedBlock = null;
    isHandlerClickedRef.current = false; // 重置标记
  };

  return (
    <Box
      draggable={isDraggable}
      data-editor-block-wrapper="true"
      sx={{
        position: 'relative',
        maxWidth: '100%',
        width: '100%', // 确保宽度为100%
        minWidth: 0, // 确保flex布局中文本可以换行
        outlineOffset: '-1px',
        outline,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'default', // 移除 grab 光标，因为只有 handler 可以拖拽
        overflowWrap: 'break-word', // 允许长单词换行
        wordBreak: 'break-word', // 确保文本换行。
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={(ev) => {
        setMouseInside(true);
        ev.stopPropagation();
      }}
      onMouseLeave={(ev) => {
        setMouseInside(false);
        setMouseOnChild(false);
      }}
      onMouseMove={(ev) => {
        if (isContainer) {
          // 检查鼠标是否在子元素的 EditorBlockWrapper 上
          const target = ev.target as HTMLElement;
          const childWrapper = target.closest('[data-editor-block-wrapper]');
          // 如果找到了子元素的 wrapper，且不是当前元素本身
          if (childWrapper && childWrapper !== ev.currentTarget) {
            setMouseOnChild(true);
          } else {
            setMouseOnChild(false);
          }
        }
      }}
      onClick={(ev) => {
        setSelectedBlockId(blockId);
        ev.stopPropagation();
        ev.preventDefault();
      }}
    >
      {/* 拖拽 Handler - 鼠标悬停时显示，但如果鼠标在子元素上则不显示（针对 Container 和 ColumnsContainer） */}
      {mouseInside && (!isContainer || !mouseOnChild) && (
        <IconButton
          size="small"
          onMouseDown={(e) => {
            e.stopPropagation();
            handleHandlerMouseDown();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          sx={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            right: '-16px',
            zIndex: 10,
            cursor: 'grab',
            color: 'text.secondary',
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:active': { cursor: 'grabbing' },
            '&:hover': {
              backgroundColor: 'background.paper',
              borderColor: 'primary.main',
            },
          }}
        >
          <DragIndicator fontSize="small" />
        </IconButton>
      )}
      {renderMenu()}
      {children}
    </Box>
  );
}
