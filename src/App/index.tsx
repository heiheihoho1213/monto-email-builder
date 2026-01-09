import React, { useEffect } from 'react';

import { Box, Stack, useTheme } from '@mui/material';

import { useInspectorDrawerOpen, useSamplesDrawerOpen, undo, redo } from '../documents/editor/EditorContext';

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

  // 快捷键支持：撤销/重做
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下了 Ctrl/Cmd + Z（撤销）
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        // 如果焦点在输入框或文本区域，不拦截（让浏览器默认行为处理）
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        e.preventDefault();
        undo();
      }

      // 检查是否按下了 Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y（重做）
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        // 如果焦点在输入框或文本区域，不拦截
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
