import React, { useMemo } from 'react';

import {
  FOOTER_TEMPLATES,
  HEADER_TEMPLATES,
  THeaderFooterSlot,
  TSlotTemplate,
  buildSlotPreviewDocument,
} from '../../documents/editor/headerFooter';
import { useTranslation } from '../../i18n/useTranslation';

import TemplateGalleryDialog, { TGalleryGroup } from './TemplateGalleryDialog';
import { renderPreviewHtml } from './TemplatePreview';

type Props = {
  open: boolean;
  /** 只显示某一类；不传则同时显示页眉与页脚两个分组 */
  slots?: THeaderFooterSlot[];
  initialSlot?: THeaderFooterSlot;
  onClose: () => void;
  onSelect: (slot: THeaderFooterSlot, template: TSlotTemplate) => void;
};

export default function HeaderFooterGalleryDialog({ open, slots = ['header', 'footer'], initialSlot, onClose, onSelect }: Props) {
  const { t, language } = useTranslation();

  const groups = useMemo<TGalleryGroup[]>(
    () =>
      slots.map((slot) => {
        const templates = slot === 'header' ? HEADER_TEMPLATES : FOOTER_TEMPLATES;
        return {
          id: slot,
          label: slot === 'header' ? t('headerFooter.headers') : t('headerFooter.footers'),
          previewMaxHeight: slot === 'header' ? 120 : 170,
          items: templates.map((template) => ({
            id: template.id,
            title: template.name[language],
            description: template.description[language],
            getHtml: () => renderPreviewHtml(buildSlotPreviewDocument(template)),
          })),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots.join(','), language]
  );

  const title =
    slots.length === 1
      ? slots[0] === 'header'
        ? t('headerFooter.chooseHeader')
        : t('headerFooter.chooseFooter')
      : t('headerFooter.title');

  return (
    <TemplateGalleryDialog
      open={open}
      title={title}
      groups={groups}
      initialGroupId={initialSlot}
      onClose={onClose}
      onSelect={(groupId, itemId) => {
        const slot = groupId as THeaderFooterSlot;
        const templates = slot === 'header' ? HEADER_TEMPLATES : FOOTER_TEMPLATES;
        const template = templates.find((tpl) => tpl.id === itemId);
        if (template) onSelect(slot, template);
      }}
    />
  );
}
