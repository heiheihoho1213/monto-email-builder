import React, { useEffect, useState } from 'react';

import { html, json } from './highlighters';

type TextEditorPanelProps = {
  type: 'json' | 'html' | 'javascript';
  value: string;
};
export default function HighlightedCodePanel({ type, value }: TextEditorPanelProps) {
  const [code, setCode] = useState<React.ReactElement | null>(null);

  useEffect(() => {
    switch (type) {
      case 'html':
        html(value).then(setCode);
        return;
      case 'json':
        json(value).then(setCode);
        return;
    }
  }, [value, type]);

  if (code === null) {
    return null;
  }

  return (
    <div
      onClick={(ev) => {
        const s = window.getSelection();
        if (s === null) {
          return;
        }
        s.selectAllChildren(ev.currentTarget);
      }}
    >
      {code}
    </div>
  );
}
