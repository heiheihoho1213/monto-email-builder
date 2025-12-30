import React from 'react';
import { Box, Typography } from '@mui/material';
import { Code, CodeProps } from 'monto-email-block-code';

import { useTranslation } from '../../../i18n/useTranslation';

type CodeEditorProps = CodeProps;

export default function CodeEditor(props: CodeEditorProps) {
  const { t } = useTranslation();

  // 如果没有代码内容，显示占位符
  if (!props.props?.code) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 100,
          backgroundColor: '#F5F5F5',
          border: '2px dashed #CCCCCC',
          borderRadius: 1,
          color: '#999999',
        }}
      >
        <Typography variant="body2" sx={{ textAlign: 'center', px: 2 }}>
          Code Block Placeholder
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: props.style?.padding ?
          `${props.style.padding.top}px ${props.style.padding.right}px ${props.style.padding.bottom}px ${props.style.padding.left}px` :
          undefined,
        backgroundColor: props.style?.backgroundColor || undefined,
        textAlign: props.style?.textAlign || undefined,
      }}
    >
      <Code {...props} />
    </Box>
  );
}

