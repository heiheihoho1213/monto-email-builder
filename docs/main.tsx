import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { CssBaseline, ThemeProvider } from '@mui/material';

import App from '../src/App';
import { setImageUploadHandler, setVideoUploadHandler } from '../src/documents/editor/EditorContext';
import theme from '../src/theme';

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

function AppWithConfig() {
  useEffect(() => {
    // 配置图片上传处理器
    // 如果您不需要本地上传功能，可以不调用此函数
    setImageUploadHandler(exampleImageUploadHandler);
    setVideoUploadHandler(exampleVideoUploadHandler);
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppWithConfig />
    </ThemeProvider>
  </React.StrictMode>
);

