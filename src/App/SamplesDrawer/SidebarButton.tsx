import React, { useState } from 'react';

import { Button } from '@mui/material';

import { resetDocument } from '../../documents/editor/EditorContext';
import { loadSampleTemplate } from '../../getConfiguration';

export default function SidebarButton({ sampleName, children }: { sampleName: string; children: JSX.Element | string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const template = await loadSampleTemplate(sampleName);
      resetDocument(template);
    } catch (error) {
      console.error('Failed to load template:', error);
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
