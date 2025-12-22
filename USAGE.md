# 使用示例

## 在其他 React 项目中使用

### 1. 安装依赖

```bash
npm install monto-email-builder
```

### 2. 基本使用

```tsx
import { EmailBuilder } from 'monto-email-builder';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <EmailBuilder />
    </div>
  );
}
```

### 3. 带初始配置

```tsx
import { EmailBuilder, TEditorConfiguration } from 'monto-email-builder';

function App() {
  const initialDocument: TEditorConfiguration = {
    root: {
      type: 'EmailLayout',
      data: {
        backdropColor: '#F5F5F5',
        canvasColor: '#FFFFFF',
        textColor: '#262626',
        fontFamily: 'MODERN_SANS',
        childrenIds: [],
      },
    },
  };

  return (
    <EmailBuilder
      initialDocument={initialDocument}
      initialLanguage="zh"
    />
  );
}
```

### 4. 监听文档变化

```tsx
import { EmailBuilder, TEditorConfiguration } from 'monto-email-builder';

function App() {
  const handleChange = (document: TEditorConfiguration) => {
    console.log('Document changed:', document);
    // 保存到服务器
    fetch('/api/save-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document),
    });
  };

  return (
    <EmailBuilder
      onChange={handleChange}
    />
  );
}
```

### 5. 配置图片上传

```tsx
import { EmailBuilder } from 'monto-email-builder';

function App() {
  const handleImageUpload = async (file: File): Promise<string> => {
    // 上传到云存储（示例：AWS S3）
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data.url;
  };

  return (
    <EmailBuilder
      imageUploadHandler={handleImageUpload}
    />
  );
}
```

### 6. 完整示例

```tsx
import { useState } from 'react';
import { EmailBuilder, TEditorConfiguration } from 'monto-email-builder';

function App() {
  const [document, setDocument] = useState<TEditorConfiguration | null>(null);

  const handleChange = (doc: TEditorConfiguration) => {
    setDocument(doc);
    // 自动保存
    localStorage.setItem('email-template', JSON.stringify(doc));
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    
    const data = await response.json();
    return data.url;
  };

  // 从 localStorage 加载初始文档
  const initialDocument = (() => {
    const saved = localStorage.getItem('email-template');
    return saved ? JSON.parse(saved) : undefined;
  })();

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <EmailBuilder
        initialDocument={initialDocument}
        initialLanguage="zh"
        imageUploadHandler={handleImageUpload}
        onChange={handleChange}
      />
    </div>
  );
}

export default App;
```

## 获取当前文档

```tsx
import { useDocument } from 'monto-email-builder';

function MyComponent() {
  const document = useDocument();
  
  const handleExport = () => {
    console.log('Current document:', document);
    // 导出文档
  };
  
  return <button onClick={handleExport}>Export</button>;
}
```

## 类型定义

```tsx
import type {
  EmailBuilderProps,
  TEditorConfiguration,
  TEditorBlock,
  Language,
} from 'monto-email-builder';
```

