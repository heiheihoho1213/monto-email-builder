import { editorStateStore } from './EditorContext';

/**
 * 若焦点仍在 Text 可编辑区内，触发 margin blur，走 TextEditor 既有 handleBlur → 把 DOM 序列化进 document。
 * 避免未失焦时 getData/getVariables 读到旧的 props.html。
 */
export function flushActiveTextEditorToDocument(): void {
  if (typeof document === 'undefined') return;
  const ae = document.activeElement as HTMLElement | null;
  if (!ae) return;
  const margin = ae.closest('[data-monto-text-block-id]') as HTMLElement | null;
  if (!margin || !margin.contains(ae)) return;
  const blockId = margin.getAttribute('data-monto-text-block-id');
  if (!blockId) return;
  const block = editorStateStore.getState().document[blockId];
  if (!block || block.type !== 'Text') return;
  margin.blur();
}
