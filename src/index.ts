/**
 * EmailBuilder - 邮件模板编辑器组件库
 *
 * 这是一个功能完整的邮件模板编辑器，可以在其他 React 项目中使用
 */

export { default as EmailBuilder } from './EmailBuilder';
export type { EmailBuilderProps } from './EmailBuilder';

// 导出类型
export type { TEditorConfiguration, TEditorBlock } from './documents/editor/core';
export type { Language } from './i18n';

// 导出工具函数（可选）
export { useDocument, useLanguage } from './documents/editor/EditorContext';

