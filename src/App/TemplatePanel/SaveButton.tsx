import React, { useState } from 'react';

import { SaveOutlined } from '@mui/icons-material';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';

import { saveDocument, useSaveHandler } from '../../documents/editor/EditorContext';
import { useTranslation } from '../../i18n/useTranslation';

export default function SaveButton() {
  const { t } = useTranslation();
  const saveHandler = useSaveHandler();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!saveHandler) {
      console.warn('Save handler is not configured. Please set saveHandler in EmailBuilder props.');
      return;
    }

    setSaving(true);
    try {
      await saveDocument();
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tooltip title={t('common.save')}>
      <span>
        <IconButton
          color='primary'
          onClick={handleSave}
          disabled={saving || !saveHandler}
        >
          {saving ? <CircularProgress size={16} /> : <SaveOutlined fontSize="small" />}
          {/* {saving ? t('common.saving') : t('common.save')} */}
        </IconButton>
      </span>
    </Tooltip>
  );
}

