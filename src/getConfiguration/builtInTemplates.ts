/**
 * Built-in email templates listed in the sidebar. The first `FEATURED_BUILT_IN_COUNT`
 * are shown directly; the rest are available under "Show more".
 *
 * To add a template: register its loader in `getConfiguration/index.tsx`, then add an
 * entry here with one or more categories. To add a category, add it to
 * `TEMPLATE_CATEGORIES` (and its label in the locale files under `templateCategories`).
 */
export const FEATURED_BUILT_IN_COUNT = 5;

/** Category tabs in the "Show more" modal, in display order ("All" is always first). */
export const TEMPLATE_CATEGORIES = ['featured', 'layouts', 'ecommerce', 'marketing', 'transactional', 'onboarding', 'notifications'] as const;

export type TTemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export type TBuiltInTemplate = {
  sampleName: string;
  /** i18n key; falls back to `label` */
  labelKey?: string;
  label?: string;
  categories: TTemplateCategory[];
};

export const BUILT_IN_TEMPLATES: TBuiltInTemplate[] = [
  { sampleName: 'starter-coffee-menu', labelKey: 'starterTemplates.coffee-menu', categories: ['featured', 'marketing'] },
  { sampleName: 'starter-fashion-lookbook', labelKey: 'starterTemplates.fashion-lookbook', categories: ['featured', 'ecommerce', 'marketing'] },
  { sampleName: 'starter-sneaker-black-friday', labelKey: 'starterTemplates.sneaker-black-friday', categories: ['featured', 'ecommerce', 'marketing'] },
  { sampleName: 'starter-travel-deals', labelKey: 'starterTemplates.travel-deals', categories: ['featured', 'marketing'] },
  { sampleName: 'starter-restaurant-specials', labelKey: 'starterTemplates.restaurant-specials', categories: ['featured', 'marketing'] },
  { sampleName: 'starter-fitness-membership', labelKey: 'starterTemplates.fitness-membership', categories: ['featured', 'marketing'] },
  { sampleName: 'starter-real-estate-listings', labelKey: 'starterTemplates.real-estate-listings', categories: ['featured', 'marketing'] },
  { sampleName: 'starter-skincare-launch', labelKey: 'starterTemplates.skincare-launch', categories: ['featured', 'ecommerce', 'marketing'] },
  { sampleName: 'starter-saas-product-update', labelKey: 'starterTemplates.saas-product-update', categories: ['featured', 'notifications', 'marketing'] },
  { sampleName: 'starter-festival-tickets', labelKey: 'starterTemplates.festival-tickets', categories: ['featured', 'marketing'] },
  { sampleName: 'starter-welcome', labelKey: 'starterTemplates.welcome', categories: ['onboarding'] },
  { sampleName: 'starter-newsletter', labelKey: 'starterTemplates.newsletter', categories: ['marketing'] },
  { sampleName: 'starter-promotion', labelKey: 'starterTemplates.promotion', categories: ['ecommerce', 'marketing'] },
  { sampleName: 'starter-order-confirmation', labelKey: 'starterTemplates.order-confirmation', categories: ['ecommerce', 'transactional'] },
  { sampleName: 'starter-shipping-update', labelKey: 'starterTemplates.shipping-update', categories: ['ecommerce', 'transactional'] },
  { sampleName: 'starter-password-reset', labelKey: 'starterTemplates.password-reset', categories: ['transactional'] },
  { sampleName: 'starter-verification-code', labelKey: 'starterTemplates.verification-code', categories: ['transactional'] },
  { sampleName: 'starter-event-invitation', labelKey: 'starterTemplates.event-invitation', categories: ['marketing'] },
  { sampleName: 'starter-abandoned-cart', labelKey: 'starterTemplates.abandoned-cart', categories: ['ecommerce', 'marketing'] },
  { sampleName: 'starter-feedback-request', labelKey: 'starterTemplates.feedback-request', categories: ['notifications'] },
  { sampleName: 'starter-product-announcement', labelKey: 'starterTemplates.product-announcement', categories: ['marketing'] },
  { sampleName: 'starter-personal-letter', labelKey: 'starterTemplates.personal-letter', categories: ['layouts', 'onboarding'] },
  { sampleName: 'starter-zigzag-features', labelKey: 'starterTemplates.zigzag-features', categories: ['layouts', 'marketing'] },
  { sampleName: 'starter-product-grid', labelKey: 'starterTemplates.product-grid', categories: ['layouts', 'ecommerce'] },
  { sampleName: 'starter-blog-digest', labelKey: 'starterTemplates.blog-digest', categories: ['layouts', 'marketing'] },
  { sampleName: 'starter-split-hero', labelKey: 'starterTemplates.split-hero', categories: ['layouts', 'marketing'] },
  { sampleName: 'starter-stats-report', labelKey: 'starterTemplates.stats-report', categories: ['layouts', 'notifications'] },
  { sampleName: 'starter-magazine', labelKey: 'starterTemplates.magazine', categories: ['layouts', 'marketing'] },
  { sampleName: 'starter-webinar-agenda', labelKey: 'starterTemplates.webinar-agenda', categories: ['layouts', 'marketing'] },
  { sampleName: 'starter-testimonials', labelKey: 'starterTemplates.testimonials', categories: ['layouts', 'marketing'] },
  { sampleName: 'starter-holiday-greeting', labelKey: 'starterTemplates.holiday-greeting', categories: ['layouts', 'ecommerce', 'marketing'] },
];
