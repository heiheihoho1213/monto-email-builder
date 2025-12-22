import React, { Fragment, useState } from 'react';

import { Box } from '@mui/material';

import { TEditorBlock } from '../../../editor/core';
import EditorBlock from '../../../editor/EditorBlock';

import AddBlockButton from './AddBlockMenu';

export type EditorChildrenChange = {
  blockId: string;
  block: TEditorBlock;
  childrenIds: string[];
};

function generateId() {
  return `block-${Date.now()}`;
}

export type EditorChildrenIdsProps = {
  childrenIds: string[] | null | undefined;
  onChange: (val: EditorChildrenChange) => void;
};

// 从 window 对象获取当前拖拽的 blockId（因为在 dragOver 事件中无法读取 dataTransfer）
const getCurrentDraggedBlockId = (): string | null => {
  return (window as any).__currentDraggedBlockId || null;
};

export default function EditorChildrenIds({ childrenIds, onChange }: EditorChildrenIdsProps) {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const appendBlock = (block: TEditorBlock) => {
    const blockId = generateId();
    return onChange({
      blockId,
      block,
      childrenIds: [...(childrenIds || []), blockId],
    });
  };

  const insertBlock = (block: TEditorBlock, index: number) => {
    const blockId = generateId();
    const newChildrenIds = [...(childrenIds || [])];
    newChildrenIds.splice(index, 0, blockId);
    return onChange({
      blockId,
      block,
      childrenIds: newChildrenIds,
    });
  };


  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    // 在 dragOver 事件中无法读取 dataTransfer，使用全局变量
    const draggedId = getCurrentDraggedBlockId();
    if (draggedId) {
      setDraggedBlockId(draggedId);
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();
    if (!draggedId || !childrenIds) {
      (window as any).__currentDraggedBlockId = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    const sourceIndex = childrenIds.indexOf(draggedId);
    if (sourceIndex === -1 || sourceIndex === dropIndex) {
      (window as any).__currentDraggedBlockId = null;
      setDraggedBlockId(null);
      setDragOverIndex(null);
      return;
    }

    const newChildrenIds = [...childrenIds];
    const [removed] = newChildrenIds.splice(sourceIndex, 1);
    newChildrenIds.splice(dropIndex, 0, removed);

    // 通过 onChange 通知父组件更新 childrenIds
    onChange({
      blockId: draggedId,
      block: {} as TEditorBlock, // 这个不会被使用，只是满足类型要求
      childrenIds: newChildrenIds,
    });

    (window as any).__currentDraggedBlockId = null;
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    (window as any).__currentDraggedBlockId = null;
    setDraggedBlockId(null);
    setDragOverIndex(null);
  };

  if (!childrenIds || childrenIds.length === 0) {
    return <AddBlockButton placeholder onSelect={appendBlock} />;
  }

  return (
    <>
      {childrenIds.map((childId, i) => {
        const isLastBlock = i === childrenIds.length - 1;
        const showTopIndicator = dragOverIndex === i && draggedBlockId !== null && draggedBlockId !== childId;
        const showBottomIndicator = isLastBlock && dragOverIndex === childrenIds.length && draggedBlockId !== null && draggedBlockId !== childId;
        
        return (
          <Fragment key={childId}>
            <AddBlockButton onSelect={(block) => insertBlock(block, i)} />
            <Box
              onDragOver={(e) => {
                // 如果是最后一个块，检查是否拖拽到块的下方区域
                if (isLastBlock) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseY = e.clientY;
                  const blockBottom = rect.bottom;
                  // 如果鼠标在块的下半部分，认为是拖拽到底部
                  if (mouseY > blockBottom - rect.height / 2) {
                    const draggedId = getCurrentDraggedBlockId();
                    if (draggedId) {
                      setDraggedBlockId(draggedId);
                      setDragOverIndex(childrenIds.length);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                }
                handleDragOver(e, i);
              }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => {
                // 如果是最后一个块且拖拽到底部
                if (isLastBlock && dragOverIndex === childrenIds.length) {
                  e.preventDefault();
                  e.stopPropagation();
                  const draggedId = e.dataTransfer.getData('text/plain') || getCurrentDraggedBlockId();
                  if (!draggedId || !childrenIds) {
                    (window as any).__currentDraggedBlockId = null;
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                    return;
                  }
                  const sourceIndex = childrenIds.indexOf(draggedId);
                  if (sourceIndex === -1 || sourceIndex === childrenIds.length - 1) {
                    (window as any).__currentDraggedBlockId = null;
                    setDraggedBlockId(null);
                    setDragOverIndex(null);
                    return;
                  }
                  const newChildrenIds = [...childrenIds];
                  const [removed] = newChildrenIds.splice(sourceIndex, 1);
                  newChildrenIds.push(removed);
                  onChange({
                    blockId: draggedId,
                    block: {} as TEditorBlock,
                    childrenIds: newChildrenIds,
                  });
                  (window as any).__currentDraggedBlockId = null;
                  setDraggedBlockId(null);
                  setDragOverIndex(null);
                  return;
                }
                handleDrop(e, i);
              }}
              onDragEnd={handleDragEnd}
              sx={{
                position: 'relative',
                '&::before': showTopIndicator
                  ? {
                      content: '""',
                      position: 'absolute',
                      top: -2,
                      left: 0,
                      right: 0,
                      height: 4,
                      backgroundColor: 'primary.main',
                      zIndex: 1000,
                      pointerEvents: 'none',
                    }
                  : {},
                '&::after': showBottomIndicator
                  ? {
                      content: '""',
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      right: 0,
                      height: 4,
                      backgroundColor: 'primary.main',
                      zIndex: 1000,
                      pointerEvents: 'none',
                    }
                  : {},
              }}
            >
              <EditorBlock id={childId} />
            </Box>
          </Fragment>
        );
      })}
      <AddBlockButton onSelect={appendBlock} />
    </>
  );
}
