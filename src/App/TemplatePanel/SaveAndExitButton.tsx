import React, { useState } from 'react';

import { ExitToAppOutlined } from '@mui/icons-material';
import { CircularProgress, IconButton, Tooltip } from '@mui/material';

import { saveAndExitDocument, saveDocument, useSaveAndExitHandler, useSaveHandler } from '../../documents/editor/EditorContext';
import { useTranslation } from '../../i18n/useTranslation';

export default function SaveAndExitButton() {
  const { t } = useTranslation();
  const saveHandler = useSaveHandler();
  const saveAndExitHandler = useSaveAndExitHandler();
  const [saving, setSaving] = useState(false);

  const handleSaveAndExit = async () => {
    if (!saveAndExitHandler) {
      return;
    }

    setSaving(true);
    try {
      // 如果有 saveHandler，先保存文档
      if (saveHandler) {
        await saveDocument();
      }
      // 然后异步调用退出回调，不等待其完成，避免组件销毁时的内存问题
      saveAndExitDocument(saveAndExitHandler);
    } catch {
      // Failed to save and exit
    } finally {
      setSaving(false);
    }
  };

  return (
    <Tooltip title={t('common.saveAndExit')}>
      <span>
        <IconButton
          color='primary'
          size="small"
          onClick={handleSaveAndExit}
          disabled={saving || !saveAndExitHandler}
        >
          {saving ? <CircularProgress size={16} color="inherit" /> : <ExitToAppOutlined fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

