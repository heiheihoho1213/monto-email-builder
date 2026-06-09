import {
  BASE_VARIABLE_GROUPS,
  VARIABLE_NAME_RE,
  type VariableGroup,
  type VariableKind,
} from '../documents/blocks/Text/variableCatalog';

export type HtmlEditorVariableType = 'user' | 'system';

export type HtmlEditorVariableItem = {
  id: number;
  variableInstanceId?: string;
  variable: string;
  type: HtmlEditorVariableType;
  attribute: string;
  default: string;
};

export type HtmlEditorVariableInput = Partial<HtmlEditorVariableItem> & {
  VariableInstanceId?: string;
  Variable?: string;
  Type?: HtmlEditorVariableType;
  Attribute?: string;
  Default?: string;
  key?: string;
  value?: string;
};

export type HtmlEditorVariableValidationResult = {
  valid: boolean;
  variables: HtmlEditorVariableItem[];
  missing: HtmlEditorVariableItem[];
};

export const HTML_EDITOR_VARIABLE_GROUPS: VariableGroup[] = BASE_VARIABLE_GROUPS;
export const HTML_EDITOR_UNSUBSCRIBE_LINK_VARIABLE = 'unsubscribe_link';

const USER_VARIABLE_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const SYSTEM_VARIABLE_RE = /\{%\s*([^{}%]+?)\s*%\}/g;

function isStandaloneToken(source: string, start: number, end: number, left: string, right: string): boolean {
  return source[start - 1] !== left && source[end] !== right;
}

function toVariableToken(name: string, kind: VariableKind | HtmlEditorVariableType = 'user'): string {
  return kind === 'builtin' || kind === 'system' ? `{%${name}%}` : `{{${name}}}`;
}

export function parseHtmlEditorVariableToken(token: string | null | undefined): {
  attribute: string;
  type: HtmlEditorVariableType;
} | null {
  const value = typeof token === 'string' ? token.trim() : '';
  if (value.startsWith('{{') && value.endsWith('}}')) {
    const attribute = value.slice(2, -2).trim();
    if (VARIABLE_NAME_RE.test(attribute)) return { attribute, type: 'user' };
  }
  if (value.startsWith('{%') && value.endsWith('%}')) {
    const attribute = value.slice(2, -2).trim();
    if (VARIABLE_NAME_RE.test(attribute)) return { attribute, type: 'system' };
  }
  return null;
}

function normalizeVariableInput(input: HtmlEditorVariableInput, index: number): HtmlEditorVariableItem | null {
  const rawToken = input.variable ?? input.Variable ?? input.key ?? '';
  const parsedToken = parseHtmlEditorVariableToken(rawToken);
  const rawType = input.type ?? input.Type ?? parsedToken?.type ?? 'user';
  const type: HtmlEditorVariableType = rawType === 'system' ? 'system' : 'user';
  const rawAttribute = input.attribute ?? input.Attribute ?? parsedToken?.attribute ?? '';
  const attribute = String(rawAttribute).trim();

  if (!attribute || !VARIABLE_NAME_RE.test(attribute)) return null;

  return {
    id: Number(input.id) || index + 1,
    variableInstanceId: input.variableInstanceId ?? input.VariableInstanceId,
    variable: type === 'system' ? `{%${attribute}%}` : `{{${attribute}}}`,
    type,
    attribute,
    default: String(input.default ?? input.Default ?? input.value ?? ''),
  };
}

export function normalizeHtmlEditorVariables(
  variables: ReadonlyArray<HtmlEditorVariableInput> | null | undefined,
): HtmlEditorVariableItem[] {
  if (!Array.isArray(variables)) return [];

  return variables
    .map((item, index) => normalizeVariableInput(item, index))
    .filter((item): item is HtmlEditorVariableItem => !!item)
    .map((item, index) => ({
      ...item,
      id: index + 1,
      variableInstanceId: item.variableInstanceId || createHtmlEditorVariableInstanceId(item.type, item.attribute, index),
    }));
}

export function scanHtmlEditorVariables(source: string): HtmlEditorVariableItem[] {
  const content = source || '';
  const occurrences: Array<{ attribute: string; type: HtmlEditorVariableType; start: number }> = [];

  const pushVariable = (attribute: string, type: HtmlEditorVariableType, start: number) => {
    occurrences.push({ attribute, type, start });
  };

  let userMatch: RegExpExecArray | null;
  USER_VARIABLE_RE.lastIndex = 0;
  while ((userMatch = USER_VARIABLE_RE.exec(content))) {
    const start = userMatch.index;
    const end = start + userMatch[0].length;
    if (!isStandaloneToken(content, start, end, '{', '}')) continue;

    const attribute = userMatch[1].trim();
    if (!attribute || !VARIABLE_NAME_RE.test(attribute)) continue;
    pushVariable(attribute, 'user', start);
  }

  let systemMatch: RegExpExecArray | null;
  SYSTEM_VARIABLE_RE.lastIndex = 0;
  while ((systemMatch = SYSTEM_VARIABLE_RE.exec(content))) {
    const start = systemMatch.index;
    const end = start + systemMatch[0].length;
    if (!isStandaloneToken(content, start, end, '{', '}')) continue;

    const attribute = systemMatch[1].trim();
    if (!attribute || !VARIABLE_NAME_RE.test(attribute)) continue;
    pushVariable(attribute, 'system', start);
  }

  occurrences.sort((a, b) => a.start - b.start);

  return occurrences.map((item, index) => ({
    id: index + 1,
    variableInstanceId: createHtmlEditorVariableInstanceId(item.type, item.attribute, index),
    variable: item.type === 'system' ? `{%${item.attribute}%}` : `{{${item.attribute}}}`,
    type: item.type,
    attribute: item.attribute,
    default: '',
  }));
}

export function mergeScannedHtmlEditorVariables(
  scanned: ReadonlyArray<HtmlEditorVariableItem>,
  current: ReadonlyArray<HtmlEditorVariableItem>,
): HtmlEditorVariableItem[] {
  type CurrentEntry = { item: HtmlEditorVariableItem; index: number; consumed: boolean };
  type ScannedEntry = { item: HtmlEditorVariableItem; scanIndex: number; matchedCurrentIndex?: number };

  const currentEntries = current.map((item, index) => ({ item, index, consumed: false }));
  const currentByInstanceId = new Map<string, CurrentEntry[]>();
  const currentByAttribute = new Map<string, CurrentEntry[]>();

  currentEntries.forEach((entry) => {
    const { item } = entry;
    if (item.variableInstanceId) {
      const list = currentByInstanceId.get(item.variableInstanceId) ?? [];
      list.push(entry);
      currentByInstanceId.set(item.variableInstanceId, list);
    }
    const key = `${item.type}:${item.attribute}`;
    const list = currentByAttribute.get(key) ?? [];
    list.push(entry);
    currentByAttribute.set(key, list);
  });

  const consumedByAttribute = new Map<string, number>();

  const mergedEntries: ScannedEntry[] = scanned.map((item, index) => {
    const key = `${item.type}:${item.attribute}`;
    const used = consumedByAttribute.get(key) ?? 0;
    consumedByAttribute.set(key, used + 1);

    const matchedByInstanceId = item.variableInstanceId
      ? currentByInstanceId.get(item.variableInstanceId)?.find((entry) => !entry.consumed)
      : undefined;
    const attributeEntries = currentByAttribute.get(key) ?? [];
    const matchedByAttribute =
      attributeEntries[used] && !attributeEntries[used].consumed
        ? attributeEntries[used]
        : attributeEntries.find((entry) => !entry.consumed);
    const matched = matchedByInstanceId ?? matchedByAttribute;
    if (matched) {
      matched.consumed = true;
    }

    return {
      item: {
        ...item,
        id: index + 1,
        variableInstanceId:
          matched?.item.variableInstanceId ||
          item.variableInstanceId ||
          createHtmlEditorVariableInstanceId(item.type, item.attribute, index),
        default: item.type === 'system' ? '' : (matched?.item.default ?? item.default ?? ''),
      },
      scanIndex: index,
      matchedCurrentIndex: matched?.index,
    };
  });

  const scannedByCurrentIndex = new Map<number, ScannedEntry>();
  mergedEntries.forEach((entry) => {
    if (entry.matchedCurrentIndex !== undefined) {
      scannedByCurrentIndex.set(entry.matchedCurrentIndex, entry);
    }
  });

  const orderedEntries: ScannedEntry[] = currentEntries.map((entry) => {
    const scannedEntry = scannedByCurrentIndex.get(entry.index);
    if (scannedEntry) return scannedEntry;
    return { item: entry.item, scanIndex: Number.POSITIVE_INFINITY, matchedCurrentIndex: entry.index };
  });

  mergedEntries
    .filter((entry) => entry.matchedCurrentIndex === undefined)
    .sort((a, b) => a.scanIndex - b.scanIndex)
    .forEach((entry) => {
      const nextMatchedEntry = mergedEntries.find(
        (candidate) => candidate.scanIndex > entry.scanIndex && candidate.matchedCurrentIndex !== undefined,
      );
      if (nextMatchedEntry?.matchedCurrentIndex !== undefined) {
        const insertAt = orderedEntries.findIndex(
          (candidate) => candidate.matchedCurrentIndex === nextMatchedEntry.matchedCurrentIndex,
        );
        if (insertAt >= 0) {
          orderedEntries.splice(insertAt, 0, entry);
          return;
        }
      }
      orderedEntries.push(entry);
    });

  return orderedEntries.map(({ item }, index) => ({
    ...item,
    id: index + 1,
    variableInstanceId: item.variableInstanceId || createHtmlEditorVariableInstanceId(item.type, item.attribute, index),
    default: item.type === 'system' ? '' : (item.default ?? ''),
  }));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function applyHtmlEditorVariableDefaults(
  source: string,
  variables: ReadonlyArray<HtmlEditorVariableItem>,
): string {
  const defaultsByAttribute = new Map<string, string[]>();
  variables.forEach((item) => {
    if (item.type !== 'user') return;
    const list = defaultsByAttribute.get(item.attribute) ?? [];
    list.push(item.default ?? '');
    defaultsByAttribute.set(item.attribute, list);
  });
  const consumedByAttribute = new Map<string, number>();

  return (source || '').replace(USER_VARIABLE_RE, (match, rawName, offset, fullSource) => {
    const end = offset + match.length;
    if (!isStandaloneToken(fullSource, offset, end, '{', '}')) return match;

    const attribute = String(rawName).trim();
    if (!attribute || !VARIABLE_NAME_RE.test(attribute)) return match;
    const used = consumedByAttribute.get(attribute) ?? 0;
    consumedByAttribute.set(attribute, used + 1);
    const defaultValue = defaultsByAttribute.get(attribute)?.[used];
    if (defaultValue === undefined || defaultValue === '') return match;
    return escapeHtml(defaultValue);
  });
}

export function createHtmlEditorVariable(name: string, kind: VariableKind, defaultValue = ''): HtmlEditorVariableItem | null {
  const attribute = name.trim();
  if (!attribute || !VARIABLE_NAME_RE.test(attribute)) return null;
  const type: HtmlEditorVariableType = kind === 'builtin' ? 'system' : 'user';
  return {
    id: 1,
    variableInstanceId: createHtmlEditorVariableInstanceId(type, attribute, 0),
    variable: toVariableToken(attribute, kind),
    type,
    attribute,
    default: type === 'system' ? '' : defaultValue,
  };
}

export function isHtmlEditorBuiltinVariableName(name: string): boolean {
  const attribute = name.trim();
  if (!attribute) return false;

  return HTML_EDITOR_VARIABLE_GROUPS.some((group) => group.items.some((item) => item.name === attribute));
}

export function getHtmlEditorVariableInsertText(name: string, kind: VariableKind): string {
  const attribute = name.trim();
  if (kind === 'user' && attribute === HTML_EDITOR_UNSUBSCRIBE_LINK_VARIABLE) {
    return `<a href="{{${HTML_EDITOR_UNSUBSCRIBE_LINK_VARIABLE}}">Unsubscribe Link</a>`;
  }

  return toVariableToken(attribute, kind);
}

function createHtmlEditorVariableInstanceId(type: HtmlEditorVariableType, attribute: string, index: number): string {
  return `html-${type}-${attribute}-${index + 1}`;
}
