import React, { useMemo } from 'react';

import { FileDownloadOutlined } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

import { useDocument } from '../../../documents/editor/EditorContext';
import { useTranslation } from '../../../i18n/useTranslation';

export default function DownloadJson() {
  const { t } = useTranslation();
  const doc = useDocument();
  const href = useMemo(() => {
    return `data:text/plain,${encodeURIComponent(JSON.stringify(doc, null, '  '))}`;
  }, [doc]);
  return (
    <Tooltip title={t('common.downloadJson')}>
      <IconButton href={href} download="emailTemplate.json">
        <FileDownloadOutlined fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
