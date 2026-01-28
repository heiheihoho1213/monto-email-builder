import React, { useState, useEffect } from 'react';

import { Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useTranslation } from '../../../../../../i18n/useTranslation';

type TWidthValue = number | null | undefined;
type FixedWidths = [
  number | null | undefined,
  number | null | undefined,
  number | null | undefined,
  number | null | undefined,
];

type ColumnsLayoutInputProps = {
  columnsCount: number;
  defaultValue: FixedWidths | null | undefined;
  onChange: (v: FixedWidths | null | undefined) => void;
};

export default function ColumnWidthsInput({ columnsCount, defaultValue, onChange }: ColumnsLayoutInputProps) {
  const { t } = useTranslation();
  const [currentValue, setCurrentValue] = useState<FixedWidths>(() => {
    if (defaultValue) {
      return [
        defaultValue[0] ?? null,
        defaultValue[1] ?? null,
        defaultValue[2] ?? null,
        defaultValue[3] ?? null,
      ];
    }
    return [null, null, null, null];
  });

  const [ratioMode, setRatioMode] = useState<'custom' | '2:1' | '1:2' | '1:3' | '3:1'>('custom');

  // 当 defaultValue 变化时更新 currentValue
  useEffect(() => {
    if (defaultValue) {
      const newValue: FixedWidths = [
        defaultValue[0] ?? null,
        defaultValue[1] ?? null,
        defaultValue[2] ?? null,
        defaultValue[3] ?? null,
      ];
      setCurrentValue(newValue);
    }
  }, [defaultValue]);

  const setIndexValue = (index: 0 | 1 | 2 | 3, value: number | null | undefined) => {
    const nValue: FixedWidths = [...currentValue];
    nValue[index] = value;
    setCurrentValue(nValue);
    onChange(nValue);
    setRatioMode('custom');
  };

  const handleRatioChange = (ratio: 'custom' | '2:1' | '1:2' | '1:3' | '3:1') => {
    setRatioMode(ratio);
    if (columnsCount === 2) {
      if (ratio === '2:1') {
        const newValue: FixedWidths = [66.67, 33.33, null, null];
        setCurrentValue(newValue);
        onChange(newValue);
      } else if (ratio === '1:2') {
        const newValue: FixedWidths = [33.33, 66.67, null, null];
        setCurrentValue(newValue);
        onChange(newValue);
      } else {
        const newValue: FixedWidths = [null, null, null, null];
        setCurrentValue(newValue);
        onChange(newValue);
      }
    } else if (columnsCount === 3) {
      if (ratio === '1:3') {
        const newValue: FixedWidths = [25, 37.5, 37.5, null];
        setCurrentValue(newValue);
        onChange(newValue);
      } else if (ratio === '3:1') {
        const newValue: FixedWidths = [37.5, 37.5, 25, null];
        setCurrentValue(newValue);
        onChange(newValue);
      } else {
        const newValue: FixedWidths = [null, null, null, null];
        setCurrentValue(newValue);
        onChange(newValue);
      }
    }
  };

  // 检查当前值是否匹配某个比例
  useEffect(() => {
    if (columnsCount === 2 && currentValue[0] !== null && currentValue[0] !== undefined && currentValue[1] !== null && currentValue[1] !== undefined) {
      const val1 = currentValue[0];
      const val2 = currentValue[1];
      if (Math.abs(val1 - 66.67) < 1 && Math.abs(val2 - 33.33) < 1) {
        setRatioMode((prev) => (prev !== '2:1' ? '2:1' : prev));
      } else if (Math.abs(val1 - 33.33) < 1 && Math.abs(val2 - 66.67) < 1) {
        setRatioMode((prev) => (prev !== '1:2' ? '1:2' : prev));
      } else {
        setRatioMode((prev) => (prev !== 'custom' ? 'custom' : prev));
      }
    } else if (columnsCount === 3 && currentValue[0] !== null && currentValue[0] !== undefined && currentValue[1] !== null && currentValue[1] !== undefined && currentValue[2] !== null && currentValue[2] !== undefined) {
      const val1 = currentValue[0];
      const val2 = currentValue[1];
      const val3 = currentValue[2];
      if (Math.abs(val1 - 25) < 1 && Math.abs(val2 - 37.5) < 1 && Math.abs(val3 - 37.5) < 1) {
        setRatioMode((prev) => (prev !== '1:3' ? '1:3' : prev));
      } else if (Math.abs(val1 - 37.5) < 1 && Math.abs(val2 - 37.5) < 1 && Math.abs(val3 - 25) < 1) {
        setRatioMode((prev) => (prev !== '3:1' ? '3:1' : prev));
      } else {
        setRatioMode((prev) => (prev !== 'custom' ? 'custom' : prev));
      }
    }
  }, [currentValue, columnsCount]);

  return (
    <Stack spacing={1}>
      {columnsCount === 2 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {t('columns.ratio')}
          </Typography>
          <ToggleButtonGroup
            value={ratioMode}
            exclusive
            onChange={(_, v) => v && handleRatioChange(v)}
            size="small"
            fullWidth
          >
            <ToggleButton value="custom">{t('columns.custom')}</ToggleButton>
            <ToggleButton value="2:1">2:1</ToggleButton>
            <ToggleButton value="1:2">1:2</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      )}
      {columnsCount === 3 && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            {t('columns.ratio')}
          </Typography>
          <ToggleButtonGroup
            value={ratioMode}
            exclusive
            onChange={(_, v) => v && handleRatioChange(v)}
            size="small"
            fullWidth
          >
            <ToggleButton value="custom">{t('columns.custom')}</ToggleButton>
            <ToggleButton value="1:3">1:3</ToggleButton>
            <ToggleButton value="3:1">3:1</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      )}
      <Stack direction="row" spacing={1}>
        {Array.from({ length: columnsCount }).map((_, index) => {
          const isPercentage = (columnsCount === 2 && (ratioMode === '2:1' || ratioMode === '1:2')) ||
            (columnsCount === 3 && (ratioMode === '1:3' || ratioMode === '3:1'));
          return (
            <TextField
              key={index}
              fullWidth
              label={t('columns.column', { number: index + 1 })}
              variant="standard"
              size="small"
              value={currentValue[index] ?? ''}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setIndexValue(index as 0 | 1 | 2 | 3, isNaN(value) ? null : value);
              }}
              placeholder="auto"
              InputProps={{
                endAdornment: (
                  <Typography variant="body2" color="text.secondary">
                    {isPercentage ? '%' : 'px'}
                  </Typography>
                ),
              }}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
