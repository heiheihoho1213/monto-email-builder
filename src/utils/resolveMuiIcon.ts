import type { ElementType } from 'react';

type MaybeDefault<T> = T & { default?: unknown };

export function resolveMuiIcon(iconModule: unknown): ElementType {
  let candidate: unknown = iconModule;
  let guard = 0;
  while (candidate && typeof candidate === 'object' && 'default' in (candidate as Record<string, unknown>) && guard < 5) {
    const next = (candidate as MaybeDefault<unknown>).default;
    if (!next || next === candidate) break;
    candidate = next;
    guard += 1;
  }

  if (typeof candidate === 'function' || typeof candidate === 'string') {
    return candidate as ElementType;
  }

  // React.forwardRef / React.memo components are objects with $$typeof.
  if (candidate && typeof candidate === 'object' && '$$typeof' in (candidate as Record<string, unknown>)) {
    return candidate as ElementType;
  }

  return 'span';
}
