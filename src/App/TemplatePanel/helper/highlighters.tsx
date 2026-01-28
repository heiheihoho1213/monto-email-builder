import React from 'react';

// 动态导入 react-syntax-highlighter（避免 SSR 问题）
let SyntaxHighlighter: any = null;
let jsonLang: any = null;
let xmlLang: any = null;
let githubStyle: any = null;
let languagesRegistered = false;
let isLoading = false;

async function loadSyntaxHighlighter() {
  if (SyntaxHighlighter || isLoading) {
    return;
  }

  // 只在客户端加载
  if (typeof window === 'undefined') {
    return;
  }

  isLoading = true;
  try {
    const module = await import('react-syntax-highlighter') as any;
    SyntaxHighlighter = module.Light;

    const jsonLangModule = await import('react-syntax-highlighter/dist/esm/languages/hljs/json') as any;
    jsonLang = jsonLangModule.default || jsonLangModule;

    const xmlLangModule = await import('react-syntax-highlighter/dist/esm/languages/hljs/xml') as any;
    xmlLang = xmlLangModule.default || xmlLangModule;

    const styleModule = await import('react-syntax-highlighter/dist/esm/styles/hljs/github') as any;
    githubStyle = styleModule.default || styleModule;

    // 注册语言
    if (SyntaxHighlighter?.registerLanguage) {
      if (jsonLang) {
        SyntaxHighlighter.registerLanguage('json', jsonLang);
      }
      if (xmlLang) {
        SyntaxHighlighter.registerLanguage('html', xmlLang);
      }
      languagesRegistered = true;
    }
  } catch {
    // Failed to load syntax highlighter
  } finally {
    isLoading = false;
  }
}

// 预加载（在客户端）
if (typeof window !== 'undefined') {
  loadSyntaxHighlighter();
}

// 辅助函数：移除所有行的前导缩进（如果根元素有缩进）
const removeLeadingIndent = (text: string): string => {
  const lines = text.split('\n');
  if (lines.length === 0) return text;

  const firstNonEmptyLine = lines.find(line => line.trim().length > 0);
  if (!firstNonEmptyLine) return text;

  const trimmedFirstLine = firstNonEmptyLine.trim();
  const isRootTag = trimmedFirstLine.startsWith('<!DOCTYPE') || trimmedFirstLine.startsWith('<html');

  if (isRootTag) {
    const leadingSpaces = firstNonEmptyLine.length - firstNonEmptyLine.trimStart().length;

    if (leadingSpaces > 0) {
      return lines.map(line => {
        if (line.trim().length === 0) return line;
        const currentLeading = line.length - line.trimStart().length;
        if (currentLeading >= leadingSpaces) {
          return line.substring(leadingSpaces);
        }
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
      const tagName = trimmed.match(/<\/(\w+)/)?.[1];
      if (tagName && stack.length > 0) {
        const opening = stack[stack.length - 1];
        if (opening.tag === tagName) {
          const correctIndent = opening.indent;
          result.push(' '.repeat(correctIndent) + trimmed);
          stack.pop();
          continue;
        }
      }
      result.push(line);
    } else if (isOpeningTag) {
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

// 纯 JS 实现的 HTML 格式化
function formatHtml(value: string): string {
  try {
    // 如果已经是格式化的，直接返回
    if (value.includes('\n') && value.trim().length > 0) {
      // 移除多余的根级缩进
      let formatted = removeLeadingIndent(value);
      // 修复开始和结束标签的对齐
      formatted = fixTagAlignment(formatted);
      return formatted;
    }

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

    const prettyValue = result.filter(line => line.length > 0).join('\n');
    // 移除多余的根级缩进
    return removeLeadingIndent(prettyValue);
  } catch {
    return value;
  }
}

// 纯 JS 实现的 JSON 格式化
function formatJson(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export async function html(value: string): Promise<React.ReactElement> {
  await loadSyntaxHighlighter();
  const formattedValue = formatHtml(value);

  if (!SyntaxHighlighter || !githubStyle) {
    // Fallback: 如果 SyntaxHighlighter 未加载，返回简单的 pre 标签
    return (
      <pre style={{ margin: 0, padding: 16, whiteSpace: 'pre-wrap' }}>
        {formattedValue}
      </pre>
    );
  }

  return (
    <SyntaxHighlighter
      language="html"
      style={githubStyle}
      customStyle={{
        margin: 0,
        padding: 16,
      }}
    >
      {formattedValue}
    </SyntaxHighlighter>
  );
}

export async function json(value: string): Promise<React.ReactElement> {
  await loadSyntaxHighlighter();
  const formattedValue = formatJson(value);

  if (!SyntaxHighlighter || !githubStyle) {
    // Fallback: 如果 SyntaxHighlighter 未加载，返回简单的 pre 标签
    return (
      <pre style={{ margin: 0, padding: 16, whiteSpace: 'pre-wrap' }}>
        {formattedValue}
      </pre>
    );
  }

  return (
    <SyntaxHighlighter
      language="json"
      style={githubStyle}
      customStyle={{
        margin: 0,
        padding: 16,
      }}
    >
      {formattedValue}
    </SyntaxHighlighter>
  );
}
