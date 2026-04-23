import React from 'react';

import CodeOutlined from '@mui/icons-material/CodeOutlined';
import DataObjectOutlined from '@mui/icons-material/DataObjectOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PreviewOutlined from '@mui/icons-material/PreviewOutlined';
import { Tab, Tabs, Tooltip } from '@mui/material';

import { setSelectedMainTab, useSelectedMainTab, useShowJsonFeatures } from '../../documents/editor/EditorContext';
import { useTranslation } from '../../i18n/useTranslation';

export default function MainTabsGroup() {
  const { t } = useTranslation();
  const selectedMainTab = useSelectedMainTab();
  const showJsonFeatures = useShowJsonFeatures();
  const handleChange = (_: unknown, v: unknown) => {
    switch (v) {
      case 'json':
      case 'preview':
      case 'editor':
      case 'html':
        setSelectedMainTab(v);
        return;
      default:
        setSelectedMainTab('editor');
    }
  };

  return (
    <Tabs value={selectedMainTab} onChange={handleChange}>
      <Tab
        value="editor"
        label={
          <Tooltip title={t('tabs.edit')} arrow>
            <EditOutlined fontSize="small" />
          </Tooltip>
        }
      />
      <Tab
        value="preview"
        label={
          <Tooltip title={t('tabs.preview')} arrow>
            <PreviewOutlined fontSize="small" />
          </Tooltip>
        }
      />
      <Tab
        value="html"
        label={
          <Tooltip title={t('tabs.htmlOutput')} arrow>
            <CodeOutlined fontSize="small" />
          </Tooltip>
        }
      />
      {showJsonFeatures && (
        <Tab
          value="json"
          label={
            <Tooltip title={t('tabs.jsonOutput')} arrow>
              <DataObjectOutlined fontSize="small" />
            </Tooltip>
          }
        />
      )}
    </Tabs>
  );
}
