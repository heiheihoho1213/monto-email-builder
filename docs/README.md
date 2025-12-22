# 开发预览项目

这个文件夹包含用于本地开发和预览的代码，不会被打包到 npm 库中。

## 文件说明

- `main.tsx` - 开发预览的入口文件
- `index.html` - 开发预览的 HTML 文件
- `favicon/` - 网站图标

## 运行开发服务器

```bash
npm run dev
```

## 构建预览版本

```bash
npm run build
```

构建输出会在 `docs-dist` 文件夹中。

## 注意

- 这个文件夹中的代码不会被打包到 npm 库中
- 库代码在 `src/` 文件夹中
- 库构建使用 `npm run build:lib` 命令

