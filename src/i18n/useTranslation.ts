import { useLanguage } from '../documents/editor/EditorContext';

import { t as tBase } from './index';

/**
 * React Hook 用于翻译
 * 会自动从 zustand store 读取当前语言，语言改变时会自动重新渲染
 */
export function useTranslation() {
  const language = useLanguage();

  const t = (key: string, params?: Record<string, string | number>): string => {
    return tBase(key, params, language);
  };

  return { t, language };
}

