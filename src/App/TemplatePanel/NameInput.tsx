import React from 'react';

import { Typography } from '@mui/material';

import { useName } from '../../documents/editor/EditorContext';
import { useTranslation } from '../../i18n/useTranslation';

export default function NameInput() {
  const { t } = useTranslation();
  const name = useName();

  return (
    <Typography
      component="span"
      variant="body2"
      sx={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '300px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: 'text.primary',
        fontWeight: 500,
      }}
    >
      {name || t('common.unnamedTemplate')}
    </Typography>
  );
}

