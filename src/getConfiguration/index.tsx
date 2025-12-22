import EMPTY_EMAIL_MESSAGE from './sample/empty-email-message';

// 示例模板改为动态导入，减少初始包大小
// 只在需要时才加载，避免打包时包含所有示例数据
const sampleTemplates: Record<string, () => Promise<any>> = {
  welcome: () => import('./sample/welcome').then(m => m.default),
  'one-time-password': () => import('./sample/one-time-passcode').then(m => m.default),
  'order-ecomerce': () => import('./sample/order-ecommerce').then(m => m.default),
  'post-metrics-report': () => import('./sample/post-metrics-report').then(m => m.default),
  'reservation-reminder': () => import('./sample/reservation-reminder').then(m => m.default),
  'reset-password': () => import('./sample/reset-password').then(m => m.default),
  'respond-to-message': () => import('./sample/respond-to-message').then(m => m.default),
  'subscription-receipt': () => import('./sample/subscription-receipt').then(m => m.default),
  'basic-template': () => import('./sample/basic-template').then(m => m.default),
};

// 缓存已加载的模板
const templateCache: Record<string, any> = {};

export default function getConfiguration(template: string): any {
  // 同步版本：只处理空模板、code 模板和 json 模板
  // 示例模板需要异步加载，但为了兼容性，这里返回空模板
  if (template.startsWith('#sample/')) {
    // 返回空模板，实际加载由调用方处理
    return EMPTY_EMAIL_MESSAGE;
  }

  // 支持 #code/ 格式：base64 编码的 JSON（用于分享）
  if (template.startsWith('#code/')) {
    const encodedString = template.replace('#code/', '');
    try {
      const configurationString = decodeURIComponent(atob(encodedString));
      return JSON.parse(configurationString);
    } catch (error) {
      console.error(`Couldn't load configuration from hash (code format):`, error);
      return EMPTY_EMAIL_MESSAGE;
    }
  }

  // 支持 #json/ 格式：URL 编码的 JSON 字符串（更友好的方式）
  if (template.startsWith('#json/')) {
    const encodedString = template.replace('#json/', '');
    try {
      const configurationString = decodeURIComponent(encodedString);
      return JSON.parse(configurationString);
    } catch (error) {
      console.error(`Couldn't load configuration from hash (json format):`, error);
      return EMPTY_EMAIL_MESSAGE;
    }
  }

  return EMPTY_EMAIL_MESSAGE;
}

// 异步加载示例模板
export async function loadSampleTemplate(sampleName: string): Promise<any> {
  const loader = sampleTemplates[sampleName];
  if (!loader) {
    return EMPTY_EMAIL_MESSAGE;
  }
  
  // 如果已缓存，直接返回
  if (templateCache[sampleName]) {
    return templateCache[sampleName];
  }
  
  // 动态加载模板
  const template = await loader();
  templateCache[sampleName] = template;
  return template;
}

/**
 * 将 JSON 配置转换为 hash URL
 * @param config - 邮件模板配置 JSON
 * @param format - 编码格式：'json' (URL 编码) 或 'code' (base64 编码，更短但需要编码)
 * @returns hash URL，例如: #json/... 或 #code/...
 */
export function configToHash(config: any, format: 'json' | 'code' = 'json'): string {
  const jsonString = JSON.stringify(config);
  
  if (format === 'code') {
    // base64 编码（更短，但需要编码）
    const encoded = btoa(encodeURIComponent(jsonString));
    return `#code/${encoded}`;
  } else {
    // URL 编码（更友好，可以直接在浏览器地址栏看到）
    const encoded = encodeURIComponent(jsonString);
    return `#json/${encoded}`;
  }
}
