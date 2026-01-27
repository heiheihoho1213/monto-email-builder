import React, { useState } from 'react';

import { HtmlProps, HtmlPropsSchema } from 'monto-email-block-html';
import { ZodError } from 'zod';
import { useTranslation } from '../../../../i18n/useTranslation';

import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import CodeMirrorInput from './helpers/inputs/CodeMirrorInput';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';

type HtmlSidebarPanelProps = {
  data: HtmlProps;
  setData: (v: HtmlProps) => void;
};
export default function HtmlSidebarPanel({ data, setData }: HtmlSidebarPanelProps) {
  const { t } = useTranslation();
  const [, setErrors] = useState<ZodError | null>(null);

  const updateData = (d: unknown) => {
    const res = HtmlPropsSchema.safeParse(d);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  return (
    <BaseSidebarPanel title={t('html.title')}>
      <CodeMirrorInput
        label={t('html.content')}
        value={data.props?.contents ?? ''}
        onChange={(contents) => updateData({ ...data, props: { ...data.props, contents } })}
        height="400px"
      />
      <MultiStylePropertyPanel
        // names={['color', 'backgroundColor', 'fontFamily', 'fontSize', 'textAlign', 'padding']}
        names={['padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
