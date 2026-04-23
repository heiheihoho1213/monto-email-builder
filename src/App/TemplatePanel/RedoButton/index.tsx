import React from 'react';

import * as RedoOutlinedModule from '@mui/icons-material/RedoOutlined';
import { IconButton, Tooltip } from '@mui/material';

import { redo, useCanRedo } from '../../../documents/editor/EditorContext';
import { useTranslation } from '../../../i18n/useTranslation';

import { resolveMuiIcon } from '../../../utils/resolveMuiIcon';

const RedoOutlined = resolveMuiIcon(RedoOutlinedModule);

export default function RedoButton() {
  const { t } = useTranslation();
  const canRedo = useCanRedo();

  return (
    <Tooltip title={t('common.redoTooltip')} arrow>
      <span>
        <IconButton onClick={redo} disabled={!canRedo} size="small">
          <RedoOutlined fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );
}
