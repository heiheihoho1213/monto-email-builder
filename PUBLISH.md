# 发布到 npm 指南

## 发布前检查清单

- [x] ✅ package.json 配置完整（name, version, description, keywords, author, license）
- [x] ✅ 添加了 peerDependencies（react, react-dom）
- [x] ✅ 创建了 .npmignore 文件
- [x] ✅ TypeScript 配置支持生成类型定义文件
- [x] ✅ 构建配置正确（vite.config.ts）
- [x] ✅ README.md 文档完整
- [x] ✅ LICENSE 文件存在

## 发布步骤

### 1. 构建库

```bash
npm run build:lib
```

这会：
- 运行 TypeScript 编译器生成类型定义文件（.d.ts）
- 使用 Vite 构建库模式，生成 dist/index.js

### 2. 检查构建产物

确保 `dist/` 目录包含：
- `index.js` - 构建后的 JavaScript 文件
- `index.d.ts` - TypeScript 类型定义文件
- `index.d.ts.map` - 类型定义映射文件（如果有）

### 3. 测试本地安装（可选）

在发布前，可以测试本地安装：

```bash
# 在项目根目录
npm pack

# 这会生成一个 .tgz 文件，可以在其他项目中测试安装
# 在测试项目中：
npm install /path/to/monto-email-builder-1.0.0.tgz
```

### 4. 登录 npm

```bash
npm login
```

输入你的 npm 账号信息。

### 5. 检查包名是否可用

确保包名 `monto-email-builder` 在 npm 上可用。如果已被占用，需要修改 `package.json` 中的 `name` 字段。

### 6. 发布到 npm

```bash
# 发布公开包
npm publish --access public

# 或者如果是私有包
npm publish
```

### 7. 验证发布

发布后，可以在 npm 网站上查看：
https://www.npmjs.com/package/monto-email-builder

## 更新版本

当需要发布新版本时：

```bash
# 更新版本号（会自动更新 package.json）
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0

# 然后重新构建和发布
npm run build:lib
npm publish --access public
```

## 注意事项

1. **包名唯一性**：确保 `monto-email-builder` 在 npm 上可用，如果被占用需要改名
2. **版本号**：遵循语义化版本控制（Semantic Versioning）
3. **依赖管理**：
   - `dependencies`：运行时需要的依赖
   - `peerDependencies`：需要用户自己安装的依赖（如 react, react-dom）
   - `devDependencies`：开发时需要的依赖，不会被打包
4. **文件大小**：确保只包含必要的文件，使用 `.npmignore` 排除不需要的文件
5. **类型定义**：确保 TypeScript 配置正确生成 `.d.ts` 文件

## 常见问题

### Q: 如何撤销已发布的版本？

```bash
# 撤销最后一个版本（24小时内）
npm unpublish monto-email-builder@1.0.0

# 注意：npm 不允许删除已发布超过 72 小时的包
```

### Q: 如何发布 beta 版本？

```bash
npm version 1.0.1-beta.1
npm publish --tag beta
```

### Q: 如何发布到私有 registry？

```bash
npm publish --registry=https://your-registry.com
```

## 发布后

发布成功后，用户可以通过以下方式安装：

```bash
npm install monto-email-builder
```

然后在代码中使用：

```tsx
import { EmailBuilder } from 'monto-email-builder';
```

