import React, { useState } from 'react';

import { Button, Link, Stack, Typography } from '@mui/material';

import { editorStateStore, replaceDocument, setEditingSlot, setSelectedBlockId, useDocument, useEditingSlot } from '../../documents/editor/EditorContext';
import {
  FEATURED_COUNT,
  FOOTER_BLOCK_ID,
  FOOTER_TEMPLATES,
  HEADER_BLOCK_ID,
  HEADER_TEMPLATES,
  THeaderFooterSlot,
  TSlotTemplate,
  applyHeaderFooterTemplate,
} from '../../documents/editor/headerFooter';
import { useTranslation } from '../../i18n/useTranslation';
import HeaderFooterGalleryDialog from '../TemplateGallery/HeaderFooterGalleryDialog';

export default function HeaderFooterTemplates() {
  const { t, language } = useTranslation();
  const document = useDocument();
  const editingSlot = useEditingSlot();
  const [gallerySlot, setGallerySlot] = useState<THeaderFooterSlot | null>(null);

  const slotHasContent = (slot: THeaderFooterSlot) => {
    const block = document[slot === 'header' ? HEADER_BLOCK_ID : FOOTER_BLOCK_ID];
    return block?.type === 'Container' && (block.data.props?.childrenIds ?? []).length > 0;
  };

  // 打开已有页眉/页脚进行单独编辑（不替换内容）
  const handleEdit = (slot: THeaderFooterSlot) => {
    setEditingSlot(slot);
    setSelectedBlockId(slot === 'header' ? HEADER_BLOCK_ID : FOOTER_BLOCK_ID);
  };

  const handleSelect = (slot: THeaderFooterSlot, template: TSlotTemplate) => {
    const current = editorStateStore.getState().document;
    replaceDocument(applyHeaderFooterTemplate(current, slot, template));
    setEditingSlot(slot);
    setSelectedBlockId(slot === 'header' ? HEADER_BLOCK_ID : FOOTER_BLOCK_ID);
  };

  const renderGroup = (slot: THeaderFooterSlot, title: string, templates: TSlotTemplate[]) => (
    <Stack alignItems="flex-start">
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', px: 0.75 }}>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
          {title}
        </Typography>
        {slotHasContent(slot) && editingSlot !== slot && (
          <Link component="button" type="button" underline="hover" onClick={() => handleEdit(slot)} sx={{ fontSize: 12 }}>
            {t('headerFooter.edit')}
          </Link>
        )}
      </Stack>
      {templates.slice(0, FEATURED_COUNT).map((template) => (
        <Button key={template.id} size="small" onClick={() => handleSelect(slot, template)}>
          {template.name[language]}
        </Button>
      ))}
      {templates.length > FEATURED_COUNT && (
        <Button size="small" color="secondary" onClick={() => setGallerySlot(slot)} sx={{ fontWeight: 600 }}>
          {t('headerFooter.more', { count: templates.length - FEATURED_COUNT })}
        </Button>
      )}
    </Stack>
  );

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" sx={{ px: 0.75, fontWeight: 500 }}>
        {t('headerFooter.title')}
      </Typography>
      {renderGroup('header', t('headerFooter.headers'), HEADER_TEMPLATES)}
      {renderGroup('footer', t('headerFooter.footers'), FOOTER_TEMPLATES)}
      <HeaderFooterGalleryDialog
        open={gallerySlot !== null}
        initialSlot={gallerySlot ?? undefined}
        onClose={() => setGallerySlot(null)}
        onSelect={handleSelect}
      />
    </Stack>
  );
}
