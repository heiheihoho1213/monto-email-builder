import React from 'react';

import * as UndoOutlinedModule from '@mui/icons-material/UndoOutlined';
import { IconButton, Tooltip } from '@mui/material';

import { undo, useCanUndo } from '../../../documents/editor/EditorContext';
import { useTranslation } from '../../../i18n/useTranslation';

import { resolveMuiIcon } from '../../../utils/resolveMuiIcon';

const UndoOutlined = resolveMuiIcon(UndoOutlinedModule);

export default function UndoButton() {
  const { t } = useTranslation();
  const canUndo = useCanUndo();

  return (
    <Tooltip title={t('common.undoTooltip')} arrow>
      <span>
        <IconButton onClick={undo} disabled={!canUndo} size="small">
          <UndoOutlined fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
