import React from 'react';

import { Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FormatBoldOutlined from '@mui/icons-material/FormatBoldOutlined';
import FormatItalicOutlined from '@mui/icons-material/FormatItalicOutlined';
import FormatUnderlinedOutlined from '@mui/icons-material/FormatUnderlinedOutlined';
import StrikethroughSOutlined from '@mui/icons-material/StrikethroughSOutlined';

import { TStyle } from '../../../../../../documents/blocks/helpers/TStyle';

type TextDecorationValue = string | null | undefined;

function hasUnderline(dec: TextDecorationValue): boolean {
  return typeof dec === 'string' && dec.includes('underline');
}
function hasStrikethrough(dec: TextDecorationValue): boolean {
  return typeof dec === 'string' && dec.includes('line-through');
}
function toggleUnderline(dec: TextDecorationValue): string {
  if (hasUnderline(dec)) return hasStrikethrough(dec) ? 'line-through' : 'none';
  return hasStrikethrough(dec) ? 'underline line-through' : 'underline';
}
function toggleStrikethrough(dec: TextDecorationValue): string {
  if (hasStrikethrough(dec)) return hasUnderline(dec) ? 'underline' : 'none';
  return hasUnderline(dec) ? 'underline line-through' : 'line-through';
}

type Props = {
  value: TStyle;
  onChange: (style: TStyle) => void;
};
export default function TextFormatGroup({ value, onChange }: Props) {
  const fontWeight = value?.fontWeight ?? 'normal';
  const fontStyle = value?.fontStyle ?? 'normal';
  const textDecoration = value?.textDecoration ?? 'none';

  const selected: string[] = [];
  if (fontWeight === 'bold') selected.push('bold');
  if (fontStyle === 'italic') selected.push('italic');
  if (hasUnderline(textDecoration)) selected.push('underline');
  if (hasStrikethrough(textDecoration)) selected.push('strikethrough');

  const handleChange = (_: React.MouseEvent<HTMLElement>, newVal: string[] | null) => {
    if (newVal == null) return;
    const next: TStyle = { ...value };
    next.fontWeight = newVal.includes('bold') ? 'bold' : 'normal';
    next.fontStyle = newVal.includes('italic') ? 'italic' : 'normal';
    let dec = 'none';
    if (newVal.includes('underline') && newVal.includes('strikethrough')) dec = 'underline line-through';
    else if (newVal.includes('underline')) dec = 'underline';
    else if (newVal.includes('strikethrough')) dec = 'line-through';
    next.textDecoration = dec;
    onChange(next);
  };

  return (
    <Stack alignItems="flex-start">
      <ToggleButtonGroup
        size="small"
        value={selected}
        onChange={handleChange}
        sx={{ flexWrap: 'nowrap' }}
      >
        <ToggleButton value="bold" aria-label="bold">
          <FormatBoldOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="italic" aria-label="italic">
          <FormatItalicOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="underline" aria-label="underline">
          <FormatUnderlinedOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="strikethrough" aria-label="strikethrough">
          <StrikethroughSOutlined fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
