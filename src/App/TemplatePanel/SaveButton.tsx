import React, { useState } from 'react';

import * as SaveOutlinedModule from '@mui/icons-material/SaveOutlined';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';

import { saveDocument, useSaveHandler } from '../../documents/editor/EditorContext';
import { useTranslation } from '../../i18n/useTranslation';

import { resolveMuiIcon } from '../../utils/resolveMuiIcon';

const SaveOutlined = resolveMuiIcon(SaveOutlinedModule);

export default function SaveButton() {
  const { t } = useTranslation();
  const saveHandler = useSaveHandler();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!saveHandler) {
      return;
    }

    setSaving(true);
    try {
      await saveDocument();
    } catch {
      // Failed to save document
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tooltip title={t('common.save')} arrow>
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

