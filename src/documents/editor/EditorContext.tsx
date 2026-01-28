import React from 'react';
import { create } from 'zustand';

import { TEditorConfiguration } from './core';
import { HistoryManager } from './HistoryManager';

import { getLanguage, Language, setLanguage as setI18nLanguage } from '../../i18n';

type TValue = {
  document: TEditorConfiguration;

  selectedBlockId: string | null;
  selectedSidebarTab: 'block-configuration' | 'styles';
  selectedMainTab: 'editor' | 'preview' | 'json' | 'html';
  selectedScreenSize: 'desktop' | 'mobile';

  inspectorDrawerOpen: boolean;
  samplesDrawerOpen: boolean;

  // 图片上传函数配置
  imageUploadHandler?: (file: File) => Promise<string>;

  // 视频上传函数配置
  videoUploadHandler?: (file: File) => Promise<string>;

  // 语言设置
  language: Language;

  // 文档变化回调
  onChange?: (document: TEditorConfiguration) => void;

  // 保存回调
  saveHandler?: (document: TEditorConfiguration) => void | Promise<void>;

  // 保存并退出回调
  saveAndExitHandler?: (document: TEditorConfiguration) => void | Promise<void>;

  // 模板名称
  name: string;

  // 名称变化回调
  onNameChange?: (name: string) => void;

  // 是否显示 JSON 相关功能
  showJsonFeatures: boolean;

  // 是否显示左侧边栏标题
  showSamplesDrawerTitle: boolean;
};

// 初始化函数，支持外部传入初始值
let initialDocument: TEditorConfiguration | null = null;
let initialLanguage: Language | null = null;
let initialShowJsonFeatures: boolean = true; // 默认值改为 true，与 EmailBuilder 的默认值一致
let initialShowSamplesDrawerTitle: boolean = true; // 默认显示标题

// 历史记录管理器实例
let historyManager: HistoryManager | null = null;

export function initializeStore(config?: { document?: TEditorConfiguration; language?: Language; showJsonFeatures?: boolean; showSamplesDrawerTitle?: boolean }) {
  if (config?.document) {
    initialDocument = config.document;
  }
  if (config?.language) {
    initialLanguage = config.language;
  }
  if (config?.showJsonFeatures !== undefined) {
    initialShowJsonFeatures = config.showJsonFeatures;
  }
  if (config?.showSamplesDrawerTitle !== undefined) {
    initialShowSamplesDrawerTitle = config.showSamplesDrawerTitle;
  }

  // 初始化历史记录管理器
  const doc = initialDocument || EMPTY_EMAIL_MESSAGE;
  historyManager = new HistoryManager(doc);

  // 更新 store 中的配置
  const updates: Partial<TValue> = {};
  if (config?.showJsonFeatures !== undefined) {
    updates.showJsonFeatures = config.showJsonFeatures;
  }
  if (config?.showSamplesDrawerTitle !== undefined) {
    updates.showSamplesDrawerTitle = config.showSamplesDrawerTitle;
  }
  if (config?.language !== undefined) {
    updates.language = config.language;
    // 同时更新 i18n 的 localStorage
    setI18nLanguage(config.language);
  }
  if (Object.keys(updates).length > 0) {
    editorStateStore.setState(updates);
  }
}

import EMPTY_EMAIL_MESSAGE from '../../getConfiguration/sample/empty-email-message';

// 确保历史记录管理器已初始化
if (!historyManager) {
  const doc = initialDocument || EMPTY_EMAIL_MESSAGE;
  historyManager = new HistoryManager(doc);
}

const editorStateStore = create<TValue>((set, get) => ({
  document: initialDocument || EMPTY_EMAIL_MESSAGE,
  selectedBlockId: null,
  selectedSidebarTab: 'styles',
  selectedMainTab: 'editor',
  selectedScreenSize: 'desktop',

  inspectorDrawerOpen: true,
  samplesDrawerOpen: true,

  language: initialLanguage || getLanguage(),

  onChange: undefined,
  saveHandler: undefined,
  saveAndExitHandler: undefined,
  name: '',
  onNameChange: undefined,
  showJsonFeatures: initialShowJsonFeatures,
  showSamplesDrawerTitle: initialShowSamplesDrawerTitle,
}));

export function useDocument() {
  return editorStateStore((s) => s.document);
}

export function useSelectedBlockId() {
  return editorStateStore((s) => s.selectedBlockId);
}

export function useSelectedScreenSize() {
  return editorStateStore((s) => s.selectedScreenSize);
}

export function useSelectedMainTab() {
  return editorStateStore((s) => s.selectedMainTab);
}

export function setSelectedMainTab(selectedMainTab: TValue['selectedMainTab']) {
  return editorStateStore.setState({ selectedMainTab });
}

export function useSelectedSidebarTab() {
  return editorStateStore((s) => s.selectedSidebarTab);
}

export function useInspectorDrawerOpen() {
  return editorStateStore((s) => s.inspectorDrawerOpen);
}

export function useSamplesDrawerOpen() {
  return editorStateStore((s) => s.samplesDrawerOpen);
}

export function setSelectedBlockId(selectedBlockId: TValue['selectedBlockId']) {
  const selectedSidebarTab = selectedBlockId === null ? 'styles' : 'block-configuration';
  const options: Partial<TValue> = {};
  if (selectedBlockId !== null) {
    options.inspectorDrawerOpen = true;
  }
  return editorStateStore.setState({
    selectedBlockId,
    selectedSidebarTab,
    ...options,
  });
}

export function setSidebarTab(selectedSidebarTab: TValue['selectedSidebarTab']) {
  return editorStateStore.setState({ selectedSidebarTab });
}

export function resetDocument(document: TValue['document']) {
  // 重置历史记录管理器
  if (historyManager) {
    historyManager.reset(document);
  }

  editorStateStore.setState({
    document,
    selectedSidebarTab: 'styles',
    selectedBlockId: null,
  });

  // 调用 onChange 回调
  const onChange = editorStateStore.getState().onChange;
  if (onChange) {
    onChange(document);
  }
}

export function setDocument(document: TValue['document'], options?: { recordHistory?: boolean }) {
  const originalDocument = editorStateStore.getState().document;
  const newDocument = {
    ...originalDocument,
    ...document,
  };

  // 如果需要记录历史（默认记录）
  if (options?.recordHistory !== false && historyManager) {
    const recordedDocument = historyManager.record(newDocument);
    editorStateStore.setState({
      document: recordedDocument,
    });

    // 调用 onChange 回调
    const onChange = editorStateStore.getState().onChange;
    if (onChange) {
      onChange(recordedDocument);
    }
  } else {
    // 不记录历史（用于撤销/重做操作本身）
    editorStateStore.setState({
      document: newDocument,
    });

    // 调用 onChange 回调
    const onChange = editorStateStore.getState().onChange;
    if (onChange) {
      onChange(newDocument);
    }
  }
}

export function setOnChange(onChange: TValue['onChange']) {
  return editorStateStore.setState({ onChange });
}

export function toggleInspectorDrawerOpen() {
  const inspectorDrawerOpen = !editorStateStore.getState().inspectorDrawerOpen;
  return editorStateStore.setState({ inspectorDrawerOpen });
}

export function toggleSamplesDrawerOpen() {
  const samplesDrawerOpen = !editorStateStore.getState().samplesDrawerOpen;
  return editorStateStore.setState({ samplesDrawerOpen });
}

export function setSelectedScreenSize(selectedScreenSize: TValue['selectedScreenSize']) {
  return editorStateStore.setState({ selectedScreenSize });
}

export function useImageUploadHandler() {
  return editorStateStore((s) => s.imageUploadHandler);
}

export function setImageUploadHandler(handler: TValue['imageUploadHandler']) {
  return editorStateStore.setState({ imageUploadHandler: handler });
}

export function useVideoUploadHandler() {
  return editorStateStore((s) => s.videoUploadHandler);
}

export function setVideoUploadHandler(handler: TValue['videoUploadHandler']) {
  return editorStateStore.setState({ videoUploadHandler: handler });
}

export function useLanguage() {
  return editorStateStore((s) => s.language);
}

export function setLanguage(lang: Language) {
  setI18nLanguage(lang);
  return editorStateStore.setState({ language: lang });
}

export function useSaveHandler() {
  return editorStateStore((s) => s.saveHandler);
}

export function setSaveHandler(handler: TValue['saveHandler']) {
  return editorStateStore.setState({ saveHandler: handler });
}

export async function saveDocument() {
  const document = editorStateStore.getState().document;
  const saveHandler = editorStateStore.getState().saveHandler;
  if (saveHandler) {
    await saveHandler(document);
  }
}

export function useSaveAndExitHandler() {
  return editorStateStore((s) => s.saveAndExitHandler);
}

export function setSaveAndExitHandler(handler: TValue['saveAndExitHandler']) {
  return editorStateStore.setState({ saveAndExitHandler: handler });
}

export function saveAndExitDocument(onExit: (document: TEditorConfiguration) => void | Promise<void>) {
  const document = editorStateStore.getState().document;
  if (onExit) {
    // 异步调用退出回调，不等待其完成，避免组件销毁时的内存问题
    Promise.resolve(onExit(document)).catch(() => {
      // Error handled silently
    });
  }
}

export function useName() {
  return editorStateStore((s) => s.name);
}

export function setName(name: string) {
  editorStateStore.setState({ name });
  const onNameChange = editorStateStore.getState().onNameChange;
  if (onNameChange) {
    onNameChange(name);
  }
}

export function setOnNameChange(handler: TValue['onNameChange']) {
  return editorStateStore.setState({ onNameChange: handler });
}

export function useShowJsonFeatures() {
  return editorStateStore((s) => s.showJsonFeatures);
}

export function setShowJsonFeatures(show: boolean) {
  return editorStateStore.setState({ showJsonFeatures: show });
}

export function useShowSamplesDrawerTitle() {
  return editorStateStore((s) => s.showSamplesDrawerTitle);
}

export function setShowSamplesDrawerTitle(show: boolean) {
  return editorStateStore.setState({ showSamplesDrawerTitle: show });
}

// ==================== 撤销/重做相关 ====================

/**
 * 检查是否可以撤销
 */
export function canUndo(): boolean {
  return historyManager ? historyManager.canUndo() : false;
}

/**
 * 检查是否可以重做
 */
export function canRedo(): boolean {
  return historyManager ? historyManager.canRedo() : false;
}

/**
 * 撤销操作
 */
export function undo(): boolean {
  if (!historyManager) return false;

  const previousDocument = historyManager.undo();
  if (!previousDocument) return false;

  // 更新文档状态（不记录历史）
  editorStateStore.setState({
    document: previousDocument,
  });

  // 调用 onChange 回调
  const onChange = editorStateStore.getState().onChange;
  if (onChange) {
    onChange(previousDocument);
  }

  return true;
}

/**
 * 重做操作
 */
export function redo(): boolean {
  if (!historyManager) return false;

  const nextDocument = historyManager.redo();
  if (!nextDocument) return false;

  // 更新文档状态（不记录历史）
  editorStateStore.setState({
    document: nextDocument,
  });

  // 调用 onChange 回调
  const onChange = editorStateStore.getState().onChange;
  if (onChange) {
    onChange(nextDocument);
  }

  return true;
}

/**
 * Hook: 检查是否可以撤销
 */
export function useCanUndo(): boolean {
  // 使用 Zustand 的 selector 来订阅 document 变化
  const document = editorStateStore((s) => s.document);

  // 每次 document 变化时重新计算 canUndo
  return React.useMemo(() => canUndo(), [document]);
}

/**
 * Hook: 检查是否可以重做
 */
export function useCanRedo(): boolean {
  // 使用 Zustand 的 selector 来订阅 document 变化
  const document = editorStateStore((s) => s.document);

  // 每次 document 变化时重新计算 canRedo
  return React.useMemo(() => canRedo(), [document]);
}

// 导出 editorStateStore 用于跨容器拖拽
export { editorStateStore };
