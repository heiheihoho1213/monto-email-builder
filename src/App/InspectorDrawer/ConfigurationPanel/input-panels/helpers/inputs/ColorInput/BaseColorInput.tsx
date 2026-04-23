import React, { useState, useEffect } from 'react';

import AddOutlined from '@mui/icons-material/AddOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { Box, ButtonBase, InputLabel, Menu, Stack, Typography } from '@mui/material';

import Picker from './Picker';

const SWATCH_SIZE = 24;

const SWATCH_SX = {
  border: '1px solid',
  borderColor: 'cadet.400',
  width: SWATCH_SIZE,
  height: SWATCH_SIZE,
  borderRadius: '4px',
  bgcolor: '#FFFFFF',
  flexShrink: 0,
};

const WRAPPER_SX = {
  border: '1px solid',
  borderColor: 'grey.300',
  borderRadius: '4px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
  padding: '4px 8px',
  minHeight: 40,
  cursor: 'pointer',
};

type Props =
  | {
      nullable: true;
      label: string;
      onChange: (value: string | null) => void;
      defaultValue: string | null;
    }
  | {
      nullable: false;
      label: string;
      onChange: (value: string) => void;
      defaultValue: string;
    };
export default function ColorInput({ label, defaultValue, onChange, nullable }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);
  const handleClickOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const renderResetButton = () => {
    if (!nullable) {
      return null;
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }
    return (
      <ButtonBase
        onClick={() => {
          setValue(null);
          onChange(null);
        }}
      >
        <CloseOutlined fontSize="small" sx={{ color: 'grey.600' }} />
      </ButtonBase>
    );
  };

  const renderOpenButton = () => {
    if (value) {
      return (
        <ButtonBase onClick={handleClickOpen} sx={WRAPPER_SX} focusRipple>
          <Box sx={{ ...SWATCH_SX, bgcolor: value }} />
          <Typography component="span" variant="body2" sx={{ color: 'text.primary', fontFamily: 'monospace', fontSize: '13px' }}>
            {value}
          </Typography>
        </ButtonBase>
      );
    }
    return (
      <ButtonBase onClick={handleClickOpen} sx={WRAPPER_SX} focusRipple>
        <Box sx={{ ...SWATCH_SX, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AddOutlined sx={{ fontSize: 18 }} />
        </Box>
      </ButtonBase>
    );
  };

  return (
    <Stack alignItems="flex-start">
      <InputLabel sx={{ mb: 0.5 }}>{label}</InputLabel>
      <Stack direction="row" spacing={1} alignItems="center">
        {renderOpenButton()}
        {renderResetButton()}
      </Stack>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{
          sx: { height: 'auto', padding: 0 },
        }}
      >
        <Picker
          value={value || ''}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      </Menu>
    </Stack>
  );
}
