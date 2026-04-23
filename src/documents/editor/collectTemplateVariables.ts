import { getResolvedTextBodyHtml, type TextProps } from 'monto-email-block-text';

import { extractInsertedVariableOccurrencesFromHtmlString } from '../blocks/Text/textDom';

import type { TEditorBlock, TEditorConfiguration } from './core';

export type EmailTemplateVariableItem = {
  /** 文档内全局自增，从 1 起 */
  id: number;
  /** 与 span `data-variable-instance-id` 一致，用于关联 variableDefaults */
  variableInstanceId: string;
  /** 完整 token：`{{name}}` 或 `{%name%}` */
  variable: string;
  /** 变量类型：`{{}}` -> user，`{% %}` -> system */
  type: 'user' | 'system';
  /** 变量名（不含分隔符） */
  attribute: string;
  /** 用户变量为 variableDefaults[variableInstanceId]；内置变量固定为 `''` */
  default: string;
};

const VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** 从入参解析「变量名」：优先 `attribute`，否则从 `variable` 的 `{{name}}` 解析 */
function resolveAttributeKeyFromInput(v: EmailBuilderVariableInput): string | null {
  const attr = (v.attribute ?? '').trim();
  if (attr && VARIABLE_NAME_RE.test(attr)) return attr;
  const varStr = (v.variable ?? '').trim();
  if (varStr.startsWith('{{') && varStr.endsWith('}}')) {
    const n = varStr.slice(2, -2).trim();
    if (VARIABLE_NAME_RE.test(n)) return n;
  }
  return null;
}

/**
 * EmailBuilder `variables` 入参（与 getVariables 输出可对齐）：
 * - **集成推荐**：只传 `attribute` + `default`（或 `variable: "{{name}}"` + `default`），无需知道 `variableInstanceId`；
 * - 若已知实例 id，可传 `variableInstanceId` 精确写入一条。
 */
export type EmailBuilderVariableInput = {
  id?: number;
  /** 若已知正文 span 的 id，只更新该实例；与按名匹配二选一 */
  variableInstanceId?: string;
  /** 如 `{{first_name}}`；可与 attribute 二选一用于解析变量名 */
  variable?: string;
  /** 变量名（不含 `{{}}`）；与 `variable` 二选一；无需 `variableInstanceId` */
  attribute?: string;
  default: string;
};

/**
 * 从 Text `props.variables[].default` 预填到 `props.variableDefaults`：
 * - 有 `variableInstanceId`：按实例写入；
 * - 无实例 id：按 attribute 作为 legacy 键写入（后续会在编辑器内迁移到实例 id）。
 */
export function hydrateVariableDefaultsFromEmbeddedVariables(
  document: TEditorConfiguration,
  rootBlockId = 'root',
): TEditorConfiguration {
  const nextDoc: TEditorConfiguration = { ...document };
  let docChanged = false;

  const visit = (blockId: string, block: TEditorBlock) => {
    if (block.type !== 'Text') return;
    const data = block.data as TextProps;
    const vars = (data.props as any)?.variables;
    if (!Array.isArray(vars) || vars.length === 0) return;

    const vd = { ...(data.props?.variableDefaults ?? {}) } as Record<string, string>;
    let blockChanged = false;

    for (const item of vars as Array<Record<string, unknown>>) {
      if (!item || typeof item !== 'object') continue;
      if (!Object.prototype.hasOwnProperty.call(item, 'default')) continue;
      const rawDefault = item.default;
      if (rawDefault == null) continue;
      const def = String(rawDefault);

      const iid = typeof item.variableInstanceId === 'string' ? item.variableInstanceId.trim() : '';
      if (iid) {
        if (vd[iid] !== def) {
          vd[iid] = def;
          blockChanged = true;
        }
        continue;
      }

      const key = resolveAttributeKeyFromInput({
        attribute: typeof item.attribute === 'string' ? item.attribute : undefined,
        variable: typeof item.variable === 'string' ? item.variable : undefined,
        default: def,
      });
      if (!key) continue;
      if (vd[key] !== def) {
        vd[key] = def;
        blockChanged = true;
      }
    }

    if (blockChanged) {
      docChanged = true;
      nextDoc[blockId] = {
        ...block,
        data: {
          ...data,
          props: {
            ...(data.props as object),
            variableDefaults: vd,
          },
        },
      } as TEditorBlock;
    }
  };

  const seen = new Set<string>();
  if (document[rootBlockId]) {
    walkFrom(document, rootBlockId, visit, seen);
  }

  return docChanged ? nextDoc : document;
}

function getChildBlockIds(block: TEditorBlock): string[] {
  const data = block.data as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== 'object') return [];

  const ids: string[] = [];

  // EmailLayout：childrenIds 在 data 顶层（不是 data.props）
  const topChildren = (data as { childrenIds?: unknown }).childrenIds;
  if (Array.isArray(topChildren)) {
    for (const id of topChildren) {
      if (typeof id === 'string') ids.push(id);
    }
  }

  const props = (data as { props?: Record<string, unknown> }).props;
  if (props && typeof props === 'object') {
    const ch = (props as { childrenIds?: unknown }).childrenIds;
    if (Array.isArray(ch)) {
      for (const id of ch) {
        if (typeof id === 'string') ids.push(id);
      }
    }
    const cols = (props as { columns?: unknown }).columns;
    if (Array.isArray(cols)) {
      for (const col of cols) {
        if (col && typeof col === 'object' && Array.isArray((col as { childrenIds?: unknown }).childrenIds)) {
          for (const id of (col as { childrenIds: string[] }).childrenIds) {
            if (typeof id === 'string') ids.push(id);
          }
        }
      }
    }
  }
  return ids;
}

function walkFrom(
  document: TEditorConfiguration,
  id: string,
  visit: (blockId: string, block: TEditorBlock) => void,
  seen: Set<string>,
): void {
  if (seen.has(id)) return;
  const block = document[id];
  if (!block) return;
  seen.add(id);
  visit(id, block);
  for (const cid of getChildBlockIds(block)) {
    walkFrom(document, cid, visit, seen);
  }
}

/**
 * 从当前文档收集 Text 中「插入式」变量（span[data-text-variable]）：
 * - `{{name}}`：default 来自 variableDefaults；
 * - `{%name%}`：builtin，default 恒为 `''`。
 * 不包含手打 `{{}}` / `{% %}` 纯文本。多段落 HTML 会在 body 范围内扫描。
 */
export function collectTemplateVariablesFromDocument(
  document: TEditorConfiguration,
  rootBlockId = 'root',
): EmailTemplateVariableItem[] {
  const rows: EmailTemplateVariableItem[] = [];
  let idCounter = 0;
  const defaultsByInstanceId = new Map<string, string>();

  const visit = (_blockId: string, block: TEditorBlock) => {
    if (block.type !== 'Text') return;
    const data = block.data as TextProps;
    const vd = data.props?.variableDefaults;
    if (vd) {
      for (const k of Object.keys(vd)) {
        defaultsByInstanceId.set(k, vd[k] == null ? '' : String(vd[k]));
      }
    }
    const html = getResolvedTextBodyHtml(data.props ?? null);
    const occurrences = extractInsertedVariableOccurrencesFromHtmlString(html);

    for (const { name, builtin, instanceId } of occurrences) {
      idCounter += 1;
      const def = builtin
        ? ''
        : instanceId
          ? (defaultsByInstanceId.get(instanceId) ?? defaultsByInstanceId.get(name) ?? '')
          : (defaultsByInstanceId.get(name) ?? '');
      rows.push({
        id: idCounter,
        variableInstanceId: instanceId,
        variable: builtin ? `{%${name}%}` : `{{${name}}}`,
        type: builtin ? 'system' : 'user',
        attribute: name,
        default: def,
      });
    }
  };

  const seen = new Set<string>();
  if (document[rootBlockId]) {
    walkFrom(document, rootBlockId, visit, seen);
  }

  return rows;
}

/**
 * 将外部传入的变量默认值合并进文档：仅对正文里「插入式变量」span（含 `data-variable-instance-id`）生效。
 * - 入参带 `variableInstanceId`：只写该实例；
 * - 否则按 `attribute` / `variable` 解析变量名，对正文中**所有**同名 `{{name}}` 实例写入同一 `default`（内置 `{%name%}` 不按名写入）。
 * 未在正文出现的名或 id 会被忽略；未在入参中出现的实例保留原有 variableDefaults。
 */
export function applyExternalVariableDefaultsToDocument(
  document: TEditorConfiguration,
  variables: ReadonlyArray<EmailBuilderVariableInput> | null | undefined,
  rootBlockId = 'root',
): TEditorConfiguration {
  if (!variables || variables.length === 0) return document;

  const byInstanceId = new Map<string, string>();
  const byAttribute = new Map<string, string>();
  for (const v of variables) {
    if (!v) continue;
    const def = v.default == null ? '' : String(v.default);
    const iid = (v.variableInstanceId ?? '').trim();
    if (iid) {
      byInstanceId.set(iid, def);
      continue;
    }
    const key = resolveAttributeKeyFromInput(v);
    if (key) byAttribute.set(key, def);
  }
  if (byInstanceId.size === 0 && byAttribute.size === 0) return document;

  const nextDoc: TEditorConfiguration = { ...document };
  let docChanged = false;

  const visit = (blockId: string, block: TEditorBlock) => {
    if (block.type !== 'Text') return;
    const data = block.data as TextProps;
    const html = getResolvedTextBodyHtml(data.props ?? null);
    const occ = extractInsertedVariableOccurrencesFromHtmlString(html);
    const vd = { ...(data.props?.variableDefaults ?? {}) } as Record<string, string>;
    let blockChanged = false;
    for (const o of occ) {
      if (!o.instanceId) continue;
      let val: string | undefined;
      if (byInstanceId.has(o.instanceId)) {
        val = byInstanceId.get(o.instanceId);
      } else if (!o.builtin && byAttribute.has(o.name)) {
        val = byAttribute.get(o.name);
      }
      if (val === undefined) continue;
      if (vd[o.instanceId] !== val) {
        vd[o.instanceId] = val;
        blockChanged = true;
      }
    }
    if (blockChanged) {
      docChanged = true;
      nextDoc[blockId] = {
        ...block,
        data: {
          ...data,
          props: {
            ...(data.props as object),
            variableDefaults: vd,
          },
        },
      } as TEditorBlock;
    }
  };

  const seen = new Set<string>();
  if (document[rootBlockId]) {
    walkFrom(document, rootBlockId, visit, seen);
  }

  return docChanged ? nextDoc : document;
}
