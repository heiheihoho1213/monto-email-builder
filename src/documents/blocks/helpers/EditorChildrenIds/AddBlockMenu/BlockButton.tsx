import React from 'react';

import { Box, Button, SxProps, Typography } from '@mui/material';

import { TEditorBlock } from '../../../../editor/core';

type BlockMenuButtonProps = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  block?: TEditorBlock; // 用于拖拽的 block 数据
  onDragStart?: (block: TEditorBlock) => void; // 拖拽开始回调
};

const BUTTON_SX: SxProps = { p: 1.5, display: 'flex', flexDirection: 'column' };
const ICON_SX: SxProps = {
  mb: 0.75,
  width: '100%',
  bgcolor: 'cadet.200',
  display: 'flex',
  justifyContent: 'center',
  p: 1,
  border: '1px solid',
  borderColor: 'cadet.300',
};

export default function BlockTypeButton({ label, icon, onClick, disabled = false, block, onDragStart }: BlockMenuButtonProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!block || disabled) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    // 使用特殊标识符表示这是从侧边栏拖拽的新块
    const sidebarBlockId = `sidebar-block-${block.type}-${Date.now()}`;
    e.dataTransfer.setData('text/plain', sidebarBlockId);
    // 设置全局变量，以便在 dragOver 事件中使用
    (window as any).__currentDraggedBlockId = sidebarBlockId;
    (window as any).__currentDraggedBlock = block;
    (window as any).__isSidebarBlock = true; // 标记这是侧边栏块
    setIsDragging(true);
    if (onDragStart) {
      onDragStart(block);
    }
  };

  const handleDragEnd = () => {
    (window as any).__currentDraggedBlockId = null;
    (window as any).__currentDraggedBlock = null;
    (window as any).__isSidebarBlock = false;
    setIsDragging(false);
  };

  return (
    <Button
      sx={{
        ...BUTTON_SX,
        cursor: disabled ? 'default' : 'pointer',
        outline: isDragging ? '2px dashed rgba(0,121,204, 0.8)' : 'none',
        outlineOffset: isDragging ? '-2px' : '0',
        '&:hover': {
          cursor: disabled ? 'default' : 'pointer',
        },
      }}
      disabled={disabled}
      draggable={!disabled && !!block}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={(ev) => {
        ev.stopPropagation();
        if (!disabled) {
          onClick();
        }
      }}
    >
      <Box sx={ICON_SX}>{icon}</Box>
      <Typography variant="body2">{label}</Typography>
    </Button>
  );
}
