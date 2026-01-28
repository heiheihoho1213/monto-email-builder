# HtmlEditor 组件

一个独立的 HTML 编辑器组件，支持代码编辑和实时预览。

## 功能特性

- ✅ 左右栏布局：左侧代码编辑，右侧实时预览
- ✅ 多种显示模式：左右栏、仅代码、仅预览
- ✅ 设备模式切换：支持桌面视图和移动视图预览
- ✅ 实时预览：代码修改后自动更新预览（防抖 300ms）
- ✅ 代码高亮：使用 CodeMirror 提供语法高亮
- ✅ 完全独立：不依赖邮件编辑器，可单独使用

## 安装

```bash
npm install monto-email-builder
# 或
yarn add monto-email-builder
# 或
pnpm add monto-email-builder
```

## 基本使用

```tsx
import React, { useState } from 'react';
import { HtmlEditor } from 'monto-email-builder';

function App() {
  const [htmlCode, setHtmlCode] = useState('<p>Hello World</p>');

  return (
    <div style={{ height: '600px' }}>
      <HtmlEditor
        value={htmlCode}
        onChange={(value) => setHtmlCode(value)}
      />
    </div>
  );
}
```

## API

### HtmlEditorProps

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string` | 必填 | HTML 代码内容 |
| `onChange` | `(value: string) => void` | - | 代码变化回调 |
| `initialMode` | `'split' \| 'code' \| 'preview'` | `'split'` | 初始显示模式 |
| `initialDevice` | `'desktop' \| 'mobile'` | `'desktop'` | 初始设备模式 |
| `codeEditorHeight` | `string` | `'100%'` | 代码编辑器高度 |
| `previewHeight` | `string` | `'100%'` | 预览区域高度 |
| `sx` | `SxProps<Theme>` | - | 自定义样式 |
| `showToolbar` | `boolean` | `true` | 是否显示工具栏 |

### 显示模式

- `split`: 左右栏布局，同时显示代码和预览
- `code`: 仅显示代码编辑器
- `preview`: 仅显示预览

### 设备模式

- `desktop`: 桌面视图，全宽预览
- `mobile`: 移动视图，固定宽度 370px，带阴影效果

## 高级用法

### 自定义样式

```tsx
<HtmlEditor
  value={htmlCode}
  onChange={setHtmlCode}
  sx={{
    border: '1px solid #ccc',
    borderRadius: '8px',
  }}
/>
```

### 仅代码模式

```tsx
<HtmlEditor
  value={htmlCode}
  onChange={setHtmlCode}
  initialMode="code"
  codeEditorHeight="500px"
/>
```

### 仅预览模式

```tsx
<HtmlEditor
  value={htmlCode}
  onChange={setHtmlCode}
  initialMode="preview"
  initialDevice="mobile"
/>
```

### 隐藏工具栏

```tsx
<HtmlEditor
  value={htmlCode}
  onChange={setHtmlCode}
  showToolbar={false}
/>
```

## 依赖

组件依赖以下 peer dependencies：

- `react` >= 18.0.0
- `react-dom` >= 18.0.0
- `@mui/material` >= 5.15.0
- `@mui/icons-material` >= 5.15.0
- `@emotion/react` >= 11.11.0
- `@emotion/styled` >= 11.11.0

## 注意事项

1. 组件需要父容器有明确的高度才能正常显示
2. 代码变化会通过防抖（300ms）处理，避免频繁触发 onChange
3. 预览使用 `@usewaypoint/block-html` 组件渲染，确保 HTML 代码符合该组件的规范
