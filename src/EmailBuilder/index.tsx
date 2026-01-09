import React, { useEffect } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

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
  setSaveAndExitHandler,
  setSaveHandler,
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
   * 当用户编辑邮件模板时，会调用此函数并传入最新的配置
   */
  onChange?: (document: TEditorConfiguration) => void;

  /**
   * 保存回调函数
   * 当用户点击保存按钮时，会调用此函数并传入当前的配置
   * 可以是同步函数或返回 Promise 的异步函数
   */
  saveHandler?: (document: TEditorConfiguration) => void | Promise<void>;

  /**
   * 保存并退出回调函数
   * 当用户点击保存并退出按钮时，会先保存文档，然后调用此函数
   * 可以是同步函数或返回 Promise 的异步函数
   * 通常用于关闭编辑器或导航到其他页面
   */
  saveAndExitHandler?: (document: TEditorConfiguration) => void | Promise<void>;

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
 * EmailBuilder 组件
 * 
 * 一个功能完整的邮件模板编辑器组件，可以在其他 React 项目中使用
 * 
 * @example
 * ```tsx
 * import { EmailBuilder } from 'monto-email-builder';
 * 
 * function MyApp() {
 *   const handleChange = (document) => {
 *     // Handle document changes
 *   };
 * 
 *   const handleImageUpload = async (file: File) => {
 *     // 上传图片到服务器
 *     const formData = new FormData();
 *     formData.append('image', file);
 *     const response = await fetch('/api/upload', {
 *       method: 'POST',
 *       body: formData,
 *     });
 *     const data = await response.json();
 *     return data.url;
 *   };
 * 
 *   return (
 *     <EmailBuilder
 *       language="zh"
 *       imageUploadHandler={handleImageUpload}
 *       videoUploadHandler={handleVideoUpload}
 *       onChange={handleChange}
 *     />
 *   );
 * }
 * ```
 */
export default function EmailBuilder({
  initialDocument,
  language = 'en',
  imageUploadHandler,
  videoUploadHandler,
  onChange,
  saveHandler,
  saveAndExitHandler,
  initialName,
  onNameChange,
  theme: customTheme,
  showJsonFeatures = true,
  showSamplesDrawerTitle = true,
}: EmailBuilderProps) {
  // 初始化 store（包括历史记录管理器）
  useEffect(() => {
    initializeStore({
      document: initialDocument,
      language: language,
      showJsonFeatures: showJsonFeatures,
      showSamplesDrawerTitle: showSamplesDrawerTitle,
    });
  }, [showJsonFeatures, showSamplesDrawerTitle]); // 当配置变化时也重新初始化

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

  // 当 saveHandler 变化时，更新处理器
  useEffect(() => {
    setSaveHandler(saveHandler);
  }, [saveHandler]);

  // 当 saveAndExitHandler 变化时，更新处理器
  useEffect(() => {
    setSaveAndExitHandler(saveAndExitHandler);
  }, [saveAndExitHandler]);

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
}

