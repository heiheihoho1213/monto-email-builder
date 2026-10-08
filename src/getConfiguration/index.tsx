import EMPTY_EMAIL_MESSAGE from './sample/empty-email-message';

// 示例模板改为动态导入，减少初始包大小
// 只在需要时才加载，避免打包时包含所有示例数据
const sampleTemplates: Record<string, () => Promise<any>> = {
  // 带预设页眉/页脚的入门模板
  'starter-welcome': () => import('./starterTemplates').then(m => m.buildStarterTemplate('welcome')),
  'starter-newsletter': () => import('./starterTemplates').then(m => m.buildStarterTemplate('newsletter')),
  'starter-promotion': () => import('./starterTemplates').then(m => m.buildStarterTemplate('promotion')),
  'starter-order-confirmation': () => import('./starterTemplates').then(m => m.buildStarterTemplate('order-confirmation')),
  'starter-shipping-update': () => import('./starterTemplates').then(m => m.buildStarterTemplate('shipping-update')),
  'starter-password-reset': () => import('./starterTemplates').then(m => m.buildStarterTemplate('password-reset')),
  'starter-verification-code': () => import('./starterTemplates').then(m => m.buildStarterTemplate('verification-code')),
  'starter-event-invitation': () => import('./starterTemplates').then(m => m.buildStarterTemplate('event-invitation')),
  'starter-abandoned-cart': () => import('./starterTemplates').then(m => m.buildStarterTemplate('abandoned-cart')),
  'starter-feedback-request': () => import('./starterTemplates').then(m => m.buildStarterTemplate('feedback-request')),
  'starter-product-announcement': () => import('./starterTemplates').then(m => m.buildStarterTemplate('product-announcement')),
  'starter-personal-letter': () => import('./starterTemplates').then(m => m.buildStarterTemplate('personal-letter')),
  'starter-zigzag-features': () => import('./starterTemplates').then(m => m.buildStarterTemplate('zigzag-features')),
  'starter-product-grid': () => import('./starterTemplates').then(m => m.buildStarterTemplate('product-grid')),
  'starter-blog-digest': () => import('./starterTemplates').then(m => m.buildStarterTemplate('blog-digest')),
  'starter-split-hero': () => import('./starterTemplates').then(m => m.buildStarterTemplate('split-hero')),
  'starter-stats-report': () => import('./starterTemplates').then(m => m.buildStarterTemplate('stats-report')),
  'starter-magazine': () => import('./starterTemplates').then(m => m.buildStarterTemplate('magazine')),
  'starter-webinar-agenda': () => import('./starterTemplates').then(m => m.buildStarterTemplate('webinar-agenda')),
  'starter-testimonials': () => import('./starterTemplates').then(m => m.buildStarterTemplate('testimonials')),
  'starter-holiday-greeting': () => import('./starterTemplates').then(m => m.buildStarterTemplate('holiday-greeting')),
  'starter-coffee-menu': () => import('./starterTemplates').then(m => m.buildStarterTemplate('coffee-menu')),
  'starter-fashion-lookbook': () => import('./starterTemplates').then(m => m.buildStarterTemplate('fashion-lookbook')),
  'starter-sneaker-black-friday': () => import('./starterTemplates').then(m => m.buildStarterTemplate('sneaker-black-friday')),
  'starter-travel-deals': () => import('./starterTemplates').then(m => m.buildStarterTemplate('travel-deals')),
  'starter-restaurant-specials': () => import('./starterTemplates').then(m => m.buildStarterTemplate('restaurant-specials')),
  'starter-fitness-membership': () => import('./starterTemplates').then(m => m.buildStarterTemplate('fitness-membership')),
  'starter-real-estate-listings': () => import('./starterTemplates').then(m => m.buildStarterTemplate('real-estate-listings')),
  'starter-skincare-launch': () => import('./starterTemplates').then(m => m.buildStarterTemplate('skincare-launch')),
  'starter-saas-product-update': () => import('./starterTemplates').then(m => m.buildStarterTemplate('saas-product-update')),
  'starter-festival-tickets': () => import('./starterTemplates').then(m => m.buildStarterTemplate('festival-tickets')),
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
    } catch {
      return EMPTY_EMAIL_MESSAGE;
    }
  }

  // 支持 #json/ 格式：URL 编码的 JSON 字符串（更友好的方式）
  if (template.startsWith('#json/')) {
    const encodedString = template.replace('#json/', '');
    try {
      const configurationString = decodeURIComponent(encodedString);
      return JSON.parse(configurationString);
    } catch {
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
