import React, { useState, useEffect } from 'react';

import { TitleOutlined } from '@mui/icons-material';
import { InputLabel, Stack } from '@mui/material';

import RawSliderInput from './raw/RawSliderInput';

const MIN = -5;
const MAX = 50;
const DEFAULT = 0;

function parseValue(v: number | string | null | undefined): number {
  if (v == null) return DEFAULT;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.max(MIN, Math.min(MAX, n)) : DEFAULT;
}

type Props = {
  label: string;
  defaultValue: number | string | null | undefined;
  onChange: (value: number | null) => void;
};
export default function LetterSpacingInput({ label, defaultValue, onChange }: Props) {
  const parsed = parseValue(defaultValue);
  const [value, setValue] = useState(parsed);

  useEffect(() => {
    setValue(parseValue(defaultValue));
  }, [defaultValue]);

  const handleChange = (v: number) => {
    setValue(v);
    onChange(v);
  };

  return (
    <Stack spacing={1} alignItems="flex-start">
      <InputLabel shrink>{label}</InputLabel>
      <RawSliderInput
        iconLabel={<TitleOutlined sx={{ fontSize: 16 }} />}
        value={value}
        setValue={handleChange}
        units="px"
        step={1}
        min={MIN}
        max={MAX}
      />
    </Stack>
  );
}
