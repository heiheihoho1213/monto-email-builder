import React from 'react';

import FirstPageOutlined from '@mui/icons-material/FirstPageOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import { IconButton } from '@mui/material';

import { toggleSamplesDrawerOpen, useSamplesDrawerOpen } from '../../documents/editor/EditorContext';

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
