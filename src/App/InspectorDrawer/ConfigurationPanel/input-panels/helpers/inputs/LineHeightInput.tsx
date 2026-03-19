import React, { useState, useEffect } from 'react';

import { MenuItem, TextField } from '@mui/material';

const PRESETS = [1, 1.5, 2, 2.5, 3] as const;
const DEFAULT_LINE_HEIGHT = 1.5;

type Props = {
  label: string;
  defaultValue: number | null | undefined;
  onChange: (value: number | null) => void;
};
export default function LineHeightInput({ label, defaultValue, onChange }: Props) {
  const [value, setValue] = useState<number>(defaultValue ?? DEFAULT_LINE_HEIGHT);
  useEffect(() => {
    setValue(defaultValue ?? DEFAULT_LINE_HEIGHT);
  }, [defaultValue]);
  return (
    <TextField
      select
      variant="standard"
      fullWidth
      label={label}
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value);
        setValue(n);
        onChange(n);
      }}
    >
      {PRESETS.map((n) => (
        <MenuItem key={n} value={n}>
          {n}
        </MenuItem>
      ))}
    </TextField>
  );
}
