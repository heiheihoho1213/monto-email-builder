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

  // 获取当前block的类型，如果是 ColumnsContainer，禁用拖拽
  const document = editorStateStore.getState().document;
  const blockData = document[blockId];
  const isDraggable = blockData?.type !== 'ColumnsContainer';

  let outline: CSSProperties['outline'];
  if (selectedBlockId === blockId) {
    outline = '2px solid rgba(0,121,204, 1)';
  } else if (mouseInside && !isDragging) {
    outline = '2px solid rgba(0,121,204, 0.3)';
  }

  const renderMenu = () => {
    if (selectedBlockId !== blockId || isDragging) {
      return null;
    }
    return <TuneMenu blockId={blockId} />;
  };

  const handleDragStart = (e: React.DragEvent) => {
    // 如果是 ColumnsContainer，禁用拖拽（只允许拖拽列中的元素）
    // 但是不要阻止事件冒泡，让子元素可以正常拖拽
    if (blockData?.type === 'ColumnsContainer') {
      e.preventDefault();
      return;
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
        outlineOffset: '-1px',
        outline,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDraggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
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
