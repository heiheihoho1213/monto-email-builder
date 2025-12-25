# Email Builder - 邮件模板编辑器组件库

> node >= 18 + pnpm

一个功能完整的邮件模板编辑器 React 组件，可以在其他 React 项目中使用。

## 项目结构

```
packages/editor-sample/
├── src/              # 库源代码（会被打包到 npm）
│   ├── EmailBuilder/    # 主组件
│   ├── App/             # 内部组件
│   ├── documents/       # 核心逻辑
│   ├── getConfiguration/ # 配置管理
│   ├── i18n/            # 国际化
│   ├── theme.ts         # 主题配置
│   └── index.ts         # 库入口文件
├── docs/             # 开发预览项目（不会被打包）
│   ├── main.tsx         # 预览入口
│   ├── index.html       # 预览 HTML
│   └── favicon/         # 网站图标
├── dist/              # 库构建输出（发布到 npm）
└── docs-dist/         # 预览构建输出（不发布）
```

- **库代码**：`src/` 文件夹包含所有库代码，会被打包到 npm
- **开发预览**：`docs/` 文件夹包含本地开发和预览的代码，不会被打包
- **构建命令**：
  - `npm run dev` - 启动开发预览服务器（使用 docs 文件夹）
  - `npm run build:lib` - 构建库代码（输出到 dist 文件夹）
  - `npm run build` - 构建预览版本（输出到 docs-dist 文件夹）

## 安装

```bash
npm install monto-email-builder
# 或
yarn add monto-email-builder
# 或
pnpm add monto-email-builder
```

### 安装 peerDependencies

由于这是一个库，您需要安装以下 peerDependencies：

```bash
# 必需依赖
npm install react react-dom
npm install @mui/material @mui/icons-material
npm install @emotion/react @emotion/styled
npm install zustand zod react-colorful

# @usewaypoint 系列包
npm install @usewaypoint/block-avatar @usewaypoint/block-button \
  @usewaypoint/block-columns-container @usewaypoint/block-container \
  @usewaypoint/block-divider @usewaypoint/block-heading \
  @usewaypoint/block-html @usewaypoint/block-image \
  @usewaypoint/block-spacer @usewaypoint/block-text \
  @usewaypoint/document-core @usewaypoint/email-builder

# 可选依赖（用于代码高亮功能，HTML/JSON 输出预览）
# 如果使用代码高亮功能，需要安装 react-syntax-highlighter
npm install react-syntax-highlighter
# 注意：代码格式化使用纯 JavaScript 实现，无需额外依赖
```

或者使用 yarn/pnpm：

```bash
# yarn
yarn add react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled zustand zod react-colorful @usewaypoint/block-avatar @usewaypoint/block-button @usewaypoint/block-columns-container @usewaypoint/block-container @usewaypoint/block-divider @usewaypoint/block-heading @usewaypoint/block-html @usewaypoint/block-image @usewaypoint/block-spacer @usewaypoint/block-text @usewaypoint/document-core @usewaypoint/email-builder

# pnpm
pnpm add react react-dom @mui/material @mui/icons-material @emotion/react @emotion/styled zustand zod react-colorful @usewaypoint/block-avatar @usewaypoint/block-button @usewaypoint/block-columns-container @usewaypoint/block-container @usewaypoint/block-divider @usewaypoint/block-heading @usewaypoint/block-html @usewaypoint/block-image @usewaypoint/block-spacer @usewaypoint/block-text @usewaypoint/document-core @usewaypoint/email-builder
```

## 基本使用

```tsx
import { EmailBuilder } from 'monto-email-builder';

function MyApp() {
  return <EmailBuilder />;
}
```

### 内嵌在容器中使用

组件支持内嵌在任意容器中，只需要给容器设置固定高度即可：

```tsx
import { EmailBuilder } from 'monto-email-builder';

function MyApp() {
  return (
    <div style={{ width: '100%', height: '800px' }}>
      <EmailBuilder />
    </div>
  );
}
```

或者使用 CSS：

```tsx
import { EmailBuilder } from 'monto-email-builder';

function MyApp() {
  return (
    <div className="email-builder-container">
      <EmailBuilder />
    </div>
  );
}
```

```css
.email-builder-container {
  width: 100%;
  height: 800px; /* 或使用其他高度值 */
}
```

## 完整示例

```tsx
import { EmailBuilder, TEditorConfiguration } from 'monto-email-builder';

function MyApp() {
  // 初始文档配置（可选）
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

  // 文档变化回调
  const handleChange = (document: TEditorConfiguration) => {
    console.log('Document changed:', document);
    // 可以将文档保存到服务器
    // saveToServer(document);
  };

  // 图片上传处理函数
  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data.url; // 返回图片 URL
  };

  return (
    <EmailBuilder
      initialDocument={initialDocument}
      initialLanguage="zh"
      imageUploadHandler={handleImageUpload}
      onChange={handleChange}
    />
  );
}
```

## API

### EmailBuilder Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `initialDocument` | `TEditorConfiguration \| undefined` | `undefined` | 初始化的邮件模板配置 JSON |
| `initialLanguage` | `'zh' \| 'en'` | `'en'` | 初始语言 |
| `imageUploadHandler` | `(file: File) => Promise<string> \| undefined` | `undefined` | 图片上传回调函数，接收 File 对象，返回 Promise<string>（图片 URL） |
| `onChange` | `(document: TEditorConfiguration) => void \| undefined` | `undefined` | 文档变化时的回调函数 |
| `theme` | `Theme \| undefined` | `undefined` | 自定义 Material-UI 主题 |

### 类型导出

```tsx
import type {
  EmailBuilderProps,
  TEditorConfiguration,
  TEditorBlock,
  Language,
} from 'monto-email-builder';
```

### Hook 导出

```tsx
import { useDocument, useLanguage } from 'monto-email-builder';

function MyComponent() {
  const document = useDocument(); // 获取当前文档
  const language = useLanguage(); // 获取当前语言
}
```

## 特性

- ✅ 可视化邮件模板编辑器
- ✅ 支持多种邮件块类型（文本、图片、按钮、容器等）
- ✅ 实时预览
- ✅ 导出 HTML 和 JSON
- ✅ 国际化支持（中文/英文）
- ✅ 图片上传支持
- ✅ 完全可定制

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build
```

## 许可证

MIT
