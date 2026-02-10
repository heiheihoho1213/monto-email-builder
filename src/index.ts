/**
 * EmailBuilder - 邮件模板编辑器组件库
 *
 * 这是一个功能完整的邮件模板编辑器，可以在其他 React 项目中使用
 * 
 * 向后兼容：所有现有导入方式保持不变
 * - import { EmailBuilder, HtmlEditor } from 'monto-email-builder' ✅
 * - import EmailBuilder from 'monto-email-builder' ✅
 * 
 * 按需加载（可选）：如需单独加载 HtmlEditor，可使用：
 * - import { HtmlEditor } from 'monto-email-builder/html-editor'
 */

// 命名导出
export { default as EmailBuilder } from './EmailBuilder';
export type { EmailBuilderProps, EmailBuilderRef } from './EmailBuilder';

// 默认导出（支持 import EmailBuilder from 'monto-email-builder'）
export { default } from './EmailBuilder';

// 导出 HtmlEditor 组件（已通过代码分割分离，不会增加主包体积）
export { default as HtmlEditor } from './HtmlEditor';
export type { HtmlEditorProps, HtmlEditorMode, HtmlEditorDevice } from './HtmlEditor';

// 导出类型
export type { TEditorConfiguration, TEditorBlock } from './documents/editor/core';
export type { Language } from './i18n';

// 导出工具函数（可选）
export { useDocument, useLanguage } from './documents/editor/EditorContext';

