import React from 'react';

import { LanguageOutlined } from '@mui/icons-material';
import { IconButton, Menu, MenuItem } from '@mui/material';

import { setLanguage, useLanguage } from '../../documents/editor/EditorContext';
import { Language } from '../../i18n';

export default function LanguageSwitcher() {
  const language = useLanguage();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    handleClose();
  };

  return (
    <>
      <IconButton onClick={handleClick} size="small" sx={{ color: 'text.secondary' }}>
        <LanguageOutlined fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => handleLanguageChange('zh')} selected={language === 'zh'}>
          中文
        </MenuItem>
        <MenuItem onClick={() => handleLanguageChange('en')} selected={language === 'en'}>
          English
        </MenuItem>
      </Menu>
    </>
  );
}

