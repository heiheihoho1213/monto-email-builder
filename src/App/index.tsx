import React from 'react';

import { Box, Stack, useTheme } from '@mui/material';

import { useInspectorDrawerOpen, useSamplesDrawerOpen } from '../documents/editor/EditorContext';

import InspectorDrawer from './InspectorDrawer';
import SamplesDrawer from './SamplesDrawer';
import TemplatePanel from './TemplatePanel';

function useDrawerTransition(cssProperty: 'margin-left' | 'margin-right', open: boolean) {
  const { transitions } = useTheme();
  return transitions.create(cssProperty, {
    easing: !open ? transitions.easing.sharp : transitions.easing.easeOut,
    duration: !open ? transitions.duration.leavingScreen : transitions.duration.enteringScreen,
  });
}

export default function App() {
  const inspectorDrawerOpen = useInspectorDrawerOpen();
  const samplesDrawerOpen = useSamplesDrawerOpen();

  const marginLeftTransition = useDrawerTransition('margin-left', samplesDrawerOpen);
  const marginRightTransition = useDrawerTransition('margin-right', inspectorDrawerOpen);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        overflow: 'hidden',
      }}
    >
      {/* 左侧：模板选择抽屉 */}
      <SamplesDrawer />

      {/* 中间：主内容区域 */}
      <Stack
        sx={{
          flex: 1,
          minWidth: 0, // 允许 flex 项目收缩到内容以下
          transition: `${marginLeftTransition}, ${marginRightTransition}`,
          position: 'relative',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <TemplatePanel />
      </Stack>

      {/* 右侧：样式和检查抽屉 */}
      <InspectorDrawer />
    </Box>
  );
}
