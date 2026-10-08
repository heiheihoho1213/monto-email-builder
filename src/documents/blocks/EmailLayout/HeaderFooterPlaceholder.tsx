import React, { useState } from 'react';

import { Box, Button } from '@mui/material';

import EditorBlock from '../../editor/EditorBlock';
import { editorStateStore, replaceDocument, setEditingSlot, setSelectedBlockId } from '../../editor/EditorContext';
import { FOOTER_BLOCK_ID, HEADER_BLOCK_ID, THeaderFooterSlot, applyHeaderFooterTemplate } from '../../editor/headerFooter';
import HeaderFooterGalleryDialog from '../../../App/TemplateGallery/HeaderFooterGalleryDialog';
import { useTranslation } from '../../../i18n/useTranslation';

const slotBlockId = (slot: THeaderFooterSlot) => (slot === 'header' ? HEADER_BLOCK_ID : FOOTER_BLOCK_ID);

/** 预设页眉/页脚模板画廊（仅当前区域） */
function TemplatePicker({ slot, open, onClose }: { slot: THeaderFooterSlot; open: boolean; onClose: () => void }) {
  return (
    <HeaderFooterGalleryDialog
      open={open}
      slots={[slot]}
      onClose={onClose}
      onSelect={(_, template) => {
        const document = editorStateStore.getState().document;
        replaceDocument(applyHeaderFooterTemplate(document, slot, template));
        // 只在单独编辑模式下选中页眉/页脚；完整视图中页眉/页脚只读
        if (editorStateStore.getState().editingSlot === slot) {
          setSelectedBlockId(slotBlockId(slot));
        }
      }}
    />
  );
}

/** 页眉/页脚为空时在画布中显示的占位，点击后选择预设模板 */
export default function HeaderFooterPlaceholder({ slot }: { slot: THeaderFooterSlot }) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setPickerOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPickerOpen(true);
          }
        }}
        sx={{
          m: 1,
          py: 2.5,
          border: '1px dashed',
          borderColor: 'rgba(0,121,204,0.5)',
          borderRadius: 1,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 500,
          color: '#0079CC',
          backgroundColor: 'rgba(0,121,204,0.04)',
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(0,121,204,0.08)', borderColor: '#0079CC' },
        }}
      >
        + {slot === 'header' ? t('headerFooter.selectHeader') : t('headerFooter.selectFooter')}
      </Box>
      <TemplatePicker slot={slot} open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}

/** 完整邮件视图下的页眉/页脚：内容只读（可选中整体以删除），悬停时可更换模板或进入单独编辑 */
export function ReadOnlyHeaderFooter({ slot }: { slot: THeaderFooterSlot }) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const showActions = hover && !pickerOpen;

  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      sx={{ position: 'relative' }}
    >
      <EditorBlock id={slotBlockId(slot)} />
      {showActions && (
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            zIndex: 10,
            display: 'flex',
            gap: 0.5,
            '& .MuiButton-root': { fontSize: 12, py: 0.25, px: 1, minWidth: 0, boxShadow: 1 },
          }}
        >
          <Button
            size="small"
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen(true);
            }}
          >
            {slot === 'header' ? t('headerFooter.changeHeader') : t('headerFooter.changeFooter')}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="inherit"
            onClick={(e) => {
              e.stopPropagation();
              setEditingSlot(slot);
              setSelectedBlockId(slotBlockId(slot));
            }}
            sx={{ backgroundColor: '#fff' }}
          >
            {t('headerFooter.edit')}
          </Button>
        </Box>
      )}
      <TemplatePicker
        slot={slot}
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setHover(false);
        }}
      />
    </Box>
  );
}
