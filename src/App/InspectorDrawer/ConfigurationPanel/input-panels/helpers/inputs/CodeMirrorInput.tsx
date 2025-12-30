import React, { useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { Box, Typography } from '@mui/material';

type CodeMirrorInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
};

export default function CodeMirrorInput({ label, value, onChange, height = '200px' }: CodeMirrorInputProps) {
  const [internalValue, setInternalValue] = React.useState(value);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // 使用防抖来优化性能
  const handleChangeDebounced = (newValue: string) => {
    setInternalValue(newValue);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ mb: 1, fontSize: '12px', fontWeight: 500 }}>
        {label}
      </Typography>
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          '& .cm-editor': {
            fontSize: '13px',
          },
          '& .cm-scroller': {
            fontFamily: 'monospace',
          },
        }}
      >
        <CodeMirror
          value={internalValue}
          height={height}
          extensions={[html()]}
          theme={oneDark}
          onChange={handleChangeDebounced}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: false,
            allowMultipleSelections: false,
          }}
        />
      </Box>
    </Box>
  );
}

