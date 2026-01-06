import React, { useState, useEffect } from 'react';

import { TextFieldsOutlined } from '@mui/icons-material';
import { InputLabel, Stack } from '@mui/material';

import RawSliderInput from './raw/RawSliderInput';

type Props = {
  label: string;
  defaultValue: number | null;
  onChange: (v: number) => void;
};
export default function FontSizeInput({ label, defaultValue, onChange }: Props) {
  // 如果 defaultValue 是 null 或 undefined，使用默认值 14
  const defaultFontSize = defaultValue ?? 14;
  const [value, setValue] = useState(defaultFontSize);

  // 当 defaultValue 变化时，更新内部状态（用于响应外部数据变化）
  useEffect(() => {
    const newDefaultFontSize = defaultValue ?? 14;
    setValue(newDefaultFontSize);
  }, [defaultValue]);

  const handleChange = (value: number) => {
    setValue(value);
    onChange(value);
  };
  return (
    <Stack spacing={1} alignItems="flex-start">
      <InputLabel shrink>{label}</InputLabel>
      <RawSliderInput
        iconLabel={<TextFieldsOutlined sx={{ fontSize: 16 }} />}
        value={value}
        setValue={handleChange}
        units="px"
        step={1}
        min={10}
        max={48}
      />
    </Stack>
  );
}
