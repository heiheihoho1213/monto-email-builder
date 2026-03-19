import React, { useEffect, useState } from 'react';

import { ToggleButton } from '@mui/material';

import { useTranslation } from '../../../../../../i18n/useTranslation';
import RadioGroupInput from './RadioGroupInput';

type Props = {
  label: string;
  defaultValue: string;
  onChange: (value: string) => void;
};
export default function FontStyleInput({ label, defaultValue, onChange }: Props) {
  const { t } = useTranslation();
  const normalized = defaultValue || 'normal';
  const [value, setValue] = useState(normalized);
  useEffect(() => {
    setValue(normalized);
  }, [normalized]);
  return (
    <RadioGroupInput
      label={label}
      defaultValue={value}
      onChange={(fontStyle) => {
        setValue(fontStyle);
        onChange(fontStyle);
      }}
    >
      <ToggleButton value="normal">{t('style.normal')}</ToggleButton>
      <ToggleButton value="italic">{t('style.italic')}</ToggleButton>
    </RadioGroupInput>
  );
}
