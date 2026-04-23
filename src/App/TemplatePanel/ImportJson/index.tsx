import React, { useState } from 'react';

import * as FileUploadOutlinedModule from '@mui/icons-material/FileUploadOutlined';
import { IconButton, Tooltip } from '@mui/material';

import { useTranslation } from '../../../i18n/useTranslation';
import ImportJsonDialog from './ImportJsonDialog';

import { resolveMuiIcon } from '../../../utils/resolveMuiIcon';

const FileUploadOutlined = resolveMuiIcon(FileUploadOutlinedModule);

export default function ImportJson() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  let dialog = null;
  if (open) {
    dialog = <ImportJsonDialog onClose={() => setOpen(false)} />;
  }

  return (
    <>
      <Tooltip title={t('common.importJson')} arrow>
        <IconButton onClick={() => setOpen(true)}>
          <FileUploadOutlined fontSize="small" />
        </IconButton>
      </Tooltip>
      {dialog}
    </>
  );
}
