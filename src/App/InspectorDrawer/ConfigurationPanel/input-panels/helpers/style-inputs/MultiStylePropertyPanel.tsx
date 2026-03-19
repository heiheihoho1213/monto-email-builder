import React from 'react';

import { InputLabel, Stack } from '@mui/material';
import { useTranslation } from '../../../../../../i18n/useTranslation';
import { TStyle } from '../../../../../../documents/blocks/helpers/TStyle';

import TextFormatGroup from '../inputs/TextFormatGroup';
import SingleStylePropertyPanel from './SingleStylePropertyPanel';

const FORMAT_GROUP_KEYS: (keyof TStyle)[] = ['fontWeight', 'fontStyle', 'textDecoration'];

function hasFormatGroup(names: (keyof TStyle)[]): boolean {
  return FORMAT_GROUP_KEYS.every((k) => names.includes(k));
}

type MultiStylePropertyPanelProps = {
  names: (keyof TStyle)[];
  value: TStyle | undefined | null;
  onChange: (style: TStyle) => void;
};
export default function MultiStylePropertyPanel({ names, value, onChange }: MultiStylePropertyPanelProps) {
  const { t } = useTranslation();
  const showFormatGroup = hasFormatGroup(names);

  return (
    <>
      {names.map((name) => {
        if (FORMAT_GROUP_KEYS.includes(name)) return null;
        if (name === 'letterSpacing' && showFormatGroup) {
          return (
            <React.Fragment key="letterSpacing-and-format">
              <SingleStylePropertyPanel name="letterSpacing" value={value || {}} onChange={onChange} />
              <Stack alignItems="flex-start" sx={{ mt: 1 }}>
                <InputLabel shrink>{t('style.formatGroup')}</InputLabel>
                <TextFormatGroup value={value || {}} onChange={onChange} />
              </Stack>
            </React.Fragment>
          );
        }
        return (
          <SingleStylePropertyPanel key={name} name={name} value={value || {}} onChange={onChange} />
        );
      })}
    </>
  );
}
