import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import react from '@vitejs/plugin-react-swc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const isLibrary = mode === 'library';

  if (isLibrary) {
    // 库模式配置 - 只构建库代码，不包含开发预览代码
    return {
      plugins: [react()],
      build: {
        lib: {
          entry: {
            index: resolve(__dirname, 'src/index.ts'),
            'html-editor': resolve(__dirname, 'src/html-editor.ts'),
          },
          name: 'EmailBuilder',
          formats: ['es'],
        },
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
        },
        // 启用代码分割（lib 模式下需要明确启用）
        cssCodeSplit: true,
        // 设置 chunk 大小警告限制（KB）
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          external: (id) => {
            // 明确列出需要外部化的依赖（优先匹配）
            const explicitExternals = [
              'react',
              'react-dom',
              '@mui/material',
              '@mui/icons-material',
              '@emotion/react',
              '@emotion/styled',
              'react-syntax-highlighter',
            ];

            // 检查是否匹配明确列出的依赖
            if (explicitExternals.some(dep => id === dep || id.startsWith(`${dep}/`))) {
              return true;
            }

            // 外部化所有 node_modules 中的依赖（但排除明确列出的）
            if (!id.startsWith('.') && !id.startsWith('/') && !id.includes('src/')) {
              return true;
            }

            return false;
          },
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
            },
            // 代码分割策略：将不同模块分离到独立的 chunk，减小单文件大小
            manualChunks: (id) => {
              // 优先处理大型第三方依赖

              // 1. CodeMirror 相关依赖分离（体积较大，仅在 HtmlEditor 中使用）
              if (
                id.includes('@uiw/react-codemirror') ||
                id.includes('@codemirror/') ||
                id.includes('@uiw/codemirror-themes-all')
              ) {
                return 'codemirror';
              }

              // 2. 示例模板分离（按需加载）
              if (id.includes('getConfiguration/sample/')) {
                return 'samples';
              }

              // 3. 各个 block 组件分离（按需加载，减小初始包大小）
              if (id.includes('documents/blocks/')) {
                // 提取 block 名称，每个 block 独立 chunk
                const blockMatch = id.match(/blocks\/([^/]+)\//);
                if (blockMatch) {
                  const blockName = blockMatch[1].toLowerCase();
                  // 将相似的 block 合并，避免过度分割
                  if (['button', 'image', 'text', 'heading', 'spacer', 'divider'].includes(blockName)) {
                    return `blocks-basic`;
                  }
                  if (['container', 'columnscontainer', 'emaillayout'].includes(blockName)) {
                    return `blocks-layout`;
                  }
                  return `block-${blockName}`;
                }
                return 'blocks-common';
              }

              // 4. 配置面板分离（按需加载）
              if (id.includes('App/InspectorDrawer/ConfigurationPanel/')) {
                return 'inspector-panel';
              }

              // 5. 模板面板分离（按需加载）
              if (id.includes('App/TemplatePanel/')) {
                return 'template-panel';
              }

              // 6. 其他 App 组件（UI 组件）
              if (id.includes('App/')) {
                return 'app-components';
              }

              // 7. 编辑器核心逻辑（较小，可以保留在主包中）
              // 注意：editor-core 不分离，保持核心功能在主包

              // 8. 工具函数和辅助模块
              if (id.includes('documents/editor/helpers/') || id.includes('helpers/')) {
                return 'editor-helpers';
              }
            },
            // 设置 chunk 文件命名格式
            chunkFileNames: (chunkInfo) => {
              // 为不同的 chunk 设置不同的命名规则
              const facadeModuleId = chunkInfo.facadeModuleId
                ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.[^/.]+$/, '')
                : 'chunk';
              return `chunks/${facadeModuleId || 'chunk'}-[hash].js`;
            },
            // 设置入口文件命名格式
            entryFileNames: (chunkInfo) => {
              // 主入口保持 index.js，html-editor 入口使用 html-editor.js
              if (chunkInfo.name === 'html-editor') {
                return 'html-editor.js';
              }
              return 'index.js';
            },
          },
        },
      },
    };
  }

  // 开发/预览模式配置 - 使用 docs 文件夹作为开发预览
  return {
    plugins: [react()],
    root: resolve(__dirname, 'docs'),
    // 支持通过环境变量设置 base 路径（用于 GitHub Pages）
    base: process.env.VITE_BASE_PATH || '/',
    resolve: {
      alias: {
        // 使用本地源码进行调试
        // 'monto-email-core': resolve(__dirname, 'monto-email-core/src'),
        // 'monto-email-block-html': resolve(__dirname, 'block-html/src'),
        // 'monto-email-block-columns-container': resolve(__dirname, 'block-columns-container/src'),
      },
    },
    build: {
      outDir: resolve(__dirname, 'docs-dist'),
      emptyOutDir: true,
    },
  };
});
