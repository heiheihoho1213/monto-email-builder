import type { TEditorBlock, TEditorConfiguration } from './core';
import { flattenTemplate, type TSlotTemplate } from './headerFooterTemplates';

/**
 * Every document has exactly one header and one footer Container at fixed ids.
 * They are always the first / last children of the root EmailLayout and cannot be
 * deleted, moved or duplicated. Their content comes from the predefined templates below.
 */
export const HEADER_BLOCK_ID = 'header';
export const FOOTER_BLOCK_ID = 'footer';

export type THeaderFooterSlot = 'header' | 'footer';

export function isLockedBlockId(blockId: string | null | undefined): boolean {
  return blockId === HEADER_BLOCK_ID || blockId === FOOTER_BLOCK_ID;
}

const ROOT_ID = 'root';

function slotBlockId(slot: THeaderFooterSlot) {
  return slot === 'header' ? HEADER_BLOCK_ID : FOOTER_BLOCK_ID;
}

function emptySlotContainer(): TEditorBlock {
  return {
    type: 'Container',
    data: {
      style: { padding: { top: 0, bottom: 0, left: 0, right: 0 } },
      props: { childrenIds: [] },
    },
  } as TEditorBlock;
}

function findRootId(doc: TEditorConfiguration): string | null {
  if (doc[ROOT_ID]?.type === 'EmailLayout') return ROOT_ID;
  for (const [id, block] of Object.entries(doc)) {
    if (block.type === 'EmailLayout') return id;
  }
  return null;
}

/**
 * Ensures the header/footer blocks exist and sit first/last in the root childrenIds.
 * Returns the same object when nothing needs to change.
 */
export function ensureHeaderFooter(doc: TEditorConfiguration): TEditorConfiguration {
  const rootId = findRootId(doc);
  if (!rootId) return doc;
  const root = doc[rootId];
  if (root.type !== 'EmailLayout') return doc;

  const childrenIds = root.data.childrenIds ?? [];
  const middle = childrenIds.filter((id) => !isLockedBlockId(id));
  const headerOk = doc[HEADER_BLOCK_ID]?.type === 'Container';
  const footerOk = doc[FOOTER_BLOCK_ID]?.type === 'Container';
  const orderOk =
    childrenIds.length === middle.length + 2 &&
    childrenIds[0] === HEADER_BLOCK_ID &&
    childrenIds[childrenIds.length - 1] === FOOTER_BLOCK_ID;

  if (headerOk && footerOk && orderOk) return doc;

  return {
    ...doc,
    ...(headerOk ? {} : { [HEADER_BLOCK_ID]: emptySlotContainer() }),
    ...(footerOk ? {} : { [FOOTER_BLOCK_ID]: emptySlotContainer() }),
    [rootId]: {
      ...root,
      data: { ...root.data, childrenIds: [HEADER_BLOCK_ID, ...middle, FOOTER_BLOCK_ID] },
    },
  };
}

function collectDescendantIds(doc: TEditorConfiguration, blockId: string, out: string[] = []): string[] {
  const block = doc[blockId];
  if (!block) return out;
  let ids: string[] = [];
  if (block.type === 'Container') {
    ids = block.data.props?.childrenIds ?? [];
  } else if (block.type === 'ColumnsContainer') {
    ids = (block.data.props?.columns ?? []).flatMap((c: { childrenIds?: string[] | null }) => c.childrenIds ?? []);
  }
  for (const id of ids) {
    out.push(id);
    collectDescendantIds(doc, id, out);
  }
  return out;
}

// ==================== Templates ====================

export { HEADER_TEMPLATES, FOOTER_TEMPLATES, FEATURED_COUNT } from './headerFooterTemplates';
export type { TSlotTemplate } from './headerFooterTemplates';

/** Replaces the content of the header or footer with the given template. */
export function applyHeaderFooterTemplate(
  doc: TEditorConfiguration,
  slot: THeaderFooterSlot,
  template: TSlotTemplate
): TEditorConfiguration {
  const base = ensureHeaderFooter(doc);
  const slotId = slotBlockId(slot);
  const next: TEditorConfiguration = { ...base };

  for (const id of collectDescendantIds(base, slotId)) {
    delete next[id];
  }

  const { childrenIds, blocks } = flattenTemplate(template, `${slotId}-${Date.now()}`);
  Object.assign(next, blocks);

  next[slotId] = {
    type: 'Container',
    data: {
      style: JSON.parse(JSON.stringify(template.containerStyle)),
      props: { childrenIds },
    },
  } as TEditorBlock;

  return next;
}

/** A standalone document containing only the template, used for gallery previews. */
export function buildSlotPreviewDocument(template: TSlotTemplate): TEditorConfiguration {
  const { childrenIds, blocks } = flattenTemplate(template, 'preview');
  return {
    root: {
      type: 'EmailLayout',
      data: { backdropColor: '#FFFFFF', canvasColor: '#FFFFFF', textColor: '#262626', fontFamily: 'MODERN_SANS', childrenIds: ['slot'] },
    },
    slot: { type: 'Container', data: { style: template.containerStyle, props: { childrenIds } } },
    ...blocks,
  } as TEditorConfiguration;
}

/** Clears the header or footer content; the canvas then asks the user to select a template again. */
export function clearHeaderFooter(doc: TEditorConfiguration, slot: THeaderFooterSlot): TEditorConfiguration {
  const base = ensureHeaderFooter(doc);
  const slotId = slotBlockId(slot);
  const next: TEditorConfiguration = { ...base };
  for (const id of collectDescendantIds(base, slotId)) {
    delete next[id];
  }
  next[slotId] = emptySlotContainer();
  return next;
}
