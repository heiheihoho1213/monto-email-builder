import React from 'react';

import { Box } from '@mui/material';

import { TEditorBlock } from '../../../../editor/core';
import { useTranslation } from '../../../../../i18n/useTranslation';

import BlockButton from './BlockButton';
import { BUTTONS } from './buttons';

type BlocksGridProps = {
  onSelect: (block: TEditorBlock) => void;
  disableContainerBlocks?: boolean; // 是否禁用 Container 和 ColumnsContainer
  containerType?: string | null; // 当前容器类型，用于精确控制禁用哪些块
};

// 将 block type 映射到国际化 key
const getBlockI18nKey = (blockType: string): string => {
  const typeMap: Record<string, string> = {
    'Heading': 'heading.name',
    'Text': 'text.name',
    'Button': 'button.name',
    'Image': 'image.name',
    'Video': 'video.name',
    'Divider': 'divider.name',
    'Spacer': 'spacer.name',
    'Socials': 'socials.name',
    'Html': 'html.name',
    'ColumnsContainer': 'columns.name',
    'Container': 'container.name',
  };
  return typeMap[blockType] || blockType;
};

export default function BlocksGrid({ onSelect, disableContainerBlocks = false, containerType = null }: BlocksGridProps) {
  const { t } = useTranslation();

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
    <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5 }}>
      {filteredButtons.map((k, i) => {
        const block = k.block();
        // 使用国际化翻译组件名称
        const i18nKey = getBlockI18nKey(block.type);
        const translatedLabel = t(i18nKey);
        return (
          <BlockButton
            key={i}
            label={translatedLabel}
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

