import React, { useState, useEffect } from 'react';

import { renderToStaticMarkup } from 'monto-email-core';

import { useDocument } from '../../documents/editor/EditorContext';

import HighlightedCodePanel from './helper/HighlightedCodePanel';

export default function HtmlPanel() {
  const document = useDocument();
  const [code, setCode] = useState<string>('');

  useEffect(() => {
    // 在 useEffect 中调用 renderToStaticMarkup，避免在 useMemo 中调用 Hooks
    try {
      const htmlCode = renderToStaticMarkup(document, { rootBlockId: 'root' });
      setCode(htmlCode);
    } catch (error) {
      setCode('<!-- Error rendering HTML -->');
    }
  }, [document]);

  return <HighlightedCodePanel type="html" value={code} />;
}
