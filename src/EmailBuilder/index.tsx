import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { renderToStaticMarkup } from 'monto-email-core';

import {
  initializeStore,
  resetDocument,
  setImageUploadHandler,
  setShowJsonFeatures,
  setShowSamplesDrawerTitle,
  setVideoUploadHandler,
  setLanguage,
  setName,
  setOnChange,
  setOnNameChange,
  editorStateStore,
} from '../documents/editor/EditorContext';
import { Language } from '../i18n';
import { TEditorConfiguration } from '../documents/editor/core';
import theme from '../theme';

import App from '../App';

export interface EmailBuilderProps {
  /**
   * 邮件模板配置 JSON
   * 当此值变化时，编辑器会自动更新文档内容
   */
  initialDocument?: TEditorConfiguration;

  /**
   * 语言设置，可选值：'zh' | 'en'
   * 当此值变化时，编辑器会自动切换语言
   * @default 'en'
   */
  language?: Language;

  /**
   * 图片上传回调函数
   * 接收 File 对象，返回 Promise<string>，返回图片的 URL
   */
  imageUploadHandler?: (file: File) => Promise<string>;

  /**
   * 视频上传回调函数
   * 接收 File 对象，返回 Promise<string>，返回视频的 URL
   */
  videoUploadHandler?: (file: File) => Promise<string>;

  /**
   * 文档变化时的回调函数
   * 当用户编辑邮件模板时，会调用此函数并传入最新的配置与对应渲染出的 HTML（一一对应，无需再调 getData）
   */
  onChange?: (document: TEditorConfiguration, html: string) => void;

  /**
   * 模板名称
   * 当此值变化时，编辑器会自动更新名称输入框
   */
  initialName?: string;

  /**
   * 名称变化时的回调函数
   * 当用户修改模板名称时，会调用此函数并传入最新的名称
   */
  onNameChange?: (name: string) => void;

  /**
   * 自定义主题（可选）
   * 如果不提供，将使用默认的 Material-UI 主题
   */
  theme?: typeof theme;

  /**
   * 是否显示 JSON 相关功能（JSON tab、下载 JSON、导入 JSON）
   * @default true
   */
  showJsonFeatures?: boolean;

  /**
   * 是否显示左侧边栏标题
   * @default true
   */
  showSamplesDrawerTitle?: boolean;
}

/**
 * EmailBuilder 组件暴露的方法
 */
export interface EmailBuilderRef {
  /**
   * 获取当前的 JSON 和 HTML 数据
   * @param callback 回调函数，接收 json 和 html 作为参数
   */
  getData: (callback: (json: TEditorConfiguration, html: string) => void) => void;
}

/**
 * EmailBuilder 组件
 * 
 * 一个功能完整的邮件模板编辑器组件，可以在其他 React 项目中使用
 * 
 * @example
 * ```tsx
 * import { EmailBuilder } from 'monto-email-builder';
 * 
 * function MyApp() {
 *   const emailBuilderRef = useRef<EmailBuilderRef>(null);
 * 
 *   const handleSave = () => {
 *     emailBuilderRef.current?.getData((json, html) => {
 *       // 处理 json 和 html 数据
 *       console.log('JSON:', json);
 *       console.log('HTML:', html);
 *     });
 *   };
 * 
 *   return (
 *     <>
 *       <EmailBuilder
 *         ref={emailBuilderRef}
 *         language="zh"
 *         imageUploadHandler={handleImageUpload}
 *         onChange={handleChange}
 *       />
 *       <button onClick={handleSave}>保存</button>
 *     </>
 *   );
 * }
 * ```
 */
const EmailBuilder = forwardRef<EmailBuilderRef, EmailBuilderProps>(({
  initialDocument,
  language = 'en',
  imageUploadHandler,
  videoUploadHandler,
  onChange,
  initialName,
  onNameChange,
  theme: customTheme,
  showJsonFeatures = true,
  showSamplesDrawerTitle = true,
}, ref) => {
  // 初始化 store（包括历史记录管理器）
  // 关键点：这里要“同步初始化”，保证第三方集成时首屏就按 props 生效（避免抽屉/标题/语言闪一下）
  const initializedRef = useRef(false);
  if (!initializedRef.current) {
    initializeStore({
      document: initialDocument,
      language: language,
      showJsonFeatures: showJsonFeatures,
      showSamplesDrawerTitle: showSamplesDrawerTitle,
    });
    initializedRef.current = true;
  }

  // 当 initialDocument 变化时，更新文档
  useEffect(() => {
    if (initialDocument !== undefined) {
      resetDocument(initialDocument);
    }
  }, [initialDocument]);

  // 当 language 变化时，更新语言
  // 注意：这里不依赖 currentLanguage，避免循环更新
  // 只要 language 有值，就强制更新语言
  useEffect(() => {
    if (language !== undefined) {
      setLanguage(language);
    }
  }, [language]);

  // 当 imageUploadHandler 变化时，更新处理器
  useEffect(() => {
    setImageUploadHandler(imageUploadHandler);
  }, [imageUploadHandler]);

  // 当 videoUploadHandler 变化时，更新处理器
  useEffect(() => {
    setVideoUploadHandler(videoUploadHandler);
  }, [videoUploadHandler]);

  // 当 onChange 变化时，更新回调
  useEffect(() => {
    setOnChange(onChange);
  }, [onChange]);

  // 暴露 ref API
  useImperativeHandle(ref, () => ({
    getData: (callback: (json: TEditorConfiguration, html: string) => void) => {
      const document = editorStateStore.getState().document;
      try {
        const html = renderToStaticMarkup(document, { rootBlockId: 'root' });
        callback(document, html);
      } catch (error) {
        // 如果生成 HTML 失败，仍然返回 JSON
        callback(document, '<!-- Error rendering HTML -->');
      }
    },
  }));

  // 当 initialName 变化时，更新名称
  useEffect(() => {
    if (initialName !== undefined) {
      setName(initialName);
    }
  }, [initialName]);

  // 当 onNameChange 变化时，更新回调
  useEffect(() => {
    setOnNameChange(onNameChange);
  }, [onNameChange]);

  // 当 showJsonFeatures 变化时，更新配置
  useEffect(() => {
    setShowJsonFeatures(showJsonFeatures);
  }, [showJsonFeatures]);

  // 当 showSamplesDrawerTitle 变化时，更新配置
  useEffect(() => {
    setShowSamplesDrawerTitle(showSamplesDrawerTitle);
  }, [showSamplesDrawerTitle]);

  return (
    <ThemeProvider theme={customTheme || theme}>
      <CssBaseline />
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <App />
      </Box>
    </ThemeProvider>
  );
});

EmailBuilder.displayName = 'EmailBuilder';

export default EmailBuilder;
export { EmailBuilder };

