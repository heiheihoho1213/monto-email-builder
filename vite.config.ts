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
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'EmailBuilder',
          fileName: 'index',
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
            // 代码分割，将示例模板分离到单独的 chunk
            manualChunks: (id) => {
              if (id.includes('getConfiguration/sample/')) {
                return 'samples';
              }
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
    build: {
      outDir: resolve(__dirname, 'docs-dist'),
      emptyOutDir: true,
    },
  };
});
