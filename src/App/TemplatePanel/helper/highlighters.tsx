// 动态导入 highlight.js 和 prettier，减少初始包大小
let hljs: any;
let jsonHighlighter: any;
let xmlHighlighter: any;
let prettierFormat: any;
let prettierPluginHtml: any;

// 简单的 HTML 转义函数（fallback）
function escapeHtml(text: string): string {
  if (typeof document === 'undefined') {
    // SSR 环境，使用简单的字符串替换
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 加载 highlight.js CSS（如果还没有加载）
function loadHighlightJsCSS() {
  if (typeof document === 'undefined') return;

  // 检查是否已经加载了 highlight.js 的 CSS
  const existingLink = document.querySelector('link[data-highlight-js-css]');
  if (existingLink) return;

  try {
    // 尝试加载 highlight.js 的默认 CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css';
    link.setAttribute('data-highlight-js-css', 'true');
    document.head.appendChild(link);
  } catch (error) {
    console.warn('Failed to load highlight.js CSS:', error);
  }
}

async function loadHighlightJs() {
  if (!hljs) {
    try {
      const hljsModule = await import('highlight.js');
      // highlight.js 可能是 default 导出或命名导出
      hljs = hljsModule.default || hljsModule;

      jsonHighlighter = await import('highlight.js/lib/languages/json');
      xmlHighlighter = await import('highlight.js/lib/languages/xml');

      // 注册语言，处理不同的导出方式
      const jsonLang = jsonHighlighter.default || jsonHighlighter;
      const xmlLang = xmlHighlighter.default || xmlHighlighter;

      hljs.registerLanguage('json', jsonLang);
      hljs.registerLanguage('html', xmlLang);

      // 加载 CSS
      loadHighlightJsCSS();
    } catch (error) {
      console.error('Failed to load highlight.js. Please ensure highlight.js is installed:', error);
      // 创建一个简单的 fallback 对象，避免后续调用失败
      hljs = {
        highlight: (code: string) => ({ value: escapeHtml(code) }),
      };
    }
  }
  return hljs;
}

// 使用 Function 动态构建导入路径，完全避免构建工具静态分析
function dynamicImport(path: string): Promise<any> {
  // 使用 Function 构造函数避免构建工具静态分析
  const importFunc = new Function('path', 'return import(path)');
  return importFunc(path);
}

async function loadPrettier() {
  if (!prettierFormat) {
    try {
      // 先导入 prettier 主包
      const prettierMain = await import('prettier');

      // 检查 prettier 版本
      const prettierVersion = prettierMain.version || '2.0.0';
      const majorVersion = parseInt(prettierVersion.split('.')[0], 10);

      // prettier v2 直接使用主包，插件已内置
      if (majorVersion < 3) {
        prettierFormat = prettierMain.format;
        prettierPluginHtml = null;
        return prettierFormat;
      }

      // prettier v3+ 尝试使用 standalone 和插件
      // 注意：v3 的 standalone 是可选的，如果不存在则使用主包
      try {
        const prettierStandalone = await dynamicImport('prettier/standalone');
        prettierFormat = prettierStandalone.format;

        // prettier v3 需要显式导入 HTML parser
        try {
          prettierPluginHtml = await dynamicImport('prettier/parser-html');
        } catch {
          try {
            prettierPluginHtml = await dynamicImport('prettier/plugins/html');
          } catch {
            // 如果 parser 导入失败，仍然可以使用 standalone（JSON parser 是内置的）
            prettierPluginHtml = null;
          }
        }
      } catch {
        // 如果 standalone 不存在或导入失败，使用主包（这是正常的回退行为，不需要警告）
        prettierFormat = prettierMain.format;
        prettierPluginHtml = null;
      }
    } catch (error) {
      console.warn('Failed to load prettier. Please ensure prettier@^2.7.1 or prettier@^3.0.0 is installed:', error);
      throw new Error('Prettier is not available. Please install prettier@^2.7.1 or prettier@^3.0.0');
    }
  }
  return prettierFormat;
}

export async function html(value: string): Promise<string> {
  let hljsInstance: any;
  let format: any;

  try {
    [hljsInstance, format] = await Promise.all([loadHighlightJs(), loadPrettier()]);
  } catch (error) {
    console.error('Failed to load highlight.js or prettier:', error);
    // 如果加载失败，返回转义的 HTML
    return escapeHtml(value);
  }

  // 基础格式化选项
  const formatOptions: any = {
    parser: 'html',
    printWidth: 120,
    tabWidth: 2,
    useTabs: false,
    htmlWhitespaceSensitivity: 'ignore', // 忽略HTML空白敏感度，避免不必要的缩进
    bracketSameLine: false, // 确保开始和结束标签在不同行，便于对齐
  };

  // 如果使用 prettier v3 standalone，需要显式添加 html parser
  if (prettierPluginHtml) {
    const htmlParser = prettierPluginHtml.default || prettierPluginHtml;
    formatOptions.plugins = [htmlParser];
  }

  // 辅助函数：移除所有行的前导缩进（如果根元素有缩进）
  const removeLeadingIndent = (text: string): string => {
    const lines = text.split('\n');
    if (lines.length === 0) return text;

    // 找到第一行非空行
    const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
    if (!firstNonEmptyLine) return text;

    // 检查第一行是否是DOCTYPE或html标签
    const trimmedFirstLine = firstNonEmptyLine.trim();
    const isRootTag = trimmedFirstLine.startsWith('<!DOCTYPE') || trimmedFirstLine.startsWith('<html');

    if (isRootTag) {
      // 计算第一行的前导空格数
      const leadingSpaces = firstNonEmptyLine.length - firstNonEmptyLine.trimStart().length;

      // 如果根标签有缩进，移除所有行的相同缩进
      if (leadingSpaces > 0) {
        return lines.map(line => {
          if (line.trim().length === 0) return line;
          const currentLeading = line.length - line.trimStart().length;
          // 移除前导缩进，但保持相对缩进
          if (currentLeading >= leadingSpaces) {
            return line.substring(leadingSpaces);
          }
          // 如果当前行的缩进小于根缩进，保持原样（不应该发生，但安全起见）
          return line;
        }).join('\n');
      }
    }

    return text;
  };

  // 辅助函数：修复开始标签和结束标签的对齐
  const fixTagAlignment = (text: string): string => {
    const lines = text.split('\n');
    const stack: Array<{ tag: string; indent: number }> = [];
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        result.push(line);
        continue;
      }

      const currentIndent = line.length - line.trimStart().length;
      const isClosingTag = trimmed.startsWith('</');
      const isSelfClosing = trimmed.endsWith('/>');
      const isOpeningTag = trimmed.startsWith('<') && !isClosingTag && !isSelfClosing;

      if (isClosingTag) {
        // 查找匹配的开始标签
        const tagName = trimmed.match(/<\/(\w+)/)?.[1];
        if (tagName && stack.length > 0) {
          const opening = stack[stack.length - 1];
          if (opening.tag === tagName) {
            // 确保结束标签与开始标签有相同的缩进
            const correctIndent = opening.indent;
            result.push(' '.repeat(correctIndent) + trimmed);
            stack.pop();
            continue;
          }
        }
        // 如果没有找到匹配的开始标签，使用当前缩进
        result.push(line);
      } else if (isOpeningTag) {
        // 记录开始标签的缩进和标签名
        const tagName = trimmed.match(/<(\w+)/)?.[1];
        if (tagName) {
          stack.push({ tag: tagName, indent: currentIndent });
        }
        result.push(line);
      } else {
        result.push(line);
      }
    }

    return result.join('\n');
  };

  let prettyValue: string;
  try {
    // 尝试使用已加载的 format 函数
    prettyValue = await format(value, formatOptions);
    // 确保格式化后的值不是 undefined 或 null
    if (!prettyValue || typeof prettyValue !== 'string') {
      throw new Error('Prettier returned invalid value');
    }
    // 移除多余的根级缩进
    prettyValue = removeLeadingIndent(prettyValue);
    // 修复开始和结束标签的对齐
    prettyValue = fixTagAlignment(prettyValue);
  } catch (error) {
    // 如果格式化失败，尝试重新导入主包并使用主包的 format
    try {
      const prettierMain = await import('prettier');
      const mainFormatOptions: any = {
        parser: 'html',
        printWidth: 120,
        tabWidth: 2,
        useTabs: false,
        htmlWhitespaceSensitivity: 'ignore',
        bracketSameLine: false, // 确保开始和结束标签在不同行，便于对齐
      };

      // 使用主包的 format 函数
      prettyValue = await prettierMain.format(value, mainFormatOptions);

      if (!prettyValue || typeof prettyValue !== 'string') {
        throw new Error('Prettier main package returned invalid value');
      }
      // 移除多余的根级缩进
      prettyValue = removeLeadingIndent(prettyValue);
      // 修复开始和结束标签的对齐
      prettyValue = fixTagAlignment(prettyValue);
    } catch (fallbackError) {
      // 如果 prettier 都失败，尝试简单的 HTML 美化作为最后的回退
      try {
        // 简单的 HTML 格式化：在标签之间添加换行和缩进
        let formatted = value
          .replace(/></g, '>\n<') // 在标签之间添加换行
          .replace(/\n\s*\n/g, '\n') // 移除多余的空行
          .split('\n');

        let indent = 0;
        const indentSize = 2;
        const result: string[] = [];

        for (let i = 0; i < formatted.length; i++) {
          const line = formatted[i];
          const trimmed = line.trim();
          if (!trimmed) {
            result.push('');
            continue;
          }

          // 判断标签类型
          const isClosingTag = trimmed.startsWith('</');
          const isSelfClosing = trimmed.endsWith('/>');
          const isOpeningTag = trimmed.startsWith('<') && !isClosingTag && !isSelfClosing;

          if (isClosingTag) {
            // 对于闭合标签，先减少缩进（回到开始标签的缩进级别），然后应用缩进
            indent = Math.max(0, indent - indentSize);
            result.push(' '.repeat(indent) + trimmed);
          } else if (isOpeningTag) {
            // 对于开始标签，先应用当前缩进，然后增加缩进（用于子元素）
            result.push(' '.repeat(indent) + trimmed);
            indent += indentSize;
          } else if (isSelfClosing) {
            // 对于自闭合标签，应用当前缩进，不改变缩进级别
            result.push(' '.repeat(indent) + trimmed);
          } else {
            // 对于文本内容，应用当前缩进
            result.push(' '.repeat(indent) + trimmed);
          }
        }

        prettyValue = result.filter(line => line.length > 0).join('\n');
      } catch {
        // 如果都失败，返回原始值
        console.warn('Failed to format HTML, returning original value:', error);
        prettyValue = value;
      }
    }
  }

  try {
    return hljsInstance.highlight(prettyValue, { language: 'html' }).value;
  } catch (error) {
    console.error('Failed to highlight HTML:', error);
    // 如果高亮失败，返回转义的 HTML
    return escapeHtml(prettyValue);
  }
}

export async function json(value: string): Promise<string> {
  let hljsInstance: any;
  let format: any;

  try {
    [hljsInstance, format] = await Promise.all([loadHighlightJs(), loadPrettier()]);
  } catch (error) {
    console.error('Failed to load highlight.js or prettier:', error);
    // 如果加载失败，返回转义的 JSON
    return escapeHtml(value);
  }

  const formatOptions: any = {
    parser: 'json',
    // 移除 printWidth: 0，使用默认值或设置一个合理的值
    // trailingComma: 'all' 在 JSON 中可能不支持，移除
  };

  // prettier v3 standalone 中 JSON parser 是内置的，不需要插件
  // prettier v2 也不需要插件
  // 所以这里不需要添加任何插件

  let prettyValue: string;
  try {
    // 先尝试格式化
    prettyValue = await format(value, formatOptions);
  } catch (error) {
    // 如果格式化失败，尝试使用主包
    try {
      const prettierMain = await import('prettier');
      prettyValue = await prettierMain.format(value, {
        parser: 'json',
      });
    } catch (fallbackError) {
      // 如果都失败，尝试直接解析和格式化 JSON
      try {
        const parsed = JSON.parse(value);
        prettyValue = JSON.stringify(parsed, null, 2);
      } catch {
        // 如果都失败，返回原始值
        console.warn('Failed to format JSON, returning original value:', error);
        prettyValue = value;
      }
    }
  }

  // 确保 prettyValue 是字符串
  if (typeof prettyValue !== 'string') {
    prettyValue = JSON.stringify(prettyValue, null, 2);
  }

  try {
    return hljsInstance.highlight(prettyValue, { language: 'json' }).value;
  } catch (error) {
    console.error('Failed to highlight JSON:', error);
    // 如果高亮失败，返回转义的 JSON
    return escapeHtml(prettyValue);
  }
}
