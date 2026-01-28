import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import {
  LanguageOutlined,
  DataObjectOutlined,
  TitleOutlined,
  FileUploadOutlined,
  Code as CodeIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { Box, SpeedDial, SpeedDialAction, SpeedDialIcon, Button } from '@mui/material';

import EmailBuilder, { EmailBuilderRef } from '../src/EmailBuilder';
import { HtmlEditor } from '../src';
import { Language } from '../src/i18n';
import { TEditorConfiguration } from '../src/documents/editor/core';

const testJSON = {
  "root": {
    "type": "EmailLayout",
    "data": {
      "backdropColor": "#F5F5F5",
      "canvasColor": "#FFFFFF",
      "textColor": "#262626",
      "fontFamily": "MODERN_SANS",
      "childrenIds": [
        "block-1767940150149-2",
        "block-1767940151420-3",
        "block-1767940152389-4",
        "block-1767940178344-1",
        "block-1767940190319-3",
        "block-1767940154214-5",
        "block-1767940184342-2"
      ]
    }
  },
  "block-1767940150149-2": {
    "type": "Heading",
    "data": {
      "props": {
        "text": "My new heading block"
      },
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "left": 24,
          "right": 24
        }
      }
    }
  },
  "block-1767940151420-3": {
    "type": "Text",
    "data": {
      "props": {
        "text": "My new text block",
        "markdown": false
      },
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "left": 24,
          "right": 24
        },
        "fontWeight": "normal"
      }
    }
  },
  "block-1767940152389-4": {
    "type": "Text",
    "data": {
      "props": {
        "text": "My new text block",
        "markdown": false
      },
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "left": 24,
          "right": 24
        },
        "fontWeight": "normal"
      }
    }
  },
  "block-1767940154214-5": {
    "type": "Button",
    "data": {
      "style": {
        "backgroundColor": "#ede7e7",
        "textAlign": "center",
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        }
      },
      "props": {
        "buttonBackgroundColor": "#1148ef",
        "buttonStyle": "rectangle",
        "fullWidth": true,
        "text": "Button",
        "url": ""
      }
    }
  },
  "block-1767940178344-1": {
    "type": "Image",
    "data": {
      "props": {
        "url": "",
        "alt": "Sample product",
        "contentAlignment": "middle",
        "linkHref": null
      },
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "left": 24,
          "right": 24
        }
      }
    }
  },
  "block-1767940184342-2": {
    "type": "Socials",
    "data": {
      "props": {
        "platforms": [
          "facebook",
          "instagram",
          "x"
        ],
        "iconStyle": "origin-colorful",
        "iconSize": 36,
        "socials": [
          {
            "platform": "facebook",
            "url": null
          },
          {
            "platform": "instagram",
            "url": null
          },
          {
            "platform": "x",
            "url": null
          }
        ]
      },
      "style": {
        "padding": {
          "top": 16,
          "bottom": 16,
          "right": 24,
          "left": 24
        },
        "backgroundColor": "#ede7e7"
      }
    }
  },
  "block-1767940190319-3": {
    "type": "Divider",
    "data": {
      "style": {
        "padding": {
          "top": 16,
          "bottom": 0,
          "right": 0,
          "left": 0
        }
      },
      "props": {
        "lineColor": "#CCCCCC"
      }
    }
  }
};

// 示例：图片上传函数
// 您可以将此函数替换为您自己的上传逻辑
// 例如：上传到云存储服务（AWS S3、阿里云OSS等）或您的后端API
async function exampleImageUploadHandler(file: File): Promise<string> {
  // 示例1: 使用 FileReader 转换为 base64（仅用于演示，生产环境建议上传到服务器）
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      resolve(base64Url);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // 示例2: 上传到后端API（取消注释并实现）
  // const formData = new FormData();
  // formData.append('image', file);
  // const response = await fetch('/api/upload', {
  //   method: 'POST',
  //   body: formData,
  // });
  // const data = await response.json();
  // return data.url;
}

async function exampleVideoUploadHandler(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      resolve(base64Url);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Home = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [showJsonFeatures, setShowJsonFeatures] = useState(true);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const [showSamplesDrawerTitle, setShowSamplesDrawerTitle] = useState(true);
  const [initialDocument, setInitialDocument] = useState<TEditorConfiguration | undefined>(undefined);
  const [editorMode, setEditorMode] = useState<'email' | 'html'>('email');
  const [htmlCode, setHtmlCode] = useState('<p>Hello World</p>\n<h1>HTML Editor Test</h1>\n<p>这是一个 HTML 编辑器测试</p>');
  const emailBuilderRef = useRef<EmailBuilderRef>(null);

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'zh' : 'en'));
  };

  const handleToggleJsonFeatures = () => {
    setShowJsonFeatures((prev) => !prev);
  };

  const handleToggleSamplesDrawerTitle = () => {
    setShowSamplesDrawerTitle((prev) => !prev);
  };

  const handleLoadTestJSON = () => {
    // 深拷贝 testJSON，确保每次都是新的对象引用，触发 React 的变更检测
    setInitialDocument(JSON.parse(JSON.stringify(testJSON)) as TEditorConfiguration);
  };

  const handleToggleEditorMode = () => {
    setEditorMode((prev) => (prev === 'email' ? 'html' : 'email'));
  };

  const handleSave = () => {
    emailBuilderRef.current?.getData((json, html) => {
      console.log('JSON:', json);
      console.log('HTML:', html);
    });
  };

  return (
    <React.StrictMode>
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {editorMode === 'email' ? (
          <EmailBuilder
            ref={emailBuilderRef}
            initialDocument={initialDocument}
            language={language}
            showJsonFeatures={showJsonFeatures}
            showSamplesDrawerTitle={showSamplesDrawerTitle}
            imageUploadHandler={exampleImageUploadHandler}
            videoUploadHandler={exampleVideoUploadHandler}
            onChange={(document) => {
              console.log('Document changed:', document);
            }}
            onNameChange={(name) => {
              console.log('Name changed:', name);
            }}
          />
        ) : (
          <HtmlEditor
            value={htmlCode}
            onChange={(value) => {
              setHtmlCode(value);
            }}
            initialMode="split"
            initialDevice="desktop"
            language={language}
          />
        )}
        <SpeedDial
          ariaLabel="测试功能"
          sx={{ position: 'fixed', bottom: 16, left: 16, zIndex: 1000 }}
          icon={<SpeedDialIcon />}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
          open={speedDialOpen}
        >
          <SpeedDialAction
            key="language"
            icon={<LanguageOutlined />}
            tooltipTitle={`切换语言: ${language === 'en' ? '中文' : 'English'}`}
            onClick={handleToggleLanguage}
          />
          <SpeedDialAction
            key="json"
            icon={<DataObjectOutlined />}
            tooltipTitle={`JSON功能: ${showJsonFeatures ? '显示' : '隐藏'}`}
            onClick={handleToggleJsonFeatures}
          />
          <SpeedDialAction
            key="samplesDrawerTitle"
            icon={<TitleOutlined />}
            tooltipTitle={`左侧边栏标题: ${showSamplesDrawerTitle ? '显示' : '隐藏'}`}
            onClick={handleToggleSamplesDrawerTitle}
          />
          <SpeedDialAction
            key="loadTestJSON"
            icon={<FileUploadOutlined />}
            tooltipTitle="加载测试 JSON"
            onClick={handleLoadTestJSON}
          />
          <SpeedDialAction
            key="toggleEditor"
            icon={editorMode === 'email' ? <CodeIcon /> : <EmailIcon />}
            tooltipTitle={`切换到: ${editorMode === 'email' ? 'HTML 编辑器' : '邮件编辑器'}`}
            onClick={handleToggleEditorMode}
          />
        </SpeedDial>
      </Box>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Home />
);
