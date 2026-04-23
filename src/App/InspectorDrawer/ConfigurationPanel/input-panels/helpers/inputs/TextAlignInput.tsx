import React, { useState } from 'react';

import * as FormatAlignCenterOutlinedModule from '@mui/icons-material/FormatAlignCenterOutlined';
import * as FormatAlignLeftOutlinedModule from '@mui/icons-material/FormatAlignLeftOutlined';
import * as FormatAlignRightOutlinedModule from '@mui/icons-material/FormatAlignRightOutlined';
import ToggleButton from '@mui/material/ToggleButton';

import RadioGroupInput from './RadioGroupInput';

import { resolveMuiIcon } from '../../../../../../utils/resolveMuiIcon';

const FormatAlignCenterOutlined = resolveMuiIcon(FormatAlignCenterOutlinedModule);
const FormatAlignLeftOutlined = resolveMuiIcon(FormatAlignLeftOutlinedModule);
const FormatAlignRightOutlined = resolveMuiIcon(FormatAlignRightOutlinedModule);

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
