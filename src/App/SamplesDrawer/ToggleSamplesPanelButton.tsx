import React from 'react';

import * as FirstPageOutlinedModule from '@mui/icons-material/FirstPageOutlined';
import * as MenuOutlinedModule from '@mui/icons-material/MenuOutlined';
import { IconButton } from '@mui/material';

import { toggleSamplesDrawerOpen, useSamplesDrawerOpen } from '../../documents/editor/EditorContext';

import { resolveMuiIcon } from '../../utils/resolveMuiIcon';

const FirstPageOutlined = resolveMuiIcon(FirstPageOutlinedModule);
const MenuOutlined = resolveMuiIcon(MenuOutlinedModule);

function useIcon() {
  const samplesDrawerOpen = useSamplesDrawerOpen();
  if (samplesDrawerOpen) {
    return <FirstPageOutlined fontSize="small" />;
  }
  return <MenuOutlined fontSize="small" />;
}

export default function ToggleSamplesPanelButton() {
  const icon = useIcon();
  return <IconButton onClick={toggleSamplesDrawerOpen}>{icon}</IconButton>;
}
