import { create } from 'zustand';

import { TEditorConfiguration } from './core';

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
};

// 初始化函数，支持外部传入初始值
let initialDocument: TEditorConfiguration | null = null;
let initialLanguage: Language | null = null;

export function initializeStore(config?: { document?: TEditorConfiguration; language?: Language }) {
  if (config?.document) {
    initialDocument = config.document;
  }
  if (config?.language) {
    initialLanguage = config.language;
  }
}

import EMPTY_EMAIL_MESSAGE from '../../getConfiguration/sample/empty-email-message';

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

export function setDocument(document: TValue['document']) {
  const originalDocument = editorStateStore.getState().document;
  const newDocument = {
    ...originalDocument,
    ...document,
  };
  editorStateStore.setState({
    document: newDocument,
  });

  // 调用 onChange 回调
  const onChange = editorStateStore.getState().onChange;
  if (onChange) {
    onChange(newDocument);
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

// 导出 editorStateStore 用于跨容器拖拽
export { editorStateStore };
