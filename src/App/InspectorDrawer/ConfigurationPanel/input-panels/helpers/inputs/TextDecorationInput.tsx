import React, { useEffect, useState } from 'react';

import ToggleButton from '@mui/material/ToggleButton';

import { useTranslation } from '../../../../../../i18n/useTranslation';
import RadioGroupInput from './RadioGroupInput';

export type TextDecorationValue = 'none' | 'underline' | 'line-through' | 'underline line-through';

type Props = {
  label: string;
  defaultValue: string;
  onChange: (value: TextDecorationValue) => void;
};
export default function TextDecorationInput({ label, defaultValue, onChange }: Props) {
  const { t } = useTranslation();
  const normalized = defaultValue || 'none';
  const [value, setValue] = useState(normalized);
  useEffect(() => {
    setValue(normalized);
  }, [normalized]);
  return (
    <RadioGroupInput
      label={label}
      defaultValue={value}
      onChange={(v) => {
        setValue(v);
        onChange(v as TextDecorationValue);
      }}
    >
      <ToggleButton value="none">{t('style.none')}</ToggleButton>
      <ToggleButton value="underline">{t('style.underline')}</ToggleButton>
      <ToggleButton value="line-through">{t('style.strikethrough')}</ToggleButton>
      {/* <ToggleButton value="underline line-through">{t('style.both')}</ToggleButton> */}
    </RadioGroupInput>
  );
}
