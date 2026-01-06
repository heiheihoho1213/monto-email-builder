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
  const buttonRef = React.useRef<HTMLButtonElement>(null);

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

    // 立即设置自定义拖拽图像，使用按钮本身的克隆，避免按住几秒后浏览器重新计算包含周围元素
    if (buttonRef.current) {
      // 克隆按钮元素
      const dragImage = buttonRef.current.cloneNode(true) as HTMLElement;
      // 设置样式，确保只显示按钮本身
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-9999px';
      dragImage.style.left = '-9999px';
      dragImage.style.width = `${buttonRef.current.offsetWidth}px`;
      dragImage.style.height = `${buttonRef.current.offsetHeight}px`;
      dragImage.style.pointerEvents = 'none';
      // 添加边框和背景色，参照选中状态的样式
      dragImage.style.outline = '2px dashed rgba(0,121,204, 0.8)';
      dragImage.style.outlineOffset = '-2px';
      dragImage.style.backgroundColor = '#ffffff'; // 白色背景
      // 添加到DOM中（浏览器需要元素在DOM中才能作为拖拽图像）
      document.body.appendChild(dragImage);

      // 计算鼠标相对于按钮的偏移量
      const rect = buttonRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      // 设置拖拽图像
      e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

      // 在下一帧移除临时元素
      requestAnimationFrame(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      });
    }

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
      ref={buttonRef}
      sx={{
        ...BUTTON_SX,
        // cursor: disabled ? 'default' : 'move',
        outline: isDragging ? '2px dashed rgba(0,121,204, 0.8)' : 'none',
        outlineOffset: isDragging ? '-2px' : '0',
        '&:hover': {
          cursor: disabled ? 'not-allowed' : (block ? 'grab' : 'pointer'),
        },
        // '&:active': {
        //   cursor: disabled ? 'default' : 'grabbing',
        // },
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
