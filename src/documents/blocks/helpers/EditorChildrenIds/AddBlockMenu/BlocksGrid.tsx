import React from 'react';

import { Box } from '@mui/material';

import { TEditorBlock } from '../../../../editor/core';

import BlockButton from './BlockButton';
import { BUTTONS } from './buttons';

type BlocksGridProps = {
  onSelect: (block: TEditorBlock) => void;
  disableContainerBlocks?: boolean; // 是否禁用 Container 和 ColumnsContainer
};

export default function BlocksGrid({ onSelect, disableContainerBlocks = false }: BlocksGridProps) {
  // 过滤按钮列表
  const filteredButtons = BUTTONS.filter((k) => {
    const block = k.block();
    const isContainerBlock = block.type === 'Container' || block.type === 'ColumnsContainer';
    // 如果 disableContainerBlocks 为 true，过滤掉 Container 和 ColumnsContainer
    if (disableContainerBlocks && isContainerBlock) {
      return false;
    }
    // 否则显示所有选项
    return true;
  });

  return (
    <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
      {filteredButtons.map((k, i) => {
        const block = k.block();
        return (
          <BlockButton
            key={i}
            label={k.label}
            icon={k.icon}
            onClick={() => onSelect(block)}
            disabled={false}
            block={block}
          />
        );
      })}
    </Box>
  );
}

