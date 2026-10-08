import React, { useMemo, useState } from 'react';

import { Button, Stack } from '@mui/material';

import {
  BUILT_IN_TEMPLATES,
  FEATURED_BUILT_IN_COUNT,
  TBuiltInTemplate,
  TEMPLATE_CATEGORIES,
} from '../../getConfiguration/builtInTemplates';
import { loadSampleTemplate } from '../../getConfiguration';
import { useTranslation } from '../../i18n/useTranslation';
import TemplateGalleryDialog, { TGalleryGroup } from '../TemplateGallery/TemplateGalleryDialog';
import { renderPreviewHtml } from '../TemplateGallery/TemplatePreview';

import SidebarButton, { openSampleTemplate } from './SidebarButton';

export default function BuiltInTemplates() {
  const { t, language } = useTranslation();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const labelOf = (tpl: TBuiltInTemplate) => (tpl.labelKey ? t(tpl.labelKey) : tpl.label ?? tpl.sampleName);

  // 「全部」+ 各分类（无模板的分类不显示）
  const groups = useMemo<TGalleryGroup[]>(() => {
    const toItem = (tpl: TBuiltInTemplate) => ({
      id: tpl.sampleName,
      title: labelOf(tpl),
      getHtml: () => loadSampleTemplate(tpl.sampleName).then(renderPreviewHtml),
    });
    const all: TGalleryGroup = {
      id: 'all',
      label: t('templateCategories.all'),
      previewMaxHeight: 340,
      items: BUILT_IN_TEMPLATES.map(toItem),
    };
    const byCategory = TEMPLATE_CATEGORIES.map<TGalleryGroup>((category) => ({
      id: category,
      label: t(`templateCategories.${category}`),
      previewMaxHeight: 340,
      items: BUILT_IN_TEMPLATES.filter((tpl) => tpl.categories.includes(category)).map(toItem),
    })).filter((group) => group.items.length > 0);
    return [all, ...byCategory];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return (
    <Stack alignItems="flex-start">
      {BUILT_IN_TEMPLATES.slice(0, FEATURED_BUILT_IN_COUNT).map((tpl) => (
        <SidebarButton key={tpl.sampleName} sampleName={tpl.sampleName}>
          {labelOf(tpl)}
        </SidebarButton>
      ))}
      {BUILT_IN_TEMPLATES.length > FEATURED_BUILT_IN_COUNT && (
        <Button size="small" color="secondary" onClick={() => setGalleryOpen(true)} sx={{ fontWeight: 600 }}>
          {t('common.showMoreTemplates', { count: BUILT_IN_TEMPLATES.length - FEATURED_BUILT_IN_COUNT })}
        </Button>
      )}
      <TemplateGalleryDialog
        open={galleryOpen}
        title={t('common.useBuiltInTemplates')}
        groups={groups}
        onClose={() => setGalleryOpen(false)}
        onSelect={(_, sampleName) => {
          openSampleTemplate(sampleName).catch(() => {
            // Failed to load template
          });
        }}
      />
    </Stack>
  );
}
