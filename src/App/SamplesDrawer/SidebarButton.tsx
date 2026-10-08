import React, { useState } from 'react';

import { Button } from '@mui/material';

import { resetDocument, setEditingSlot } from '../../documents/editor/EditorContext';
import { loadSampleTemplate } from '../../getConfiguration';

/** 加载内置模板并替换当前文档 */
export async function openSampleTemplate(sampleName: string) {
  const template = await loadSampleTemplate(sampleName);
  setEditingSlot(null);
  resetDocument(template);
}

export default function SidebarButton({ sampleName, children }: { sampleName: string; children: JSX.Element | string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await openSampleTemplate(sampleName);
    } catch {
      // Failed to load template
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="small" onClick={handleClick} disabled={loading}>
      {loading ? 'Loading...' : children}
    </Button>
  );
}
