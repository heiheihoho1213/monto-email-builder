import React, { useState, useEffect, useRef, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import {
  xcodeLight,
  vscodeLight,
  tokyoNightDay,
  gruvboxLight,
  noctisLilac,
  bbedit,

  abcdef,
  basicDark,
  dracula,
  tomorrowNightBlue,
  xcodeDark
} from '@uiw/codemirror-themes-all';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SxProps,
  Theme,
} from '@mui/material';
import {
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  ViewColumn as ViewColumnIcon,
  DesktopWindowsOutlined as DesktopIcon,
  PhoneAndroid as MobileIcon,
} from '@mui/icons-material';
import { Language, t } from '../i18n';

export type HtmlEditorMode = 'split' | 'code' | 'preview';
export type HtmlEditorDevice = 'desktop' | 'mobile';

// 主题映射表
const themeMap: Record<string, any> = {
  // 浅色主题
  xcodeLight,
  vscodeLight,
  tokyoNightDay,
  gruvboxLight,
  noctisLilac,
  bbedit,
  // 深色主题
  abcdef,
  basicDark,
  dracula,
  tomorrowNightBlue,
  xcodeDark
};

// 主题显示名称（按类型分组）
const themeNames: Record<string, string> = {
  xcodeLight: 'Xcode Light (Light)',
  vscodeLight: 'VSCode Light (Light)',
  tokyoNightDay: 'Tokyo Night Day',
  gruvboxLight: 'Gruvbox Light (Light)',
  noctisLilac: 'Noctis Lilac (Light)',
  bbedit: 'BBEdit (Light)',

  abcdef: 'ABCDEF (Dark)',
  basicDark: 'Basic Dark (Dark)',
  dracula: 'Dracula (Dark)',
  tomorrowNightBlue: 'Tomorrow Night Blue (Dark)',
  xcodeDark: 'Xcode Dark (Dark)',
};

export interface HtmlEditorProps {
  /**
   * HTML 代码内容
   */
  value: string;
  /**
   * 代码变化回调
   */
  onChange?: (value: string) => void;
  /**
   * 语言设置，可选值：'zh' | 'en'
   * @default 'en'
   */
  language?: Language;
  /**
   * 初始显示模式：split（左右栏）、code（仅代码）、preview（仅预览）
   * @default 'split'
   */
  initialMode?: HtmlEditorMode;
  /**
   * 初始设备模式：desktop（桌面）、mobile（移动）
   * @default 'desktop'
   */
  initialDevice?: HtmlEditorDevice;
  /**
   * 代码编辑器高度
   * @default '100%'
   */
  codeEditorHeight?: string;
  /**
   * 预览区域高度
   * @default '100%'
   */
  previewHeight?: string;
  /**
   * 自定义样式
   */
  sx?: SxProps<Theme>;
  /**
   * 是否显示工具栏
   * @default true
   */
  showToolbar?: boolean;
}

export default function HtmlEditor({
  value,
  onChange,
  language = 'zh',
  initialMode = 'split',
  initialDevice = 'desktop',
  codeEditorHeight = '100%',
  previewHeight = '100%',
  sx,
  showToolbar = true,
}: HtmlEditorProps) {
  // 翻译函数
  const translate = (key: string, params?: Record<string, string | number>): string => {
    return t(key, params, language);
  };
  const [mode, setMode] = useState<HtmlEditorMode>(initialMode);
  const [device, setDevice] = useState<HtmlEditorDevice>(initialDevice);
  const [theme, setTheme] = useState<string>('xcodeLight');
  const [internalValue, setInternalValue] = useState(value);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // iframe ref 必须在组件顶层声明，不能在 renderPreview 函数内部
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 同步外部 value 变化
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  // 防抖处理 onChange
  const handleChangeDebounced = (newValue: string) => {
    setInternalValue(newValue);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      onChange?.(newValue);
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

  // 处理 HTML 内容，补全结构并移除危险标签
  const processHtml = (html: string): string => {
    const sanitizedHtml = html || '';

    // 检查是否需要补全 HTML 文档结构
    let completeHtml = sanitizedHtml;
    if (!sanitizedHtml.trim()) {
      completeHtml = '<!DOCTYPE html><html><head></head><body></body></html>';
    } else {
      // 使用 DOMParser 检查并补全
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedHtml, 'text/html');

      const hasHtml = doc.documentElement?.tagName.toLowerCase() === 'html';
      const hasHead = doc.head?.tagName.toLowerCase() === 'head';
      const hasBody = doc.body?.tagName.toLowerCase() === 'body';

      if (!hasHtml || !hasHead || !hasBody) {
        // 需要补全，提取内容并包装
        const bodyContent = doc.body ? doc.body.innerHTML : sanitizedHtml;
        const headContent = doc.head ? doc.head.innerHTML : '';
        completeHtml = `<!DOCTYPE html><html><head>${headContent}</head><body>${bodyContent}</body></html>`;
      } else {
        completeHtml = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
      }
    }

    // 移除危险标签
    const dangerousTags = ['script', 'iframe', 'object', 'embed', 'canvas'];
    const tempParser = new DOMParser();
    const tempDoc = tempParser.parseFromString(completeHtml, 'text/html');
    dangerousTags.forEach((tagName) => {
      const elements = tempDoc.querySelectorAll(tagName);
      elements.forEach((el) => el.remove());
    });
    completeHtml = `<!DOCTYPE html>${tempDoc.documentElement.outerHTML}`;

    return completeHtml;
  };

  // 使用 useMemo 缓存处理后的 HTML，避免每次渲染都重新计算
  const processedHtml = useMemo(() => processHtml(internalValue), [internalValue]);

  // 当 HTML 内容变化时，更新 iframe 内容（必须在组件顶层，不能在 renderPreview 内部）
  useEffect(() => {
    if (iframeRef.current) {
      // 只在内容真正变化时才更新，避免重复设置相同的值
      if (iframeRef.current.srcdoc !== processedHtml) {
        iframeRef.current.srcdoc = processedHtml;
      }
    }
  }, [processedHtml]);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: HtmlEditorMode | null) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const handleDeviceChange = (_: React.MouseEvent<HTMLElement>, newDevice: HtmlEditorDevice | null) => {
    if (newDevice !== null) {
      setDevice(newDevice);
    }
  };

  // 渲染代码编辑器
  const renderCodeEditor = () => (
    <Box
      sx={{
        height: codeEditorHeight,
        display: 'flex',
        flexDirection: 'column',
        borderRight: mode === 'split' ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          '& .cm-editor': {
            fontSize: '14px',
          },
          '& .cm-scroller': {
            fontFamily: 'monospace',
          },
          // 自定义光标样式，使其更粗、更显眼
          '& .cm-cursor': {
            borderLeftWidth: '2px !important',
            borderLeftStyle: 'solid !important',
            marginLeft: '-1px', // 补偿增加的宽度，保持位置居中
          },
          '& .cm-focused .cm-cursor': {
            borderLeftWidth: '2px !important',
            borderLeftStyle: 'solid !important',
            opacity: 1,
          },
        }}
      >
        <CodeMirror
          value={internalValue}
          height="calc(100vh - 60px)"
          extensions={[html()]}
          theme={themeMap[theme] || dracula}
          onChange={handleChangeDebounced}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
          }}
        />
      </Box>
    </Box>
  );

  // 渲染预览
  const renderPreview = () => {
    const previewSx: SxProps<Theme> = {
      height: previewHeight,
      overflow: 'auto',
      backgroundColor: '#F5F5F5',
      padding: device === 'mobile' ? '32px 16px' : '16px',
      display: 'flex',
      justifyContent: 'center',
    };

    return (
      <Box sx={previewSx}>
        <Box
          sx={{
            width: '100%',
            maxWidth: device === 'mobile' ? '370px' : '100%',
            height: device === 'mobile' ? '800px' : '100%',
            border: 'none',
            overflow: 'hidden',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={processedHtml}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: '#FFFFFF',
            }}
            title="HTML Preview"
            sandbox="allow-same-origin"
          />
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        ...sx,
      }}
    >
      {showToolbar && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              size="small"
              aria-label={translate('htmlEditor.mode.split')}
            >
              <Tooltip title={translate('htmlEditor.tooltips.splitView')}>
                <ToggleButton value="split" aria-label={translate('htmlEditor.mode.split')}>
                  <ViewColumnIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title={translate('htmlEditor.tooltips.codeOnly')}>
                <ToggleButton value="code" aria-label={translate('htmlEditor.mode.code')}>
                  <CodeIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title={translate('htmlEditor.tooltips.previewOnly')}>
                <ToggleButton value="preview" aria-label={translate('htmlEditor.mode.preview')}>
                  <VisibilityIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="theme-select-label">{translate('htmlEditor.theme')}</InputLabel>
              <Select
                labelId="theme-select-label"
                id="theme-select"
                value={theme}
                label={translate('htmlEditor.theme')}
                onChange={(e) => setTheme(e.target.value)}
                sx={{
                  fontSize: '0.875rem',
                  '& .MuiSelect-select': {
                    py: 0.5,
                  },
                }}
              >
                {Object.entries(themeNames).map(([key, name]) => (
                  <MenuItem key={key} value={key}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {mode !== 'code' && (
              <ToggleButtonGroup
                value={device}
                exclusive
                onChange={handleDeviceChange}
                size="small"
                aria-label={translate('htmlEditor.device.desktop')}
              >
                <Tooltip title={translate('htmlEditor.tooltips.desktopView')}>
                  <ToggleButton value="desktop" aria-label={translate('htmlEditor.device.desktop')}>
                    <DesktopIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title={translate('htmlEditor.tooltips.mobileView')}>
                  <ToggleButton value="mobile" aria-label={translate('htmlEditor.device.mobile')}>
                    <MobileIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            )}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {mode === 'split' && (
          <>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderCodeEditor()}</Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderPreview()}</Box>
          </>
        )}
        {mode === 'code' && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderCodeEditor()}</Box>
        )}
        {mode === 'preview' && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>{renderPreview()}</Box>
        )}
      </Box>
    </Box>
  );
}
