import React from 'react';

import { Button, Divider, Drawer, Stack, Typography } from '@mui/material';

import { resetDocument, useSamplesDrawerOpen, setDocument, setSelectedBlockId, useDocument, useShowSamplesDrawerTitle, editorStateStore, setEditingSlot } from '../../documents/editor/EditorContext';
import { FOOTER_BLOCK_ID, HEADER_BLOCK_ID } from '../../documents/editor/headerFooter';
import { useLeftPanelSlot } from '../../LeftPanelSlotContext';
import { useTranslation } from '../../i18n/useTranslation';
import { TEditorBlock } from '../../documents/editor/core';
import EMPTY_EMAIL_MESSAGE from '../../getConfiguration/sample/empty-email-message';

import BuiltInTemplates from './BuiltInTemplates';
import HeaderFooterTemplates from './HeaderFooterTemplates';
import BlocksGrid from '../../documents/blocks/helpers/EditorChildrenIds/AddBlockMenu/BlocksGrid';

export const SAMPLES_DRAWER_WIDTH = 240;

function generateId() {
  return `block-${Date.now()}`;
}

export default function SamplesDrawer() {
  const { t } = useTranslation();
  const samplesDrawerOpen = useSamplesDrawerOpen();
  const document = useDocument();
  const showSamplesDrawerTitle = useShowSamplesDrawerTitle();
  const leftPanelSlot = useLeftPanelSlot();

  const handleNewDocumentClick = () => {
    setEditingSlot(null);
    resetDocument(EMPTY_EMAIL_MESSAGE);
  };

  // 查找根 EmailLayout 节点
  const findRootEmailLayoutId = (): string | null => {
    for (const [blockId, block] of Object.entries(document)) {
      if (block.type === 'EmailLayout') {
        return blockId;
      }
    }
    return null;
  };

  // 处理从侧边栏添加块
  const handleBlockSelect = (block: TEditorBlock) => {
    // 单独编辑页眉/页脚时，新块加入该区域
    const editingSlot = editorStateStore.getState().editingSlot;
    if (editingSlot) {
      const slotId = editingSlot === 'header' ? HEADER_BLOCK_ID : FOOTER_BLOCK_ID;
      const slotBlock = document[slotId];
      if (!slotBlock || slotBlock.type !== 'Container') {
        return;
      }
      const newBlockId = generateId();
      setDocument({
        [slotId]: {
          type: 'Container',
          data: {
            ...slotBlock.data,
            props: { ...slotBlock.data.props, childrenIds: [...(slotBlock.data.props?.childrenIds ?? []), newBlockId] },
          },
        },
        [newBlockId]: block,
      });
      setSelectedBlockId(newBlockId);
      return;
    }

    const rootId = findRootEmailLayoutId();
    if (!rootId) {
      return;
    }

    const blockId = generateId();
    const rootBlock = document[rootId];
    if (!rootBlock || rootBlock.type !== 'EmailLayout') {
      return;
    }

    const currentChildrenIds = rootBlock.data.childrenIds || [];
    const newChildrenIds = [...currentChildrenIds, blockId];

    setDocument({
      [rootId]: {
        type: 'EmailLayout',
        data: {
          ...rootBlock.data,
          childrenIds: newChildrenIds,
        },
      },
      [blockId]: block,
    });
    setSelectedBlockId(blockId);
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={samplesDrawerOpen}
      PaperProps={{
        sx: {
          position: 'relative',
          height: '100%',
          zIndex: 0,
        },
      }}
      sx={{
        position: 'relative',
        width: samplesDrawerOpen ? SAMPLES_DRAWER_WIDTH : 0,
        flexShrink: 0,
        flexGrow: 0,
        overflow: 'hidden',
        zIndex: 0,
        '& .MuiDrawer-paper': {
          position: 'relative',
          height: '100%',
          width: '100%',
          zIndex: 0,
          overflowX: 'hidden',
        },
      }}
    >
      <Stack spacing={3} py={1} px={2} width={SAMPLES_DRAWER_WIDTH} sx={{ overflowY: 'auto', overflowX: 'hidden', height: '100%' }}>
        <Stack spacing={2} sx={{ '& .MuiButtonBase-root': { width: '100%', justifyContent: 'flex-start' } }}>
          {showSamplesDrawerTitle && (
            <>
              <Typography variant="h6" component="h1" sx={{ p: 0.75 }}>
                {t('common.emailBuilder')}
              </Typography>
              <Stack spacing={1} alignItems="flex-start" style={{ marginTop: showSamplesDrawerTitle ? 0 : 8 }}>
                <Button
                  // size="small"
                  variant="contained"
                  color="primary"
                  onClick={handleNewDocumentClick}
                  sx={{
                    fontWeight: 500,
                    width: '100%',
                    justifyContent: 'flex-start',
                  }}
                >
                  {t('common.newDocument')}
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ px: 0.75, fontWeight: 500 }}>
                  {t('common.useBuiltInTemplates')}
                </Typography>
                <BuiltInTemplates />
              </Stack>

              <Divider />
            </>
          )}

          {leftPanelSlot ? leftPanelSlot : null}

          <HeaderFooterTemplates />

          <Divider />

          <Stack spacing={1} sx={{ mt: showSamplesDrawerTitle ? 0 : '16px !important' }}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 0.75, fontWeight: 500 }}>
              {t('common.addContentBlocks')}
            </Typography>
            <BlocksGrid onSelect={handleBlockSelect} disableContainerBlocks={false} />
          </Stack>
        </Stack>
      </Stack>
    </Drawer>
  );
}
