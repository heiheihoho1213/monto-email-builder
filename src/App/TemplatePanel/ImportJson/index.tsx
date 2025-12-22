import React, { useState } from 'react';

import { FileUploadOutlined } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

import { useTranslation } from '../../../i18n/useTranslation';
import ImportJsonDialog from './ImportJsonDialog';

export default function ImportJson() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  let dialog = null;
  if (open) {
    dialog = <ImportJsonDialog onClose={() => setOpen(false)} />;
  }

  return (
    <>
      <Tooltip title={t('common.importJson')}>
        <IconButton onClick={() => setOpen(true)}>
          <FileUploadOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      {dialog}
    </>
  );
}
