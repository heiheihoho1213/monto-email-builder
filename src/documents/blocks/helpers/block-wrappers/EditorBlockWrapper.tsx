import React, { CSSProperties, useState } from 'react';

import { Box } from '@mui/material';

import { useCurrentBlockId } from '../../../editor/EditorBlock';
import { setSelectedBlockId, useSelectedBlockId, editorStateStore } from '../../../editor/EditorContext';

import TuneMenu from './TuneMenu';

type TEditorBlockWrapperProps = {
  children: JSX.Element;
};

export default function EditorBlockWrapper({ children }: TEditorBlockWrapperProps) {
  const selectedBlockId = useSelectedBlockId();
  const [mouseInside, setMouseInside] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const blockId = useCurrentBlockId();

  // 获取当前block的类型
  const document = editorStateStore.getState().document;
  const blockData = document[blockId];
  // ColumnsContainer 也可以拖拽，但需要在 handleDragStart 中检查是否点击的是列区域
  const isDraggable = true;

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

  const handleDragEnd = () => {
    setIsDragging(false);
    (window as any).__currentDraggedBlockId = null;
    (window as any).__currentDraggedBlock = null;
  };

  return (
    <Box
      draggable={isDraggable}
      sx={{
        position: 'relative',
        maxWidth: '100%',
        width: '100%', // 确保宽度为100%
        minWidth: 0, // 确保flex布局中文本可以换行
        outlineOffset: '-1px',
        outline,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDraggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        overflowWrap: 'break-word', // 允许长单词换行
        wordBreak: 'break-word', // 确保文本换行。
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={(ev) => {
        setMouseInside(true);
        ev.stopPropagation();
      }}
      onMouseLeave={() => {
        setMouseInside(false);
      }}
      onClick={(ev) => {
        setSelectedBlockId(blockId);
        ev.stopPropagation();
        ev.preventDefault();
      }}
    >
      {renderMenu()}
      {children}
    </Box>
  );
}
