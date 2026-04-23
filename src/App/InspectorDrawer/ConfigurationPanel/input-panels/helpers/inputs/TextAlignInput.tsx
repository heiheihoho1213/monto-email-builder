import React, { useState } from 'react';

import FormatAlignCenterOutlined from '@mui/icons-material/FormatAlignCenterOutlined';
import FormatAlignLeftOutlined from '@mui/icons-material/FormatAlignLeftOutlined';
import FormatAlignRightOutlined from '@mui/icons-material/FormatAlignRightOutlined';
import { ToggleButton } from '@mui/material';

import RadioGroupInput from './RadioGroupInput';

type Props = {
  label: string;
  defaultValue: string | null;
  onChange: (value: string | null) => void;
};
export default function TextAlignInput({ label, defaultValue, onChange }: Props) {
  const [value, setValue] = useState(defaultValue ?? 'left');

  return (
    <RadioGroupInput
      label={label}
      defaultValue={value}
      onChange={(value) => {
        setValue(value);
        onChange(value);
      }}
    >
      <ToggleButton value="left">
        <FormatAlignLeftOutlined fontSize="small" />
      </ToggleButton>
      <ToggleButton value="center">
        <FormatAlignCenterOutlined fontSize="small" />
      </ToggleButton>
      <ToggleButton value="right">
        <FormatAlignRightOutlined fontSize="small" />
      </ToggleButton>
    </RadioGroupInput>
  );
}
