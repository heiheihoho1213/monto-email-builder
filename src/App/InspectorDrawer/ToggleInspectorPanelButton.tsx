import React from 'react';

import * as AppRegistrationOutlinedModule from '@mui/icons-material/AppRegistrationOutlined';
import * as LastPageOutlinedModule from '@mui/icons-material/LastPageOutlined';
import { IconButton } from '@mui/material';

import { toggleInspectorDrawerOpen, useInspectorDrawerOpen } from '../../documents/editor/EditorContext';

import { resolveMuiIcon } from '../../utils/resolveMuiIcon';

const AppRegistrationOutlined = resolveMuiIcon(AppRegistrationOutlinedModule);
const LastPageOutlined = resolveMuiIcon(LastPageOutlinedModule);

export default function ToggleInspectorPanelButton() {
  const inspectorDrawerOpen = useInspectorDrawerOpen();

  const handleClick = () => {
    toggleInspectorDrawerOpen();
  };
  if (inspectorDrawerOpen) {
    return (
      <IconButton onClick={handleClick}>
        <LastPageOutlined fontSize="small" />
      </IconButton>
    );
  }
  return (
    <IconButton onClick={handleClick}>
      <AppRegistrationOutlined fontSize="small" />
    </IconButton>
  );
}
