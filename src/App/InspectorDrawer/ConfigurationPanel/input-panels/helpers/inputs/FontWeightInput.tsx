import React, { useEffect, useState } from 'react';

import ToggleButton from '@mui/material/ToggleButton';

import { useTranslation } from '../../../../../../i18n/useTranslation';
import RadioGroupInput from './RadioGroupInput';

type Props = {
  label: string;
  defaultValue: string;
  onChange: (value: string) => void;
};
export default function FontWeightInput({ label, defaultValue, onChange }: Props) {
  const { t } = useTranslation();
  const normalized = defaultValue ?? 'normal';
  const [value, setValue] = useState(normalized);
  useEffect(() => {
    setValue(normalized);
  }, [normalized]);
  return (
    <RadioGroupInput
      label={label}
      defaultValue={value}
      onChange={(fontWeight) => {
        setValue(fontWeight);
        onChange(fontWeight);
      }}
    >
      <ToggleButton value="normal">{t('style.regular')}</ToggleButton>
      <ToggleButton value="bold">{t('style.bold')}</ToggleButton>
    </RadioGroupInput>
  );
}
