import React, { useState, useEffect, useRef, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import {
  abcdef,
  abyss,
  androidstudio,
  andromeda,
  atomone,
  aura,
  bbedit,
  bespin,
  copilot,
  darcula,
  dracula,
  eclipse,
  gruvboxDark,
  kimbie,
  material,
  monokai,
  monokaiDimmed,
  noctisLilac,
  nord,
  okaidia,
  quietlight,
  red,
  sublime,
  tokyoNight,
  tokyoNightStorm,
  tokyoNightDay,
  tomorrowNightBlue,
  vscodeDark,
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

export type HtmlEditorMode = 'split' | 'code' | 'preview';
export type HtmlEditorDevice = 'desktop' | 'mobile';

// 主题映射表
const themeMap: Record<string, any> = {
  // 深色主题
  abcdef,
  abyss,
  androidstudio,
  andromeda,
  atomone,
  aura,
  bespin,
  copilot,
  darcula,
  dracula,
  gruvboxDark,
  kimbie,
  monokai,
  monokaiDimmed,
  noctisLilac,
  nord,
  okaidia,
  red,
  sublime,
  tokyoNight,
  tokyoNightStorm,
  tomorrowNightBlue,
  vscodeDark,
  // 浅色主题
  bbedit,
  eclipse,
  material,
  quietlight,
  tokyoNightDay,
};

// 主题显示名称（按类型分组）
const themeNames: Record<string, string> = {
  // 深色主题
  abcdef: 'ABCDEF (深色)',
  abyss: 'Abyss (深色)',
  androidstudio: 'Android Studio (深色)',
  andromeda: 'Andromeda (深色)',
  atomone: 'Atom One (深色)',
  aura: 'Aura (深色)',
  bespin: 'Bespin (深色)',
  copilot: 'Copilot (深色)',
  darcula: 'Darcula (深色)',
  dracula: 'Dracula (深色)',
  gruvboxDark: 'Gruvbox Dark (深色)',
  kimbie: 'Kimbie (深色)',
  monokai: 'Monokai (深色)',
  monokaiDimmed: 'Monokai Dimmed (深色)',
  noctisLilac: 'Noctis Lilac (深色)',
  nord: 'Nord (深色)',
  okaidia: 'Okaidia (深色)',
  red: 'Red (深色)',
  sublime: 'Sublime (深色)',
  tokyoNight: 'Tokyo Night (深色)',
  tokyoNightStorm: 'Tokyo Night Storm (深色)',
  tomorrowNightBlue: 'Tomorrow Night Blue (深色)',
  vscodeDark: 'VS Code Dark (深色)',
  // 浅色主题
  bbedit: 'BBEdit (浅色)',
  eclipse: 'Eclipse (浅色)',
  material: 'Material (浅色)',
  quietlight: 'Quiet Light (浅色)',
  tokyoNightDay: 'Tokyo Night Day (浅色)',
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
  initialMode = 'split',
  initialDevice = 'desktop',
  codeEditorHeight = '100%',
  previewHeight = '100%',
  sx,
  showToolbar = true,
}: HtmlEditorProps) {
  const [mode, setMode] = useState<HtmlEditorMode>(initialMode);
  const [device, setDevice] = useState<HtmlEditorDevice>(initialDevice);
  const [theme, setTheme] = useState<string>('dracula');
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
              aria-label="显示模式"
            >
              <Tooltip title="左右栏">
                <ToggleButton value="split" aria-label="左右栏">
                  <ViewColumnIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="仅代码">
                <ToggleButton value="code" aria-label="仅代码">
                  <CodeIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="仅预览">
                <ToggleButton value="preview" aria-label="仅预览">
                  <VisibilityIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="theme-select-label">主题</InputLabel>
              <Select
                labelId="theme-select-label"
                id="theme-select"
                value={theme}
                label="主题"
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
                aria-label="设备模式"
              >
                <Tooltip title="桌面视图">
                  <ToggleButton value="desktop" aria-label="桌面视图">
                    <DesktopIcon fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="移动视图">
                  <ToggleButton value="mobile" aria-label="移动视图">
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
