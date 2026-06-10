import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  ScopedCssBaseline,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SxProps,
  Tab,
  Tabs,
  TextField,
  Theme,
  ThemeProvider,
  Typography,
  ListSubheader,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import * as AddOutlinedModule from '@mui/icons-material/AddOutlined';
import * as CodeIconModule from '@mui/icons-material/Code';
import * as DataObjectOutlinedModule from '@mui/icons-material/DataObjectOutlined';
import * as ExpandMoreOutlinedModule from '@mui/icons-material/ExpandMoreOutlined';
import * as HelpOutlinedModule from '@mui/icons-material/HelpOutlined';
import * as VisibilityIconModule from '@mui/icons-material/Visibility';
import * as ViewColumnIconModule from '@mui/icons-material/ViewColumn';
import * as MonitorOutlinedModule from '@mui/icons-material/MonitorOutlined';
import * as PhoneIphoneOutlinedModule from '@mui/icons-material/PhoneIphoneOutlined';
import { Language, t } from '../i18n';
import { VARIABLE_NAME_RE, type VariableGroup, type VariableGroupId, type VariableKind } from '../documents/blocks/Text/variableCatalog';

import editorTheme from '../theme';
import { resolveMuiIcon } from '../utils/resolveMuiIcon';
import {
  applyHtmlEditorVariableDefaults,
  createHtmlEditorVariable,
  getHtmlEditorVariableInsertText,
  HTML_EDITOR_VARIABLE_GROUPS,
  isHtmlEditorBuiltinVariableName,
  mergeScannedHtmlEditorVariables,
  normalizeHtmlEditorVariables,
  scanHtmlEditorVariables,
  type HtmlEditorVariableInput,
  type HtmlEditorVariableItem,
  type HtmlEditorVariableValidationResult,
} from './variables';

const AddOutlined = resolveMuiIcon(AddOutlinedModule);
const CodeIcon = resolveMuiIcon(CodeIconModule);
const DataObjectOutlined = resolveMuiIcon(DataObjectOutlinedModule);
const ExpandMoreOutlined = resolveMuiIcon(ExpandMoreOutlinedModule);
const HelpOutlined = resolveMuiIcon(HelpOutlinedModule);
const VisibilityIcon = resolveMuiIcon(VisibilityIconModule);
const ViewColumnIcon = resolveMuiIcon(ViewColumnIconModule);
const MonitorOutlined = resolveMuiIcon(MonitorOutlinedModule);
const PhoneIphoneOutlined = resolveMuiIcon(PhoneIphoneOutlinedModule);

export type HtmlEditorMode = 'split' | 'code' | 'preview';
export type HtmlEditorDevice = 'desktop' | 'mobile';
export type HtmlEditorRightTab = 'preview' | 'variables';
export type {
  HtmlEditorVariableInput,
  HtmlEditorVariableItem,
  HtmlEditorVariableValidationResult,
};

export interface HtmlEditorRef {
  getValue: () => string;
  getPreviewHtml: () => string;
  scanVariables: () => HtmlEditorVariableItem[];
  getVariables: (callback?: (items: HtmlEditorVariableItem[]) => void) => HtmlEditorVariableItem[];
  validateVariables: () => HtmlEditorVariableValidationResult;
  showVariables: () => void;
}

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
const lightThemeNames: Record<string, string> = {
  xcodeLight: 'Xcode Light (Light)',
  vscodeLight: 'VSCode Light (Light)',
  tokyoNightDay: 'Tokyo Night Day (Light)',
  gruvboxLight: 'Gruvbox Light (Light)',
  noctisLilac: 'Noctis Lilac (Light)',
  bbedit: 'BBEdit (Light)',
};

const darkThemeNames: Record<string, string> = {
  abcdef: 'ABCDEF (Dark)',
  basicDark: 'Basic Dark (Dark)',
  dracula: 'Dracula (Dark)',
  tomorrowNightBlue: 'Tomorrow Night Blue (Dark)',
  xcodeDark: 'Xcode Dark (Dark)',
};

const HTML_EDITOR_THEME_STORAGE_KEY = 'html-editor-theme';
const DEFAULT_THEME = 'dracula';

function getStoredTheme(fallback: string = DEFAULT_THEME): string {
  const validFallback = fallback && themeMap[fallback] ? fallback : DEFAULT_THEME;
  if (typeof window === 'undefined') return validFallback;
  try {
    const stored = localStorage.getItem(HTML_EDITOR_THEME_STORAGE_KEY);
    if (stored && themeMap[stored]) return stored;
  } catch {
    // ignore
    console.error('Failed to get HTML Editor stored theme');
  }
  return validFallback;
}

function setStoredTheme(theme: string): void {
  try {
    localStorage.setItem(HTML_EDITOR_THEME_STORAGE_KEY, theme);
  } catch {
    console.error('Failed to set HTML Editor stored theme', theme);
    // ignore
  }
}

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
  /**
   * 初始代码编辑器主题（themeMap 中的 key）
   * 若本地已有 localStorage 则优先用 localStorage；未传时默认 'dracula'
   */
  initialTheme?: string;
  /**
   * 初始右侧面板 tab
   * @default 'preview'
   */
  initialRightTab?: HtmlEditorRightTab;
  /**
   * 已有模板变量默认值。保存时可通过 ref.validateVariables() 扫描当前 HTML 并合并这些默认值。
   */
  variables?: HtmlEditorVariableInput[];
  /**
   * 变量变更回调
   */
  onVariablesChange?: (variables: HtmlEditorVariableItem[]) => void;
  /**
   * 保存校验时是否要求用户变量填写默认值
   * @default true
   */
  requireVariableDefaults?: boolean;
}

function HtmlEditorContent(
{
  value,
  onChange,
  language = 'zh',
  initialMode = 'split',
  initialDevice = 'desktop',
  codeEditorHeight = '100%',
  previewHeight = '100%',
  sx,
  showToolbar = true,
  initialTheme,
  initialRightTab = 'preview',
  variables,
  onVariablesChange,
  requireVariableDefaults = true,
}: HtmlEditorProps,
ref: React.Ref<HtmlEditorRef>,
) {
  // 翻译函数
  const translate = (key: string, params?: Record<string, string | number>): string => {
    return t(key, params, language);
  };
  const [mode, setMode] = useState<HtmlEditorMode>(initialMode);
  const [device, setDevice] = useState<HtmlEditorDevice>(initialDevice);
  const [theme, setTheme] = useState<string>(() => getStoredTheme(initialTheme));
  const [internalValue, setInternalValue] = useState(value);
  const [rightTab, setRightTab] = useState<HtmlEditorRightTab>(initialRightTab);
  const [htmlVariables, setHtmlVariables] = useState<HtmlEditorVariableItem[]>(() => normalizeHtmlEditorVariables(variables));
  const [showVariableErrors, setShowVariableErrors] = useState(false);
  const [variableExpanded, setVariableExpanded] = useState<VariableGroupId | 'custom' | null>(null);
  const [customVariableName, setCustomVariableName] = useState('');
  const [customVariableDefault, setCustomVariableDefault] = useState('');
  const [customVariableTouched, setCustomVariableTouched] = useState(false);
  const [customVariableDefaultTouched, setCustomVariableDefaultTouched] = useState(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeMirrorViewRef = useRef<any>(null);
  const htmlVariablesRef = useRef<HtmlEditorVariableItem[]>(htmlVariables);
  const variableSettingsRef = useRef<HTMLDivElement>(null);
  const detectedVariablesRef = useRef<HTMLDivElement>(null);
  const pendingDetectedScrollRef = useRef(false);

  // iframe ref 必须在组件顶层声明，不能在 renderPreview 函数内部
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 同步外部 value 变化
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (variables === undefined) return;
    const normalized = normalizeHtmlEditorVariables(variables);
    htmlVariablesRef.current = normalized;
    setHtmlVariables(normalized);
  }, [variables]);

  const updateVariables = useCallback(
    (nextVariables: ReadonlyArray<HtmlEditorVariableItem>) => {
      const normalized = nextVariables.map((item, index) => ({
        ...item,
        id: index + 1,
        default: item.type === 'system' ? '' : (item.default ?? ''),
      }));
      htmlVariablesRef.current = normalized;
      setHtmlVariables(normalized);
      onVariablesChange?.(normalized);
      return normalized;
    },
    [onVariablesChange],
  );

  const getCurrentHtmlValue = useCallback(() => {
    const doc = codeMirrorViewRef.current?.state?.doc;
    if (doc && typeof doc.toString === 'function') {
      return doc.toString();
    }
    return internalValue;
  }, [internalValue]);

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

  const scanVariablesFromValue = useCallback(
    (nextValue?: string) => {
      const scanned = scanHtmlEditorVariables(nextValue ?? getCurrentHtmlValue());
      const nextVariables = mergeScannedHtmlEditorVariables(scanned, htmlVariablesRef.current);
      return updateVariables(nextVariables);
    },
    [getCurrentHtmlValue, updateVariables],
  );

  const validateVariables = useCallback((): HtmlEditorVariableValidationResult => {
    const currentValue = getCurrentHtmlValue();
    if (currentValue !== internalValue) {
      setInternalValue(currentValue);
    }
    const nextVariables = scanVariablesFromValue(currentValue);
    const missing = requireVariableDefaults
      ? nextVariables.filter((item) => item.type === 'user' && item.default.trim() === '')
      : [];
    setShowVariableErrors(missing.length > 0);
    if (missing.length > 0) {
      setRightTab('variables');
    }
    return {
      valid: missing.length === 0,
      variables: nextVariables,
      missing,
    };
  }, [getCurrentHtmlValue, internalValue, requireVariableDefaults, scanVariablesFromValue]);

  const handleSaveVariables = useCallback(() => {
    pendingDetectedScrollRef.current = true;
    validateVariables();
    setRightTab('variables');
  }, [validateVariables]);

  useEffect(() => {
    if (rightTab !== 'variables' || !pendingDetectedScrollRef.current) return;
    const rafId = window.requestAnimationFrame(() => {
      const container = variableSettingsRef.current;
      const section = detectedVariablesRef.current;
      if (container && section) {
        container.scrollTo({
          top: Math.max(section.offsetTop - 8, 0),
          behavior: 'auto',
        });
      }
      pendingDetectedScrollRef.current = false;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [rightTab, htmlVariables.length]);

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

  const previewHtml = useMemo(
    () => applyHtmlEditorVariableDefaults(internalValue, htmlVariables),
    [htmlVariables, internalValue],
  );

  // 使用 useMemo 缓存处理后的 HTML，避免每次渲染都重新计算
  const processedHtml = useMemo(() => processHtml(previewHtml), [previewHtml]);

  useImperativeHandle(
    ref,
    () => ({
      getValue: () => getCurrentHtmlValue(),
      getPreviewHtml: () => applyHtmlEditorVariableDefaults(getCurrentHtmlValue(), htmlVariablesRef.current),
      scanVariables: () => scanVariablesFromValue(getCurrentHtmlValue()),
      getVariables: (callback?: (items: HtmlEditorVariableItem[]) => void) => {
        const currentVariables = scanVariablesFromValue(getCurrentHtmlValue());
        callback?.(currentVariables);
        return currentVariables;
      },
      validateVariables,
      showVariables: () => setRightTab('variables'),
    }),
    [getCurrentHtmlValue, scanVariablesFromValue, validateVariables],
  );

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
    if (newDevice === 'desktop' || newDevice === 'mobile') setDevice(newDevice);
  };

  const insertTextAtCursor = useCallback(
    (text: string): string => {
      const view = codeMirrorViewRef.current;
      if (view?.state && view?.dispatch) {
        const range = view.state.selection?.main;
        const currentValue = view.state.doc.toString();
        const from = range?.from ?? view.state.doc.length;
        const to = range?.to ?? from;
        const nextValue = `${currentValue.slice(0, from)}${text}${currentValue.slice(to)}`;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus?.();
        handleChangeDebounced(nextValue);
        return nextValue;
      }
      const nextValue = `${internalValue}${text}`;
      handleChangeDebounced(nextValue);
      return nextValue;
    },
    [internalValue],
  );

  const handleVariableDefaultChange = useCallback(
    (variableInstanceId: string | undefined, defaultValue: string) => {
      const currentVariables = htmlVariablesRef.current;
      updateVariables(
        currentVariables.map((item) =>
          item.variableInstanceId === variableInstanceId
            ? { ...item, default: defaultValue }
            : item,
        ),
      );
    },
    [updateVariables],
  );

  const handleInsertCatalogVariable = useCallback(
    (name: string, kind: VariableKind) => {
      const variable = createHtmlEditorVariable(name, kind);
      if (!variable) return;
      const nextValue = insertTextAtCursor(getHtmlEditorVariableInsertText(name, kind));
      const scanned = scanHtmlEditorVariables(nextValue);
      const merged = mergeScannedHtmlEditorVariables(scanned, htmlVariablesRef.current);
      updateVariables(merged);
      setRightTab('variables');
    },
    [insertTextAtCursor, updateVariables],
  );

  const customVariableNameError = useMemo(() => {
    const name = customVariableName.trim();
    if (!name) return translate('text.variables.customVariableNameRequired');
    if (!VARIABLE_NAME_RE.test(name)) return translate('text.variables.customVariableNameInvalid');
    if (isHtmlEditorBuiltinVariableName(name)) return translate('text.variables.customVariableNameDuplicate');
    if (htmlVariables.some((item) => item.type === 'user' && item.attribute === name)) {
      return translate('text.variables.customVariableNameDuplicate');
    }
    return '';
  }, [customVariableName, htmlVariables]);

  const handleAddCustomVariable = useCallback(() => {
    const defaultValue = customVariableDefault.trim();
    setCustomVariableTouched(true);
    setCustomVariableDefaultTouched(true);
    if (customVariableNameError || defaultValue === '') return;

    const variable = createHtmlEditorVariable(customVariableName.trim(), 'user', defaultValue);
    if (!variable) return;

    const nextValue = insertTextAtCursor(variable.variable);
    const scanned = scanHtmlEditorVariables(nextValue);
    const merged = mergeScannedHtmlEditorVariables(scanned, htmlVariablesRef.current);
    let insertedIndex = -1;
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      const item = merged[index];
      if (item.type === variable.type && item.attribute === variable.attribute && item.default === '') {
        insertedIndex = index;
        break;
      }
    }
    updateVariables(
      merged.map((item, index) =>
        index === insertedIndex
          ? { ...item, default: variable.default }
          : item,
      ),
    );
    setCustomVariableName('');
    setCustomVariableDefault('');
    setCustomVariableTouched(false);
    setCustomVariableDefaultTouched(false);
    setRightTab('variables');
  }, [customVariableDefault, customVariableName, customVariableNameError, insertTextAtCursor, updateVariables]);

  const variableGroupsWithCustom = useMemo<VariableGroup[]>(() => {
    const customNames = new Set<string>();
    const customItems = htmlVariables
      .filter((item) => item.type === 'user')
      .filter((item) => !HTML_EDITOR_VARIABLE_GROUPS.some((group) => group.items.some((groupItem) => groupItem.name === item.attribute)))
      .filter((item) => {
        if (customNames.has(item.attribute)) return false;
        customNames.add(item.attribute);
        return true;
      })
      .map((item) => ({
        name: item.attribute,
        labelKey: item.attribute,
        kind: 'user' as VariableKind,
      }));

    return [{ id: 'custom', items: customItems }, ...HTML_EDITOR_VARIABLE_GROUPS];
  }, [htmlVariables]);

  const visibleHtmlVariables = useMemo(
    () => htmlVariables.filter((item) => item.type !== 'system'),
    [htmlVariables],
  );

  const getVariableGroupTitleKey = (id: VariableGroupId | 'custom') => {
    if (id === 'custom') return 'text.variables.groupCustom';
    if (id === 'contacts') return 'text.variables.groupContacts';
    if (id === 'email') return 'text.variables.groupEmail';
    if (id === 'organization') return 'text.variables.groupOrganization';
    if (id === 'date') return 'text.variables.groupDate';
    return 'text.variables.groupLinks';
  };

  const hostTheme = useTheme();
  const deviceValue = device === 'desktop' || device === 'mobile' ? device : 'desktop';
  const modeValue = mode === 'split' || mode === 'code' || mode === 'preview' ? mode : 'split';
  const selectedSx: SxProps<Theme> = {
    backgroundColor: hostTheme.palette?.action?.selected ?? 'rgba(25, 118, 210, 0.12)',
    color: hostTheme.palette?.primary?.main ?? '#1976d2',
    '&:hover': { backgroundColor: hostTheme.palette?.action?.selected ?? 'rgba(25, 118, 210, 0.12)' },
  };
  const toggleButtonBaseSx: SxProps<Theme> = {
    backgroundColor: hostTheme.palette?.background?.paper ?? '#fff',
    color: hostTheme.palette?.text?.primary ?? '#1F1F21',
    '&:hover': {
      backgroundColor: hostTheme.palette?.action?.hover ?? 'rgba(0, 0, 0, 0.04)',
    },
  };

  // 与 theme.ts MuiTooltip 一致，显式 slotProps 避免与邮件编辑器 Tooltip 样式不一致（同 ThemeProvider 下仍可能因注入顺序等不同）
  const tooltipSlotProps = {
    tooltip: {
      sx: {
        fontSize: '13px',
        fontWeight: 400,
        lineHeight: 1.45,
        maxWidth: 360,
        backgroundColor: alpha(hostTheme.palette?.text?.primary ?? '#1F1F21', 0.9),
        color: hostTheme.palette?.common?.white ?? '#fff',
      },
    },
    arrow: {
      sx: { color: alpha(hostTheme.palette?.text?.primary ?? '#1F1F21', 0.9) },
    },
  };
  const compactHelperTextProps = {
    component: 'div' as const,
    sx: {
      mt: 0.5,
      mx: 0,
      minHeight: 18,
      lineHeight: 1.5,
    },
  };

  // 渲染代码编辑器（高度由父级 flex 约束，避免 100vh 导致溢出；minHeight: 0 让 flex 子项可收缩）
  const renderCodeEditor = () => (
    <Box
      sx={{
        height: codeEditorHeight,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRight: mode === 'split' ? '1px solid' : 'none',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          '& .cm-editor': {
            fontSize: '14px',
          },
          '& .cm-scroller': {
            fontFamily: 'monospace',
          },
          '& .cm-theme': {
            height: '100%',
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
          height="100%"
          extensions={[html()]}
          theme={themeMap[theme] || dracula}
          onChange={handleChangeDebounced}
          onCreateEditor={(view) => {
            codeMirrorViewRef.current = view;
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
          }}
        />
      </Box>
      <Button
        size="small"
        variant="contained"
        startIcon={<DataObjectOutlined fontSize="small" />}
        onClick={handleSaveVariables}
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 2,
          textTransform: 'none',
          boxShadow: 3,
        }}
      >
        {translate('common.save')}
      </Button>
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

  const renderVariableSettings = () => (
    <Box
      ref={variableSettingsRef}
      sx={{
        flex: 1,
        height: '100%',
        minHeight: 0,
        overflow: 'auto',
        backgroundColor: 'background.paper',
        px: 2,
        pt: 2,
        pb: 6,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {translate('htmlEditor.variables.title')}
            </Typography>
            <Tooltip title={translate('htmlEditor.variables.help')} arrow slotProps={tooltipSlotProps}>
              <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary', cursor: 'help' }}>
                <HelpOutlined fontSize="small" />
              </Box>
            </Tooltip>
          </Box>
          <Typography component="div" variant="body2" color="text.secondary">
            {translate('htmlEditor.variables.scanHint')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        {variableGroupsWithCustom.map((group) => {
          const expanded = variableExpanded === group.id;

          return (
            <Accordion
              key={group.id}
              disableGutters
              square
              elevation={0}
              expanded={expanded}
              onChange={(_, next) => setVariableExpanded(next ? group.id : null)}
              sx={{
                '&:before': { display: 'none' },
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
                mb: 1,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreOutlined fontSize="small" />}
                sx={{
                  minHeight: 44,
                  '& .MuiAccordionSummary-content': { my: 1 },
                }}
              >
                <Typography component="div" variant="body2" color="text.primary">
                  {translate(getVariableGroupTitleKey(group.id))}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0, pb: 1.25 }}>
                {group.id === 'custom' && (
                  <Box sx={{ mb: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      label={translate('text.variables.customVariableName')}
                      value={customVariableName}
                      placeholder="e.g. order_id"
                      onChange={(event) => {
                        setCustomVariableName(event.target.value);
                        if (!customVariableTouched && event.target.value.trim() !== '') {
                          setCustomVariableTouched(true);
                        }
                      }}
                      onBlur={() => {
                        if (customVariableName.trim() !== '') setCustomVariableTouched(true);
                      }}
                      error={customVariableTouched && !!customVariableNameError}
                      helperText={customVariableTouched ? customVariableNameError || ' ' : ' '}
                      FormHelperTextProps={compactHelperTextProps}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label={translate('text.variables.defaultValueLabel')}
                      value={customVariableDefault}
                      placeholder={translate('text.variables.defaultPlaceholder')}
                      onChange={(event) => {
                        setCustomVariableDefault(event.target.value);
                        if (!customVariableDefaultTouched && event.target.value.trim() !== '') {
                          setCustomVariableDefaultTouched(true);
                        }
                      }}
                      onBlur={() => {
                        if (customVariableDefault.trim() !== '') setCustomVariableDefaultTouched(true);
                      }}
                      error={customVariableDefaultTouched && customVariableDefault.trim() === ''}
                      helperText={
                        customVariableDefaultTouched && customVariableDefault.trim() === ''
                          ? translate('text.variables.defaultRequired')
                          : ' '
                      }
                      FormHelperTextProps={compactHelperTextProps}
                    />
                    <Button
                      fullWidth
                      size="small"
                      variant="outlined"
                      startIcon={<AddOutlined fontSize="small" />}
                      onClick={handleAddCustomVariable}
                      sx={{
                        justifyContent: 'center',
                        borderColor: 'divider',
                        borderStyle: 'dashed',
                        color: 'text.secondary',
                        textTransform: 'none',
                      }}
                    >
                      {translate('text.variables.addCustomVariable')}
                    </Button>
                  </Box>
                )}

                {group.items.length > 0 && (
                  <Box sx={{ display: 'grid', gap: 0.75 }}>
                    {group.items.map((item) => (
                      <Button
                        key={`${group.id}:${item.name}`}
                        size="small"
                        variant="outlined"
                        onClick={() => handleInsertCatalogVariable(item.name, item.kind)}
                        sx={{
                          justifyContent: 'flex-start',
                          borderColor: 'divider',
                          color: 'text.secondary',
                          textTransform: 'none',
                        }}
                      >
                        <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                          <Typography component="div" variant="body2" color="text.primary">
                            {group.id === 'custom' ? item.name : translate(item.labelKey)}
                          </Typography>
                          <Typography
                            component="div"
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {item.kind === 'builtin' ? `{%${item.name}%}` : `{{${item.name}}}`}
                          </Typography>
                        </Box>
                      </Button>
                    ))}
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography component="div" ref={detectedVariablesRef} variant="subtitle2" sx={{ mb: 0.5 }}>
        {translate('htmlEditor.variables.detected')}
      </Typography>
      <Typography component="div" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {translate('htmlEditor.variables.defaultHelp')}
      </Typography>
      {visibleHtmlVariables.length === 0 ? (
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            color: 'text.secondary',
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          {translate('htmlEditor.variables.empty')}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 0.25 }}>
          {visibleHtmlVariables.map((item, index) => {
            const isMissing = showVariableErrors && item.type === 'user' && item.default.trim() === '';
            const sameNameCount = visibleHtmlVariables.filter((v) => v.type === item.type && v.attribute === item.attribute).length;
            const sameNameIndex = visibleHtmlVariables
              .slice(0, index + 1)
              .filter((v) => v.type === item.type && v.attribute === item.attribute).length;
            return (
              <Box
                key={item.variableInstanceId || `${item.type}:${item.attribute}:${item.id}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'minmax(150px, 42%) 1fr' },
                  alignItems: isMissing ? 'flex-start' : 'center',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  border: '1px solid',
                  borderColor: isMissing ? 'error.main' : 'transparent',
                  borderRadius: 1,
                  borderBottomColor: isMissing ? 'error.main' : 'divider',
                  backgroundColor: isMissing ? alpha(hostTheme.palette.error.main, 0.04) : 'transparent',
                  transition: 'background-color 120ms ease, border-color 120ms ease',
                  '&:hover': {
                    backgroundColor: isMissing ? alpha(hostTheme.palette.error.main, 0.04) : 'action.hover',
                    borderColor: isMissing ? 'error.main' : 'divider',
                  },
                }}
              >
                <Typography
                  component="div"
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 13,
                    lineHeight: 1.35,
                    wordBreak: 'break-all',
                    color: isMissing ? 'error.main' : 'text.primary',
                  }}
                >
                  {sameNameCount > 1 ? `${item.variable} (${sameNameIndex})` : item.variable}
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  disabled={item.type === 'system'}
                  value={item.default}
                  label={isMissing ? translate('text.variables.defaultValueLabel') : undefined}
                  placeholder={
                    item.type === 'system'
                      ? translate('htmlEditor.variables.systemDefault')
                      : translate('text.variables.defaultPlaceholder')
                  }
                  error={isMissing}
                  helperText={isMissing ? translate('text.variables.defaultRequired') : undefined}
                  FormHelperTextProps={compactHelperTextProps}
                  onChange={(event) => handleVariableDefaultChange(item.variableInstanceId, event.target.value)}
                  sx={{
                    '& .MuiInputBase-input': {
                      py: 0.75,
                      fontSize: 13,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );

  const renderRightPanel = () => (
    <Box sx={{ height: previewHeight, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Tabs
        value={rightTab}
        onChange={(_, next: HtmlEditorRightTab) => setRightTab(next)}
        sx={{
          minHeight: 40,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          '& .MuiTab-root': {
            minHeight: 40,
            textTransform: 'none',
          },
        }}
      >
        <Tab value="preview" label={translate('htmlEditor.tabs.preview')} />
        <Tab value="variables" label={translate('htmlEditor.tabs.variables')} />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {rightTab === 'preview' ? renderPreview() : renderVariableSettings()}
      </Box>
    </Box>
  );

  return (
    <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          minHeight: 0,
          minWidth: 0,
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
              value={modeValue}
              exclusive
              onChange={handleModeChange}
              size="small"
              aria-label={translate('htmlEditor.mode.split')}
            >
              <Tooltip title={translate('htmlEditor.tooltips.splitView')} arrow slotProps={tooltipSlotProps}>
                <ToggleButton
                  value="split"
                  aria-label={translate('htmlEditor.mode.split')}
                  // sx={[toggleButtonBaseSx, ...(modeValue === 'split' ? [selectedSx] : [])]}
                >
                  <ViewColumnIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title={translate('htmlEditor.tooltips.codeOnly')} arrow slotProps={tooltipSlotProps}>
                <ToggleButton
                  value="code"
                  aria-label={translate('htmlEditor.mode.code')}
                  // sx={[toggleButtonBaseSx, ...(modeValue === 'code' ? [selectedSx] : [])]}
                >
                  <CodeIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title={translate('htmlEditor.tooltips.previewOnly')} arrow slotProps={tooltipSlotProps}>
                <ToggleButton
                  value="preview"
                  aria-label={translate('htmlEditor.mode.preview')}
                  // sx={[toggleButtonBaseSx, ...(modeValue === 'preview' ? [selectedSx] : [])]}
                >
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
                onChange={(e) => {
                  const next = e.target.value;
                  setTheme(next);
                  setStoredTheme(next);
                }}
                sx={{
                  // fontSize: '0.875rem',
                  '& .MuiSelect-select': {
                    py: 0.5,
                  },
                }}
              >
                <ListSubheader>{translate('htmlEditor.lightThemes')}</ListSubheader>
                {Object.entries(lightThemeNames).map(([key, name]) => (
                  <MenuItem key={key} value={key}>
                    {name}
                  </MenuItem>
                ))}
                <ListSubheader>{translate('htmlEditor.darkThemes')}</ListSubheader>
                {Object.entries(darkThemeNames).map(([key, name]) => (
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
                value={deviceValue}
                exclusive
                onChange={handleDeviceChange}
                size="small"
                aria-label={translate('htmlEditor.device.desktop')}
              >
                <Tooltip title={translate('htmlEditor.tooltips.desktopView')} arrow slotProps={tooltipSlotProps}>
                  <ToggleButton
                    value="desktop"
                    aria-label={translate('htmlEditor.device.desktop')}
                    // sx={[toggleButtonBaseSx, ...(deviceValue === 'desktop' ? [selectedSx] : [])]}
                  >
                    <MonitorOutlined fontSize="small" />
                  </ToggleButton>
                </Tooltip>
                <Tooltip title={translate('htmlEditor.tooltips.mobileView')} arrow slotProps={tooltipSlotProps}>
                  <ToggleButton
                    value="mobile"
                    aria-label={translate('htmlEditor.device.mobile')}
                    // sx={[toggleButtonBaseSx, ...(deviceValue === 'mobile' ? [selectedSx] : [])]}
                  >
                    <PhoneIphoneOutlined fontSize="small" />
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
          minHeight: 0,
          minWidth: 0,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {mode === 'split' && (
          <>
            <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>{renderCodeEditor()}</Box>
            <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>{renderRightPanel()}</Box>
          </>
        )}
        {mode === 'code' && (
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>{renderCodeEditor()}</Box>
        )}
        {mode === 'preview' && (
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>{renderRightPanel()}</Box>
        )}
      </Box>
      </Box>
  );
}

const ForwardedHtmlEditorContent = forwardRef<HtmlEditorRef, HtmlEditorProps>(HtmlEditorContent);
ForwardedHtmlEditorContent.displayName = 'HtmlEditorContent';

const ForwardedHtmlEditor = forwardRef<HtmlEditorRef, HtmlEditorProps>((props, ref) => (
  <ThemeProvider theme={editorTheme}>
    <ScopedCssBaseline
      sx={{
        height: '100%',
        width: '100%',
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ForwardedHtmlEditorContent ref={ref} {...props} />
    </ScopedCssBaseline>
  </ThemeProvider>
));
ForwardedHtmlEditor.displayName = 'HtmlEditor';

export default ForwardedHtmlEditor;
