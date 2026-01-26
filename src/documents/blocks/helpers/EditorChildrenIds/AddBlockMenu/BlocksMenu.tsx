import React from 'react';

import { Box, Menu } from '@mui/material';

import { TEditorBlock } from '../../../../editor/core';

import BlockButton from './BlockButton';
import { BUTTONS } from './buttons';

type BlocksMenuProps = {
  anchorEl: HTMLElement | null;
  setAnchorEl: (v: HTMLElement | null) => void;
  onSelect: (block: TEditorBlock) => void;
  disableContainerBlocks?: boolean; // 是否禁用 Container 和 ColumnsContainer
  containerType?: string | null; // 当前容器类型，用于精确控制禁用哪些块
};
export default function BlocksMenu({ anchorEl, setAnchorEl, onSelect, disableContainerBlocks = false, containerType = null }: BlocksMenuProps) {
  const onClose = () => {
    setAnchorEl(null);
  };

  const onClick = (block: TEditorBlock) => {
    onSelect(block);
    setAnchorEl(null);
  };

  if (anchorEl === null) {
    return null;
  }

  // 过滤按钮列表
  const filteredButtons = BUTTONS.filter((k) => {
    const block = k.block();
    const isContainerBlock = block.type === 'Container' || block.type === 'ColumnsContainer';

    // 如果 disableContainerBlocks 为 true，根据容器类型精确控制
    if (disableContainerBlocks && isContainerBlock) {
      // Container 内部：禁用 ColumnsContainer（但不禁用 Container）
      if (containerType === 'Container' && block.type === 'ColumnsContainer') {
        return false;
      }
      // ColumnsContainer 内部：禁用 ColumnsContainer（但不禁用 Container）
      if (containerType === 'ColumnsContainer' && block.type === 'ColumnsContainer') {
        return false;
      }
      // 如果不在容器内，或者不匹配上述条件，保持原有逻辑（禁用所有 Container 和 ColumnsContainer）
      if (!containerType || (containerType !== 'Container' && containerType !== 'ColumnsContainer')) {
        return false;
      }
    }
    // 否则显示所有选项
    return true;
  });

  return (
    <Menu
      open
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
        {filteredButtons.map((k, i) => {
          const block = k.block();
          return (
            <BlockButton
              key={i}
              label={k.label}
              icon={k.icon}
              onClick={() => onClick(block)}
              disabled={false}
            />
          );
        })}
      </Box>
    </Menu>
  );
}
