import type { TEditorBlock, TEditorConfiguration } from '../documents/editor/core';
import { FOOTER_BLOCK_ID, HEADER_BLOCK_ID } from '../documents/editor/headerFooter';
import { FOOTER_TEMPLATES, HEADER_TEMPLATES, TSlotTemplate, flattenTemplate } from '../documents/editor/headerFooterTemplates';
import {
  TPadding,
  TTemplateNode,
  button,
  columns,
  container,
  divider,
  heading,
  html,
  image,
  link,
  p,
  pad,
  text,
} from '../documents/editor/templateBuilders';

/**
 * Starter email templates: a predefined header + body + predefined footer.
 * The header and footer use the shared header/footer library, so they land in the
 * locked header/footer slots and can be changed from the Header / Footer Templates panel.
 */

type TStarterTemplate = {
  header: string;
  footer: string;
  backdropColor?: string;
  /** Brand name shown in the header/footer logo and legal text instead of "Your Company" */
  brand?: string;
  /** Hex colour replacements applied to the header/footer, e.g. { '4F46E5': 'BE185D' } */
  recolor?: Record<string, string>;
  /** Exact text replacements applied to the header/footer copy */
  replaceText?: Record<string, string>;
  body: TTemplateNode[];
};

// ==================== Body helpers ====================

const placeholder = (w: number, h: number, bg: string, fg: string, label: string) =>
  `https://placehold.co/${w}x${h}/${bg}/${fg}/png?text=${encodeURIComponent(label)}&font=montserrat`;

/** Unsplash photo (free to use), cropped to the given display size at 2x for retina screens */
const photoUrl = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w * 2}&h=${h * 2}&fit=crop&crop=entropy&q=80&auto=format`;

function photo(id: string, w: number, h: number, alt: string, padding: TPadding = pad(0, 0, 0)): TTemplateNode {
  return image(photoUrl(id, w, h), { padding, width: w, alt });
}

const hero = (label: string, bg = 'EEF2FF', fg = '4F46E5', padding: TPadding = pad(0, 0, 0)) =>
  image(placeholder(600, 280, bg, fg, label), { padding, width: 600, alt: label });

const title = (value: string, top = 32, align: 'left' | 'center' = 'center') =>
  heading(value, { color: '#111827', textAlign: align, fontWeight: 'bold', padding: pad(top, 8, 32) }, 'h1');

const subtitle = (value: string, align: 'left' | 'center' = 'center') =>
  heading(value, { color: '#111827', textAlign: align, fontWeight: 'bold', padding: pad(16, 4, 32) }, 'h3');

const body = (value: string, align: 'left' | 'center' = 'left', bottom = 16) =>
  text(value, { color: '#4B5563', fontSize: 15, lineHeight: 1.6, textAlign: align, padding: pad(0, bottom, 32) });

const cta = (label: string, bg = '#4F46E5', top = 8, bottom = 32) =>
  button(label, { bg, color: '#FFFFFF', padding: pad(top, bottom, 32), style: 'rounded', size: 'large' });

const small = (value: string, align: 'left' | 'center' = 'center') =>
  text(value, { color: '#9CA3AF', fontSize: 12, textAlign: align, padding: pad(0, 24, 32) });

const spacer = (height: number): TTemplateNode => ({ type: 'Spacer', data: { props: { height } } });

/** A product row: image | name + meta | price */
function productRow(name: string, meta: string, price: string): TTemplateNode {
  return columns(
    [
      [image(placeholder(160, 160, 'F3F4F6', '9CA3AF', 'Product'), { padding: pad(0, 0, 0), width: 72, align: 'left', alt: name })],
      [
        text(name, { color: '#111827', fontSize: 15, fontWeight: 'bold', padding: pad(0, 2, 0) }),
        text(meta, { color: '#6B7280', fontSize: 13, padding: pad(0, 0, 0) }),
      ],
      [text(price, { color: '#111827', fontSize: 15, fontWeight: 'bold', textAlign: 'right', padding: pad(0, 0, 0) })],
    ],
    { padding: pad(8, 8, 32), fixedWidths: [15, 60, 25] }
  );
}

/** Label / value row, e.g. for order totals */
function totalRow(label: string, value: string, strong = false): TTemplateNode {
  const style = { color: strong ? '#111827' : '#4B5563', fontSize: strong ? 16 : 14, fontWeight: strong ? 'bold' : 'normal', padding: pad(0, 0, 0) };
  return columns([[text(label, style)], [text(value, { ...style, textAlign: 'right' })]], { padding: pad(4, 4, 32) });
}

/** Three small feature/info cells */
function threeUp(items: { title: string; body: string }[], bg = '#F9FAFB'): TTemplateNode {
  return columns(
    items.map((item) => [
      text(item.title, { color: '#111827', fontSize: 14, fontWeight: 'bold', textAlign: 'center', padding: pad(16, 4, 8) }),
      text(item.body, { color: '#6B7280', fontSize: 13, lineHeight: 1.5, textAlign: 'center', padding: pad(0, 16, 8) }),
    ]),
    { padding: pad(8, 24, 32), bg }
  );
}

const codeBox = (code: string): TTemplateNode =>
  container(
    [text(code, { color: '#111827', fontSize: 32, fontWeight: 'bold', letterSpacing: 8, textAlign: 'center', padding: pad(20, 20) })],
    { backgroundColor: '#F3F4F6', borderRadius: 8, padding: pad(0, 0, 0) }
  );

const card = (children: TTemplateNode[], bg = '#F9FAFB') => container(children, { backgroundColor: bg, borderRadius: 8, padding: pad(8, 8, 0) });

/** Image on one side, heading + text + link on the other (for zig-zag layouts) */
function splitRow(opts: { imageLabel: string; title: string; body: string; linkLabel: string; imageRight?: boolean; bg?: string; fg?: string }): TTemplateNode {
  const img = [image(placeholder(260, 200, opts.bg ?? 'EEF2FF', opts.fg ?? '4F46E5', opts.imageLabel), { padding: pad(0, 0, 0), width: 260, alt: opts.imageLabel })];
  const copy = [
    text(opts.title, { color: '#111827', fontSize: 18, fontWeight: 'bold', padding: pad(0, 6, 0) }),
    text(opts.body, { color: '#4B5563', fontSize: 14, lineHeight: 1.6, padding: pad(0, 8, 0) }),
    html(p(link(opts.linkLabel, 'https://example.com', '#4F46E5', 'font-weight:600;')), { fontSize: 14, padding: pad(0, 0, 0) }),
  ];
  return columns(opts.imageRight ? [copy, img] : [img, copy], { padding: pad(16, 16, 32) });
}

/** A card used in grids: image, title, short text, link */
function gridCard(label: string, titleValue: string, bodyValue: string, imgW: number, linkLabel = 'Read more →'): TTemplateNode[] {
  return [
    image(placeholder(imgW * 2, Math.round(imgW * 1.3), 'F3F4F6', '9CA3AF', label), { padding: pad(0, 8, 0), width: imgW, alt: label }),
    text(titleValue, { color: '#111827', fontSize: 15, fontWeight: 'bold', padding: pad(0, 4, 0) }),
    text(bodyValue, { color: '#6B7280', fontSize: 13, lineHeight: 1.5, padding: pad(0, 6, 0) }),
    html(p(link(linkLabel, 'https://example.com', '#4F46E5', 'font-weight:600;')), { fontSize: 13, padding: pad(0, 0, 0) }),
  ];
}

/** A product tile for grids: image, name, price, small button */
function productTile(name: string, price: string, imgW: number): TTemplateNode[] {
  return [
    image(placeholder(imgW * 2, imgW * 2, 'F3F4F6', '9CA3AF', 'Product'), { padding: pad(0, 8, 0), width: imgW, alt: name }),
    text(name, { color: '#111827', fontSize: 14, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 2, 0) }),
    text(price, { color: '#4B5563', fontSize: 14, textAlign: 'center', padding: pad(0, 8, 0) }),
    button('Shop', { bg: '#111827', color: '#FFFFFF', padding: pad(0, 0, 0), size: 'x-small', style: 'pill' }),
  ];
}

/** Big number + label, for stats rows */
function stat(value: string, label: string, color = '#4F46E5'): TTemplateNode[] {
  return [
    text(value, { color, fontSize: 26, fontWeight: 'bold', textAlign: 'center', padding: pad(16, 2, 4) }),
    text(label, { color: '#6B7280', fontSize: 12, textAlign: 'center', padding: pad(0, 16, 4) }),
  ];
}

/** Quote card */
function quote(body: string, author: string): TTemplateNode[] {
  return [
    text('“', { color: '#C7D2FE', fontSize: 40, fontWeight: 'bold', padding: pad(16, 0, 16) }),
    text(body, { color: '#374151', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic', padding: pad(0, 8, 16) }),
    text(author, { color: '#111827', fontSize: 13, fontWeight: 'bold', padding: pad(0, 16, 16) }),
  ];
}

// ---------- Helpers for branded (photo) templates ----------

const PHOTO = {
  latteHands: '1495474472287-4d71bcdd2085',
  latte: '1509042239860-f550ce710b93',
  pourOver: '1442512595331-e89e73853f31',
  icedCoffee: '1461023058943-07fcbe16d735',
  redSneaker: '1542291026-7eec264c27ff',
  blackSneaker: '1491553895911-0055eca6402d',
  tanSneaker: '1549298916-b41d501d3772',
  shopper: '1483985988355-763728e1935b',
  flatlay: '1556905055-8f358a7a47b2',
  rackWhite: '1490481651871-ab68de25d43d',
  storeRack: '1445205170230-053b83016050',
  yellowOutfit: '1515886657613-9f3515b0c78f',
  pizza: '1565299624946-b28f40a0ae38',
  pasta: '1473093295043-cdd812d0e601',
  dining: '1414235077428-338989a2e8c0',
  restaurant: '1517248135467-4c7edcad34c4',
  beach: '1507525428034-b723cf961d3e',
  lakeBoat: '1476514525535-07fb3b4ae5f1',
  mountainLake: '1501785888041-af3ef285b470',
  balloons: '1530789253388-582c481c54b0',
  fitnessWoman: '1571019613454-1cb2f99b2d8b',
  barbell: '1517836357463-d25dfeac3438',
  yoga: '1544367567-0f2fcb009e0b',
  gym: '1534438327276-14e5300c3a48',
  housePool: '1600596542815-ffad4c1539a9',
  modernHouse: '1600585154340-be6161a56a0c',
  apartment: '1560448204-e02f11c3d0e2',
  livingRoom: '1502672260266-1c1ef2d93688',
  cosmetics: '1596462502278-27bfdc403348',
  facial: '1570172619644-dfd03ed5d881',
  skincareBox: '1608248543803-ba4f8c70ae0b',
  analytics: '1460925895917-afdab827c52f',
  dashboard: '1551288049-bebda4e38f71',
  typing: '1486312338219-ce68d2c6f44d',
  teamLaptops: '1522071820081-009f0129c71c',
  confetti: '1492684223066-81342ee5ff30',
  concertPhones: '1501281668745-f7f57925c3b4',
  concertCrowd: '1459749411175-04bf5292ceea',
  portraitWoman: '1580489944761-15a19d654956',
  portraitMan: '1500648767791-00dcc994a43e',
  portraitWoman2: '1494790108377-be9c29b29330',
  portraitMan2: '1507003211169-0a1dd7228f2d',
};

const eyebrow = (value: string, color: string, align: 'left' | 'center' = 'center', top = 32) =>
  text(value, { color, fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textAlign: align, padding: pad(top, 8, 32) });

const display = (value: string, color = '#111827', align: 'left' | 'center' = 'center', fontFamily?: string) =>
  heading(value, { color, textAlign: align, fontWeight: 'bold', fontFamily: fontFamily ?? null, padding: pad(0, 12, 32) }, 'h1');

const lead = (value: string, color = '#4B5563', align: 'left' | 'center' = 'center', bottom = 24) =>
  text(value, { color, fontSize: 16, lineHeight: 1.65, textAlign: align, padding: pad(0, bottom, 32) });

const pill = (label: string, bg: string, color = '#FFFFFF', top = 0, bottom = 36) =>
  button(label, { bg, color, padding: pad(top, bottom, 32), style: 'pill', size: 'large' });

/** Photo card in a grid: photo, title, caption, optional price */
function photoCard(id: string, w: number, h: number, titleValue: string, caption: string, price?: string, priceColor = '#111827'): TTemplateNode[] {
  return [
    photo(id, w, h, titleValue, pad(0, 10, 0)),
    text(titleValue, { color: '#111827', fontSize: 15, fontWeight: 'bold', padding: pad(0, 2, 0) }),
    text(caption, { color: '#6B7280', fontSize: 13, lineHeight: 1.5, padding: pad(0, price ? 4 : 0, 0) }),
    ...(price ? [text(price, { color: priceColor, fontSize: 15, fontWeight: 'bold', padding: pad(0, 0, 0) })] : []),
  ];
}

/** Customer/person quote with portrait */
function portraitQuote(photoId: string, quoteText: string, name: string, role: string, bg: string): TTemplateNode {
  return columns(
    [
      [photo(photoId, 72, 72, name)],
      [
        text(`“${quoteText}”`, { color: '#1F2937', fontSize: 15, lineHeight: 1.6, fontStyle: 'italic', padding: pad(0, 6, 0) }),
        text(`${name} · ${role}`, { color: '#6B7280', fontSize: 13, fontWeight: 'bold', padding: pad(0, 0, 0) }),
      ],
    ],
    { padding: pad(24, 24, 32), bg, fixedWidths: [18, 82] }
  );
}

// ==================== Templates ====================

const STARTERS: Record<string, TStarterTemplate> = {
  welcome: {
    header: 'header-logo-nav',
    footer: 'footer-social-centered',
    body: [
      hero('Welcome aboard'),
      title('Welcome to Your Company 👋'),
      body('We’re so glad you’re here. Your account is ready — here are three quick ways to get the most out of it.', 'center'),
      threeUp([
        { title: '1. Complete your profile', body: 'Add a photo and a few details so we can personalise things for you.' },
        { title: '2. Explore the dashboard', body: 'See everything in one place and set up your first project.' },
        { title: '3. Invite your team', body: 'Work better together — invite teammates in one click.' },
      ]),
      cta('Get started'),
      small('Questions? Just reply to this email — we read every message.'),
    ],
  },

  newsletter: {
    header: 'header-newsletter',
    footer: 'footer-newsletter',
    backdropColor: '#F5F0E8',
    body: [
      body('Hi there, welcome to this week’s issue. Here’s what caught our eye, what we shipped, and what’s coming next.', 'left', 8),
      divider('#E7E5E4', pad(16, 16, 32)),
      image(placeholder(536, 240, 'E7E5E4', '78716C', 'Featured story'), { padding: pad(0, 12, 32), width: 536, alt: 'Featured story' }),
      heading('The story of the week', { color: '#1C1917', fontFamily: 'BOOK_SERIF', fontWeight: 'bold', padding: pad(0, 4, 32) }, 'h2'),
      body('A short, punchy summary of your lead article. Two or three sentences that make people want to read the rest.'),
      html(p(link('Read the full story →', 'https://example.com', '#B45309', 'font-weight:600;')), { fontSize: 15, padding: pad(0, 16, 32) }),
      divider('#E7E5E4', pad(8, 16, 32)),
      columns(
        [
          [
            image(placeholder(256, 160, 'E7E5E4', '78716C', 'Story 2'), { padding: pad(0, 8, 0), width: 256, alt: 'Story 2' }),
            text('Second story headline', { color: '#1C1917', fontSize: 16, fontWeight: 'bold', padding: pad(0, 4, 0) }),
            text('One-line teaser for the second story.', { color: '#57534E', fontSize: 14, padding: pad(0, 0, 0) }),
          ],
          [
            image(placeholder(256, 160, 'E7E5E4', '78716C', 'Story 3'), { padding: pad(0, 8, 0), width: 256, alt: 'Story 3' }),
            text('Third story headline', { color: '#1C1917', fontSize: 16, fontWeight: 'bold', padding: pad(0, 4, 0) }),
            text('One-line teaser for the third story.', { color: '#57534E', fontSize: 14, padding: pad(0, 0, 0) }),
          ],
        ],
        { padding: pad(0, 32, 32) }
      ),
    ],
  },

  promotion: {
    header: 'header-announcement',
    footer: 'footer-brand-color',
    body: [
      hero('SALE · UP TO 50% OFF', 'FEF3C7', 'B45309'),
      title('48-hour flash sale'),
      body('Our biggest sale of the season is here. Save up to 50% on bestsellers — but hurry, it ends Sunday at midnight.', 'center'),
      cta('Shop the sale', '#DC2626'),
      columns(
        [
          [
            image(placeholder(160, 160, 'F3F4F6', '9CA3AF', 'Product'), { padding: pad(0, 8, 0), width: 160, alt: 'Product' }),
            text('Classic Tee', { color: '#111827', fontSize: 14, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 0, 0) }),
            html(p('<span style="text-decoration:line-through;color:#9CA3AF;">$40</span>&nbsp; <strong style="color:#DC2626;">$20</strong>'), { fontSize: 14, textAlign: 'center', padding: pad(0, 0, 0) }),
          ],
          [
            image(placeholder(160, 160, 'F3F4F6', '9CA3AF', 'Product'), { padding: pad(0, 8, 0), width: 160, alt: 'Product' }),
            text('Everyday Hoodie', { color: '#111827', fontSize: 14, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 0, 0) }),
            html(p('<span style="text-decoration:line-through;color:#9CA3AF;">$80</span>&nbsp; <strong style="color:#DC2626;">$48</strong>'), { fontSize: 14, textAlign: 'center', padding: pad(0, 0, 0) }),
          ],
          [
            image(placeholder(160, 160, 'F3F4F6', '9CA3AF', 'Product'), { padding: pad(0, 8, 0), width: 160, alt: 'Product' }),
            text('Canvas Sneaker', { color: '#111827', fontSize: 14, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 0, 0) }),
            html(p('<span style="text-decoration:line-through;color:#9CA3AF;">$120</span>&nbsp; <strong style="color:#DC2626;">$72</strong>'), { fontSize: 14, textAlign: 'center', padding: pad(0, 0, 0) }),
          ],
        ],
        { padding: pad(8, 32, 32) }
      ),
      small('Offer valid while stocks last. Discount applied at checkout.'),
    ],
  },

  'order-confirmation': {
    header: 'header-logo-nav',
    footer: 'footer-support',
    body: [
      title('Thanks for your order!', 36),
      body('We’ve received your order and are getting it ready. We’ll email you again when it ships.', 'center', 8),
      text('Order #10482 · Placed October 9, 2026', { color: '#6B7280', fontSize: 13, textAlign: 'center', padding: pad(0, 24, 32) }),
      divider('#E5E7EB', pad(0, 8, 32)),
      productRow('Classic Tee', 'Size M · Qty 1', '$40.00'),
      productRow('Everyday Hoodie', 'Size L · Qty 1', '$80.00'),
      divider('#E5E7EB', pad(8, 8, 32)),
      totalRow('Subtotal', '$120.00'),
      totalRow('Shipping', 'Free'),
      totalRow('Tax', '$9.60'),
      totalRow('Total', '$129.60', true),
      spacer(16),
      columns(
        [
          [
            text('Shipping to', { color: '#111827', fontSize: 13, fontWeight: 'bold', padding: pad(0, 4, 0) }),
            html(p('Jordan Lee<br />123 Market Street<br />San Francisco, CA 94103'), { color: '#6B7280', fontSize: 13, lineHeight: 1.5, padding: pad(0, 0, 0) }),
          ],
          [
            text('Payment', { color: '#111827', fontSize: 13, fontWeight: 'bold', padding: pad(0, 4, 0) }),
            text('Visa ending in 4242', { color: '#6B7280', fontSize: 13, padding: pad(0, 0, 0) }),
          ],
        ],
        { padding: pad(8, 16, 32), bg: '#F9FAFB' }
      ),
      cta('View your order', '#111827', 24),
    ],
  },

  'shipping-update': {
    header: 'header-centered-logo',
    footer: 'footer-support',
    body: [
      hero('Your order is on its way', 'ECFDF5', '059669'),
      title('Good news — it’s shipped! 📦'),
      body('Your order #10482 has left our warehouse and is on its way to you. Estimated delivery: Tuesday, October 14.', 'center'),
      card([
        threeUp(
          [
            { title: 'Ordered', body: 'Oct 9' },
            { title: 'Shipped', body: 'Oct 10' },
            { title: 'Delivery', body: 'Oct 14 (est.)' },
          ],
          '#F9FAFB'
        ),
      ]),
      cta('Track your package', '#059669', 24),
      small('Carrier: UPS · Tracking number 1Z999AA10123456784'),
    ],
  },

  'password-reset': {
    header: 'header-centered-logo',
    footer: 'footer-simple',
    body: [
      title('Reset your password', 36),
      body('We received a request to reset the password for your account. Click the button below to choose a new one.', 'center'),
      cta('Reset password', '#111827'),
      body('This link will expire in 30 minutes. If you didn’t request a password reset, you can safely ignore this email — your password won’t change.', 'center', 32),
    ],
  },

  'verification-code': {
    header: 'header-centered-logo',
    footer: 'footer-simple',
    body: [
      title('Your verification code', 36),
      body('Enter this code to finish signing in. It expires in 10 minutes.', 'center', 24),
      container([codeBox('482 913')], { padding: pad(0, 24, 96) }),
      body('If you didn’t try to sign in, please ignore this email or contact support so we can secure your account.', 'center', 32),
    ],
  },

  'event-invitation': {
    header: 'header-brand-banner',
    footer: 'footer-dark-full',
    body: [
      title('You’re invited: Product Summit 2026', 36),
      body('Join us for an afternoon of talks, live demos and conversations with the team building what’s next. Seats are limited.', 'center'),
      threeUp([
        { title: '📅 Date', body: 'Thursday, Nov 12' },
        { title: '🕒 Time', body: '2:00 – 6:00 PM' },
        { title: '📍 Location', body: 'Pier 27, San Francisco' },
      ]),
      cta('RSVP now', '#4F46E5'),
      small('Can’t make it in person? Every session will be live-streamed.'),
    ],
  },

  'abandoned-cart': {
    header: 'header-logo-cta',
    footer: 'footer-social-centered',
    body: [
      title('You left something behind', 36),
      body('Your cart is saved, but items are selling fast. Complete your order before they’re gone.', 'center', 24),
      productRow('Everyday Hoodie', 'Size L · Heather grey', '$80.00'),
      productRow('Canvas Sneaker', 'Size 9 · White', '$120.00'),
      divider('#E5E7EB', pad(8, 8, 32)),
      totalRow('Cart total', '$200.00', true),
      cta('Return to your cart', '#111827', 24),
      html(p('Use code <strong style="color:#111827;">COMEBACK10</strong> for 10% off — valid for 48 hours.'), {
        color: '#6B7280',
        fontSize: 13,
        textAlign: 'center',
        padding: pad(0, 32, 32),
      }),
    ],
  },

  'feedback-request': {
    header: 'header-logo-tagline',
    footer: 'footer-two-column',
    body: [
      title('How did we do?', 36),
      body('Thanks for your recent order! We’d love to hear what you think — it only takes a minute and helps us get better.', 'center', 24),
      html(
        p(
          ['😞', '😐', '🙂', '😀', '🤩']
            .map((face, i) => link(face, `https://example.com/rate/${i + 1}`, '#111827', 'font-size:32px;'))
            .join('&nbsp;&nbsp;&nbsp;')
        ),
        { textAlign: 'center', padding: pad(0, 4, 32) }
      ),
      text('Tap a rating to tell us more', { color: '#9CA3AF', fontSize: 12, textAlign: 'center', padding: pad(0, 16, 32) }),
      cta('Write a review', '#4F46E5'),
    ],
  },

  'product-announcement': {
    header: 'header-dark-nav',
    footer: 'footer-app-download',
    body: [
      hero('Introducing something new', '111827', 'F9FAFB'),
      title('Meet the all-new Dashboard'),
      body('Faster, smarter and designed around how you actually work. Here’s what’s new.', 'center'),
      threeUp([
        { title: '⚡ 2× faster', body: 'Everything loads in a blink, even with huge projects.' },
        { title: '🧠 Smart insights', body: 'See trends and suggestions tailored to your data.' },
        { title: '🔒 Built-in security', body: 'Granular permissions and audit logs for every team.' },
      ]),
      cta('Try it now', '#111827'),
    ],
  },

  // ---------- Layout-focused templates ----------

  'personal-letter': {
    header: 'header-centered-logo',
    footer: 'footer-simple',
    body: [
      text('Hi there,', { color: '#111827', fontSize: 16, padding: pad(36, 16, 48) }),
      text('I wanted to write to you personally to say thank you. When we started Your Company, we hoped to build something people would genuinely enjoy using — and hearing from customers like you is the best part of the job.', { color: '#374151', fontSize: 16, lineHeight: 1.7, padding: pad(0, 16, 48) }),
      text('Over the next few weeks we’re rolling out some changes based directly on your feedback. If there’s anything you’d like to see, just hit reply — this email comes straight to my inbox.', { color: '#374151', fontSize: 16, lineHeight: 1.7, padding: pad(0, 24, 48) }),
      text('Warmly,', { color: '#374151', fontSize: 16, padding: pad(0, 4, 48) }),
      text('Alex Morgan', { color: '#111827', fontSize: 16, fontWeight: 'bold', padding: pad(0, 0, 48) }),
      text('Founder & CEO, Your Company', { color: '#6B7280', fontSize: 13, padding: pad(0, 40, 48) }),
    ],
  },

  'zigzag-features': {
    header: 'header-logo-cta',
    footer: 'footer-social-centered',
    body: [
      title('Everything you need, in one place', 36),
      body('Three features that will change the way your team works.', 'center', 16),
      splitRow({ imageLabel: 'Feature 1', title: 'Plan together', body: 'Shared boards keep everyone aligned on priorities, deadlines and owners.', linkLabel: 'Explore planning →' }),
      splitRow({ imageLabel: 'Feature 2', title: 'Automate the busywork', body: 'Set up rules once and let repetitive tasks take care of themselves.', linkLabel: 'See automations →', imageRight: true, bg: 'ECFDF5', fg: '059669' }),
      splitRow({ imageLabel: 'Feature 3', title: 'Measure what matters', body: 'Live dashboards show progress at a glance, no spreadsheets required.', linkLabel: 'View reports →', bg: 'FEF3C7', fg: 'B45309' }),
      cta('Start free trial', '#2563EB', 16),
    ],
  },

  'product-grid': {
    header: 'header-dark-nav',
    footer: 'footer-dark-full',
    body: [
      hero('NEW ARRIVALS', '111827', 'F9FAFB'),
      title('Fresh drops for the season'),
      body('Handpicked styles just landed. Get them before they’re gone.', 'center', 8),
      columns(
        [productTile('Linen Shirt', '$58', 160), productTile('Wool Beanie', '$24', 160), productTile('Leather Belt', '$45', 160)],
        { padding: pad(16, 8, 32) }
      ),
      columns(
        [productTile('Denim Jacket', '$120', 160), productTile('Canvas Tote', '$32', 160), productTile('Suede Loafer', '$140', 160)],
        { padding: pad(16, 24, 32) }
      ),
      cta('Shop all new arrivals', '#111827'),
    ],
  },

  'blog-digest': {
    header: 'header-logo-nav',
    footer: 'footer-two-column',
    body: [
      title('This month on the blog', 36),
      body('Our most-read articles, hand-picked for you.', 'center', 16),
      columns(
        [
          gridCard('Article', '10 habits of productive teams', 'Small changes that add up to big results.', 256),
          gridCard('Article', 'A beginner’s guide to automation', 'Where to start and what to avoid.', 256),
        ],
        { padding: pad(8, 16, 32) }
      ),
      columns(
        [
          gridCard('Article', 'How we cut meeting time in half', 'The simple process we use every week.', 256),
          gridCard('Article', 'Remote work: lessons from year five', 'What we got wrong, and what finally worked.', 256),
        ],
        { padding: pad(8, 24, 32) }
      ),
      cta('Visit the blog', '#4F46E5'),
    ],
  },

  'split-hero': {
    header: 'header-logo-nav',
    footer: 'footer-app-download',
    body: [
      columns(
        [
          [
            text('NEW FEATURE', { color: '#4F46E5', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, padding: pad(0, 8, 0) }),
            heading('Work faster with smart templates', { color: '#111827', fontWeight: 'bold', padding: pad(0, 8, 0) }, 'h2'),
            text('Start any project in seconds with templates that adapt to your workflow.', { color: '#4B5563', fontSize: 15, lineHeight: 1.6, padding: pad(0, 16, 0) }),
            button('Try it now', { bg: '#4F46E5', color: '#FFFFFF', align: 'left', padding: pad(0, 0, 0), style: 'rounded' }),
          ],
          [image(placeholder(520, 520, 'EEF2FF', '4F46E5', 'Product shot'), { padding: pad(0, 0, 0), width: 260, alt: 'Product shot' })],
        ],
        { padding: pad(40, 32, 32), bg: '#F8FAFC' }
      ),
      subtitle('Why teams love it'),
      body('Templates save the average team over 5 hours a week. Pick one, tweak it, and you’re off — no setup, no learning curve.', 'center', 8),
      threeUp(
        [
          { title: '200+ templates', body: 'For every team and use case.' },
          { title: 'Fully editable', body: 'Make each one your own.' },
          { title: 'Share instantly', body: 'Your whole team, one click.' },
        ],
        '#FFFFFF'
      ),
    ],
  },

  'stats-report': {
    header: 'header-logo-tagline',
    footer: 'footer-simple',
    body: [
      title('Your October in numbers', 36),
      body('Here’s a quick look at how your account performed this month.', 'center', 16),
      columns(
        [stat('12.4k', 'Visitors'), stat('3,210', 'Sign-ups', '#059669'), stat('26%', 'Conversion', '#D97706'), stat('$48k', 'Revenue', '#DC2626')],
        { padding: pad(8, 8, 32), bg: '#F9FAFB' }
      ),
      subtitle('Highlights', 'left'),
      html(
        p('✅ Sign-ups grew <strong>18%</strong> compared to September') +
          p('✅ Your best day was <strong>October 17</strong> with 842 visitors') +
          p('⚠️ Checkout drop-off rose slightly — worth a look'),
        { color: '#374151', fontSize: 14, lineHeight: 2, padding: pad(4, 16, 32) }
      ),
      cta('Open full report', '#111827'),
    ],
  },

  magazine: {
    header: 'header-newsletter',
    footer: 'footer-newsletter',
    backdropColor: '#F5F0E8',
    body: [
      image(placeholder(600, 300, 'E7E5E4', '78716C', 'Cover story'), { padding: pad(0, 0, 0), width: 600, alt: 'Cover story' }),
      heading('The cover story headline goes here', { color: '#1C1917', fontFamily: 'BOOK_SERIF', fontWeight: 'bold', padding: pad(24, 6, 32) }, 'h1'),
      body('A compelling standfirst that sets up the main story in a sentence or two and makes the reader want more.'),
      html(p(link('Continue reading →', 'https://example.com', '#B45309', 'font-weight:600;')), { fontSize: 15, padding: pad(0, 16, 32) }),
      divider('#D6D3D1', pad(8, 16, 32)),
      columns(
        [
          gridCard('Feature', 'In conversation with a designer', 'On craft, taste and doing less.', 256, 'Read →'),
          gridCard('Feature', 'The quiet return of print', 'Why paper is having a moment.', 256, 'Read →'),
        ],
        { padding: pad(0, 16, 32) }
      ),
      divider('#D6D3D1', pad(8, 16, 32)),
      text('QUICK READS', { color: '#78716C', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, padding: pad(0, 8, 32) }),
      columns(
        [
          [text('Five books for autumn', { color: '#1C1917', fontSize: 14, fontWeight: 'bold', padding: pad(0, 2, 0) }), text('Our editors’ picks.', { color: '#57534E', fontSize: 13, padding: pad(0, 0, 0) })],
          [text('A weekend in Lisbon', { color: '#1C1917', fontSize: 14, fontWeight: 'bold', padding: pad(0, 2, 0) }), text('Where to eat and stay.', { color: '#57534E', fontSize: 13, padding: pad(0, 0, 0) })],
          [text('The one-pan dinner', { color: '#1C1917', fontSize: 14, fontWeight: 'bold', padding: pad(0, 2, 0) }), text('Ready in 25 minutes.', { color: '#57534E', fontSize: 13, padding: pad(0, 0, 0) })],
        ],
        { padding: pad(0, 32, 32) }
      ),
    ],
  },

  'webinar-agenda': {
    header: 'header-brand-banner',
    footer: 'footer-support',
    body: [
      title('Live webinar: Scaling your growth engine', 36),
      body('Join our experts for a practical, 60-minute session packed with frameworks you can use right away.', 'center', 16),
      columns(
        [
          [image(placeholder(160, 160, 'EEF2FF', '4F46E5', 'Speaker'), { padding: pad(0, 0, 0), width: 80, alt: 'Speaker' })],
          [
            text('Hosted by Priya Shah', { color: '#111827', fontSize: 15, fontWeight: 'bold', padding: pad(0, 2, 0) }),
            text('Head of Growth, Your Company · 12 years building marketing teams', { color: '#6B7280', fontSize: 13, padding: pad(0, 0, 0) }),
          ],
        ],
        { padding: pad(8, 16, 32), fixedWidths: [20, 80], bg: '#F9FAFB' }
      ),
      subtitle('Agenda', 'left'),
      ...[
        ['2:00 PM', 'Welcome & the state of growth in 2026'],
        ['2:10 PM', 'Finding your highest-leverage channel'],
        ['2:30 PM', 'Live teardown: three real funnels'],
        ['2:50 PM', 'Q&A with the team'],
      ].map(([time, topic]) =>
        columns(
          [
            [text(time, { color: '#4F46E5', fontSize: 14, fontWeight: 'bold', padding: pad(0, 0, 0) })],
            [text(topic, { color: '#374151', fontSize: 14, padding: pad(0, 0, 0) })],
          ],
          { padding: pad(6, 6, 32), fixedWidths: [25, 75] }
        )
      ),
      cta('Save my seat', '#4F46E5', 24),
      small('Thursday, November 5 · 2:00 PM PT · Free'),
    ],
  },

  testimonials: {
    header: 'header-centered-logo',
    footer: 'footer-brand-color',
    body: [
      title('Don’t just take our word for it', 36),
      body('Over 10,000 teams use Your Company every day. Here’s what a few of them have to say.', 'center', 16),
      columns(
        [quote('We replaced three different tools and our team has never been more in sync.', '— Sam R., Operations Lead'), quote('Setup took ten minutes. The results showed up in the first week.', '— Dana K., Founder')],
        { padding: pad(8, 8, 32), bg: '#F5F3FF' }
      ),
      columns(
        [quote('The support team is incredible — fast, friendly and genuinely helpful.', '— Luis M., Product Manager'), quote('It’s the one tool everyone on our team actually enjoys using.', '— Mei T., Designer')],
        { padding: pad(8, 24, 32), bg: '#F5F3FF' }
      ),
      cta('Start your free trial', '#4F46E5'),
    ],
  },

  'holiday-greeting': {
    header: 'header-centered-logo',
    footer: 'footer-social-centered',
    backdropColor: '#FEF2F2',
    body: [
      hero('Happy Holidays', 'B91C1C', 'FFFFFF'),
      title('Warm wishes from all of us', 32),
      body('Thank you for being part of our story this year. As a small thank-you, enjoy a gift on us.', 'center', 16),
      container(
        [
          text('YOUR HOLIDAY GIFT', { color: '#B91C1C', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center', padding: pad(20, 4) }),
          text('25% OFF', { color: '#111827', fontSize: 36, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 4) }),
          text('Use code  CHEERS25  at checkout', { color: '#4B5563', fontSize: 14, textAlign: 'center', padding: pad(0, 20) }),
        ],
        { backgroundColor: '#FFF7ED', borderRadius: 8, borderColor: '#FDBA74', padding: pad(0, 0, 0) }
      ),
      spacer(8),
      cta('Redeem my gift', '#B91C1C', 16),
      small('Valid until December 31. One use per customer.'),
    ],
  },

  // ---------- Branded, photo-based templates ----------

  'coffee-menu': {
    header: 'header-logo-nav',
    footer: 'footer-social-centered',
    brand: 'Brew & Co',
    recolor: { '111827': '3B2416' },
    backdropColor: '#F6F1EB',
    body: [
      photo(PHOTO.icedCoffee, 600, 340, 'Iced coffee'),
      eyebrow('AUTUMN MENU · NOW POURING', '#9A5B2E'),
      display('Cozy season is officially here', '#3B2416'),
      lead('Our new autumn lineup just landed — maple, cinnamon and slow-roasted everything. Order ahead and skip the line.'),
      columns(
        [
          photoCard(PHOTO.latte, 260, 200, 'Maple Oat Latte', 'Double espresso, oat milk, real maple syrup.', '$5.75', '#9A5B2E'),
          photoCard(PHOTO.pourOver, 260, 200, 'Single-Origin Pour Over', 'Ethiopia Guji — notes of peach & jasmine.', '$4.50', '#9A5B2E'),
        ],
        { padding: pad(0, 28, 32) }
      ),
      pill('Order ahead in the app', '#3B2416'),
      container(
        [
          text('☕  Rewards members get a free drink on their 10th visit.', { color: '#3B2416', fontSize: 14, textAlign: 'center', padding: pad(16, 16) }),
        ],
        { backgroundColor: '#EFE4D8', padding: pad(0, 0, 0) }
      ),
    ],
  },

  'fashion-lookbook': {
    header: 'header-dark-nav',
    footer: 'footer-dark-full',
    brand: 'NORTHLINE',
    body: [
      photo(PHOTO.shopper, 600, 420, 'The Autumn Edit'),
      eyebrow('NEW COLLECTION', '#6B7280'),
      display('The Autumn Edit', '#111827', 'center', 'BOOK_SERIF'),
      lead('Relaxed tailoring, soft knits and the layers you’ll live in all season. Designed in Copenhagen, made to last.'),
      columns(
        [
          photoCard(PHOTO.rackWhite, 260, 320, 'Essential Linen Shirt', 'Ivory · Relaxed fit', '$89'),
          photoCard(PHOTO.yellowOutfit, 260, 320, 'Weekend Co-ord Set', 'Mustard · Brushed cotton', '$140'),
        ],
        { padding: pad(0, 16, 32) }
      ),
      columns(
        [
          photoCard(PHOTO.flatlay, 260, 320, 'Merino Beanie & Denim', 'Rust · One size', '$65'),
          photoCard(PHOTO.storeRack, 260, 320, 'Overshirt Collection', '6 colourways', 'From $110'),
        ],
        { padding: pad(0, 28, 32) }
      ),
      button('Shop the collection', { bg: '#111827', color: '#FFFFFF', padding: pad(0, 40, 32), style: 'rectangle', size: 'large' }),
    ],
  },

  'sneaker-black-friday': {
    header: 'header-announcement',
    footer: 'footer-brand-color',
    brand: 'Sole Street',
    recolor: { '059669': 'DC2626', '064e3b': '111827', '4F46E5': '111827', 'C7D2FE': '9CA3AF' },
    backdropColor: '#111827',
    body: [
      container(
        [
          eyebrow('BLACK FRIDAY · 72 HOURS ONLY', '#FCA5A5', 'center', 36),
          heading('UP TO 60% OFF', { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', padding: pad(0, 8, 32) }, 'h1'),
          text('Our biggest drop of the year. Every style, every size, while stock lasts.', { color: '#D1D5DB', fontSize: 16, textAlign: 'center', padding: pad(0, 24, 32) }),
          photo(PHOTO.redSneaker, 600, 380, 'Red running sneaker'),
        ],
        { backgroundColor: '#0B0B0F', padding: pad(0, 0, 0) }
      ),
      columns(
        [
          photoCard(PHOTO.blackSneaker, 168, 168, 'Phantom Runner', 'Black / White', '$69 · was $140', '#DC2626'),
          photoCard(PHOTO.tanSneaker, 168, 168, 'Court Classic', 'Wheat suede', '$55 · was $110', '#DC2626'),
          photoCard(PHOTO.redSneaker, 168, 168, 'Velocity Pro', 'Crimson', '$84 · was $160', '#DC2626'),
        ],
        { padding: pad(32, 24, 32) }
      ),
      container(
        [
          text('USE CODE', { color: '#6B7280', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center', padding: pad(18, 2) }),
          text('BLACKFRIDAY', { color: '#111827', fontSize: 28, fontWeight: 'bold', letterSpacing: 4, textAlign: 'center', padding: pad(0, 2) }),
          text('for an extra 10% off orders over $100', { color: '#6B7280', fontSize: 13, textAlign: 'center', padding: pad(0, 18) }),
        ],
        { backgroundColor: '#FEF2F2', borderRadius: 8, padding: pad(0, 0, 0) }
      ),
      spacer(8),
      pill('Shop the sale', '#DC2626', '#FFFFFF', 16, 40),
    ],
  },

  'travel-deals': {
    header: 'header-logo-nav',
    footer: 'footer-two-column',
    brand: 'Wander',
    recolor: { '111827': '0E7490' },
    replaceText: { 'Making everyday life a little easier since 2012.': 'Hand-picked trips for curious travellers since 2012.' },
    body: [
      photo(PHOTO.mountainLake, 600, 340, 'Mountain lake'),
      eyebrow('SUMMER ESCAPES', '#0E7490'),
      display('Your next adventure starts at $299'),
      lead('Flights + hotel packages to our most-loved destinations. Book by Sunday to lock in these prices.'),
      ...[
        { id: PHOTO.beach, place: 'Bali, Indonesia', desc: '7 nights · Beachfront villa · Breakfast included', price: 'from $899' },
        { id: PHOTO.lakeBoat, place: 'Dolomites, Italy', desc: '5 nights · Lakeside lodge · Guided hikes', price: 'from $649' },
        { id: PHOTO.balloons, place: 'Cappadocia, Türkiye', desc: '4 nights · Cave hotel · Sunrise balloon ride', price: 'from $299' },
      ].map((d) =>
        columns(
          [
            [photo(d.id, 220, 160, d.place)],
            [
              text(d.place, { color: '#111827', fontSize: 18, fontWeight: 'bold', padding: pad(0, 4, 0) }),
              text(d.desc, { color: '#6B7280', fontSize: 13, lineHeight: 1.5, padding: pad(0, 8, 0) }),
              text(d.price, { color: '#0E7490', fontSize: 16, fontWeight: 'bold', padding: pad(0, 8, 0) }),
              html(p(link('View package →', 'https://example.com', '#0E7490', 'font-weight:600;')), { fontSize: 14, padding: pad(0, 0, 0) }),
            ],
          ],
          { padding: pad(8, 16, 32), fixedWidths: [42, 58] }
        )
      ),
      pill('See all deals', '#0E7490', '#FFFFFF', 16, 40),
    ],
  },

  'restaurant-specials': {
    header: 'header-centered-logo',
    footer: 'footer-social-centered',
    brand: 'Tavola',
    recolor: { '111827': '7C2D12' },
    backdropColor: '#FAF5EF',
    body: [
      photo(PHOTO.dining, 600, 320, 'Dinner at Tavola'),
      eyebrow('THIS WEEK AT TAVOLA', '#B45309'),
      display('Chef’s specials, straight from the wood-fired oven', '#7C2D12', 'center', 'BOOK_SERIF'),
      lead('Seasonal ingredients, handmade pasta and our famous Neapolitan pizza. Available Tuesday to Sunday while they last.'),
      columns(
        [
          photoCard(PHOTO.pizza, 260, 200, 'Wild Mushroom Pizza', 'Fior di latte, truffle oil, thyme.', '$19', '#B45309'),
          photoCard(PHOTO.pasta, 260, 200, 'Summer Farfalle', 'Cherry tomato, basil, aged parmesan.', '$17', '#B45309'),
        ],
        { padding: pad(0, 24, 32) }
      ),
      columns(
        [
          [photo(PHOTO.restaurant, 260, 200, 'Our dining room')],
          [
            text('Private dining', { color: '#7C2D12', fontSize: 18, fontWeight: 'bold', padding: pad(0, 6, 0) }),
            text('Celebrating something? Our garden room seats up to 24 guests with a set seasonal menu.', { color: '#57534E', fontSize: 14, lineHeight: 1.6, padding: pad(0, 8, 0) }),
            html(p(link('Enquire now →', 'https://example.com', '#B45309', 'font-weight:600;')), { fontSize: 14, padding: pad(0, 0, 0) }),
          ],
        ],
        { padding: pad(8, 28, 32), bg: '#F3E8DC' }
      ),
      pill('Book a table', '#7C2D12', '#FFFFFF', 28, 40),
    ],
  },

  'fitness-membership': {
    header: 'header-logo-cta',
    footer: 'footer-dark-full',
    brand: 'Pulse',
    recolor: { '2563EB': 'E11D48' },
    replaceText: { 'Sign in': 'Join now' },
    body: [
      photo(PHOTO.fitnessWoman, 600, 340, 'Workout'),
      eyebrow('NEW YEAR OFFER', '#E11D48'),
      display('Your strongest year starts now'),
      lead('Join this month and get 30% off your first 3 months, plus a free personal training session.'),
      columns(
        [
          photoCard(PHOTO.barbell, 168, 140, 'Strength', 'Coached lifting, all levels.'),
          photoCard(PHOTO.yoga, 168, 140, 'Yoga & Mobility', 'Unwind and move better.'),
          photoCard(PHOTO.gym, 168, 140, '24/7 Open Gym', 'Train on your schedule.'),
        ],
        { padding: pad(0, 28, 32) }
      ),
      container(
        [
          columns(
            [
              stat('30%', 'off 3 months', '#E11D48'),
              stat('120+', 'classes / week', '#111827'),
              stat('Free', 'PT session', '#111827'),
            ],
            { padding: pad(0, 0, 16) }
          ),
        ],
        { backgroundColor: '#FFF1F2', padding: pad(0, 0, 0) }
      ),
      portraitQuote(PHOTO.portraitWoman, 'I’ve tried a lot of gyms. Pulse is the first one I actually look forward to.', 'Hannah W.', 'Member since 2023', '#FFFFFF'),
      pill('Claim my 30% off', '#E11D48', '#FFFFFF', 8, 40),
    ],
  },

  'real-estate-listings': {
    header: 'header-logo-nav',
    footer: 'footer-two-column',
    brand: 'Haven Realty',
    recolor: { '111827': '134E4A' },
    replaceText: { 'Making everyday life a little easier since 2012.': 'Helping families find home across Los Angeles since 2012.' },
    body: [
      photo(PHOTO.housePool, 600, 340, 'Featured home'),
      container(
        [
          eyebrow('FEATURED LISTING', '#0F766E', 'left', 24),
          heading('Modern hillside retreat with infinity pool', { color: '#134E4A', fontWeight: 'bold', padding: pad(0, 6, 32) }, 'h2'),
          text('4 bed · 3.5 bath · 3,850 sq ft · Los Angeles, CA', { color: '#4B5563', fontSize: 14, padding: pad(0, 6, 32) }),
          text('$2,450,000', { color: '#0F766E', fontSize: 24, fontWeight: 'bold', padding: pad(0, 24, 32) }),
        ],
        { padding: pad(0, 0, 0) }
      ),
      divider('#E5E7EB', pad(0, 16, 32)),
      subtitle('More homes you might love', 'left'),
      columns(
        [
          photoCard(PHOTO.modernHouse, 260, 180, 'Oak Lane Residence', '3 bed · 2 bath · Pasadena', '$1,180,000', '#0F766E'),
          photoCard(PHOTO.apartment, 260, 180, 'Skyline Loft', '2 bed · 2 bath · Downtown LA', '$895,000', '#0F766E'),
        ],
        { padding: pad(8, 28, 32) }
      ),
      portraitQuote(PHOTO.portraitMan, 'Thinking about selling? I’ll put together a free valuation of your home within 48 hours.', 'Daniel Brooks', 'Your local agent', '#F0FDFA'),
      pill('Book a viewing', '#0F766E', '#FFFFFF', 28, 40),
    ],
  },

  'skincare-launch': {
    header: 'header-logo-tagline',
    footer: 'footer-brand-color',
    brand: 'Lumen',
    replaceText: { 'Thoughtfully made, delivered to your door': 'Clean skincare, backed by science' },
    recolor: { '4F46E5': 'BE185D', 'C7D2FE': 'FBCFE8', 'F8FAFC': 'FDF2F8', 'f8fafc': 'fdf2f8' },
    backdropColor: '#FDF2F8',
    body: [
      photo(PHOTO.skincareBox, 600, 360, 'Lumen Renewal Serum'),
      eyebrow('JUST LAUNCHED', '#BE185D'),
      display('Meet Renewal Serum', '#111827', 'center', 'BOOK_SERIF'),
      lead('A lightweight daily serum with 10% niacinamide and peptides for visibly smoother, brighter skin in 4 weeks.'),
      pill('Shop now — $48', '#BE185D', '#FFFFFF', 0, 32),
      subtitle('Your 3-step glow routine'),
      columns(
        [
          photoCard(PHOTO.cosmetics, 168, 168, '1. Cleanse', 'Gentle gel cleanser, morning & night.'),
          photoCard(PHOTO.skincareBox, 168, 168, '2. Treat', 'Two drops of Renewal Serum.'),
          photoCard(PHOTO.facial, 168, 168, '3. Hydrate', 'Seal it in with Cloud Cream.'),
        ],
        { padding: pad(8, 28, 32) }
      ),
      container(
        [
          text('★★★★★', { color: '#DB2777', fontSize: 18, textAlign: 'center', padding: pad(24, 4) }),
          text('“My skin has never looked this even. I’m on my third bottle.”', { color: '#374151', fontSize: 16, fontStyle: 'italic', textAlign: 'center', padding: pad(0, 6, 48) }),
          text('— Priya, verified buyer', { color: '#6B7280', fontSize: 13, textAlign: 'center', padding: pad(0, 24) }),
        ],
        { backgroundColor: '#FCE7F3', padding: pad(0, 0, 0) }
      ),
    ],
  },

  'saas-product-update': {
    header: 'header-logo-cta',
    footer: 'footer-app-download',
    brand: 'Stackly',
    recolor: { '2563EB': '6366F1' },
    body: [
      container(
        [
          eyebrow('PRODUCT UPDATE · OCTOBER', '#A5B4FC', 'center', 40),
          heading('Insights 2.0 is here', { color: '#FFFFFF', textAlign: 'center', fontWeight: 'bold', padding: pad(0, 10, 32) }, 'h1'),
          text('Real-time dashboards, AI summaries and custom alerts — all included in your plan.', { color: '#CBD5E1', fontSize: 16, lineHeight: 1.6, textAlign: 'center', padding: pad(0, 28, 48) }),
          photo(PHOTO.dashboard, 536, 300, 'Insights dashboard', pad(0, 0, 32)),
        ],
        { backgroundColor: '#0F172A', padding: pad(0, 0, 0) }
      ),
      spacer(16),
      ...[
        { id: PHOTO.analytics, t: 'Real-time dashboards', b: 'Watch metrics update live, with zero refresh. Pin the charts that matter to your home screen.', right: false },
        { id: PHOTO.typing, t: 'AI weekly summaries', b: 'Every Monday, get a plain-English summary of what changed and why — written for you.', right: true },
        { id: PHOTO.teamLaptops, t: 'Alerts for your whole team', b: 'Send threshold alerts to Slack, email or SMS so the right people know instantly.', right: false },
      ].map((f) => {
        const img = [photo(f.id, 260, 180, f.t)];
        const copy = [
          text(f.t, { color: '#0F172A', fontSize: 18, fontWeight: 'bold', padding: pad(0, 6, 0) }),
          text(f.b, { color: '#475569', fontSize: 14, lineHeight: 1.6, padding: pad(0, 0, 0) }),
        ];
        return columns(f.right ? [copy, img] : [img, copy], { padding: pad(12, 12, 32) });
      }),
      subtitle('Also in this release', 'left'),
      html(
        p('•&nbsp; Dark mode for every dashboard') + p('•&nbsp; CSV export is now 4× faster') + p('•&nbsp; New integrations: HubSpot, Linear and Notion'),
        { color: '#334155', fontSize: 14, lineHeight: 2, padding: pad(0, 20, 32) }
      ),
      pill('Try Insights 2.0', '#6366F1', '#FFFFFF', 4, 40),
    ],
  },

  'festival-tickets': {
    header: 'header-brand-banner',
    footer: 'footer-dark-full',
    brand: 'Soundwave',
    recolor: { '4F46E5': '7C3AED', 'E0E7FF': 'EDE9FE' },
    replaceText: { 'Big news is here': 'The lineup is out 🎶', 'Everything you need to know this month': 'Early-bird tickets on sale now' },
    backdropColor: '#1E1B2E',
    body: [
      photo(PHOTO.confetti, 600, 340, 'Festival crowd'),
      eyebrow('JULY 17–19 · RIVERSIDE PARK', '#7C3AED'),
      display('Soundwave Festival 2026'),
      lead('Three days. Four stages. 60+ artists. Early-bird tickets are on sale now — and they always sell out fast.'),
      columns(
        [[photo(PHOTO.concertPhones, 260, 180, 'Main stage')], [photo(PHOTO.concertCrowd, 260, 180, 'Night show')]],
        { padding: pad(0, 24, 32) }
      ),
      subtitle('Choose your pass'),
      columns(
        [
          [
            text('Day Pass', { color: '#111827', fontSize: 15, fontWeight: 'bold', textAlign: 'center', padding: pad(20, 4, 8) }),
            text('$89', { color: '#7C3AED', fontSize: 26, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 4, 8) }),
            text('Any single day', { color: '#6B7280', fontSize: 12, textAlign: 'center', padding: pad(0, 20, 8) }),
          ],
          [
            container(
              [
                text('Weekend', { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold', textAlign: 'center', padding: pad(20, 4, 8) }),
                text('$199', { color: '#FFFFFF', fontSize: 26, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 4, 8) }),
                text('All 3 days · Most popular', { color: '#EDE9FE', fontSize: 12, textAlign: 'center', padding: pad(0, 20, 8) }),
              ],
              { backgroundColor: '#7C3AED', borderRadius: 8, padding: pad(0, 0, 0) }
            ),
          ],
          [
            text('VIP', { color: '#111827', fontSize: 15, fontWeight: 'bold', textAlign: 'center', padding: pad(20, 4, 8) }),
            text('$449', { color: '#7C3AED', fontSize: 26, fontWeight: 'bold', textAlign: 'center', padding: pad(0, 4, 8) }),
            text('Lounge, fast entry, merch', { color: '#6B7280', fontSize: 12, textAlign: 'center', padding: pad(0, 20, 8) }),
          ],
        ],
        { padding: pad(8, 28, 32), bg: '#F5F3FF' }
      ),
      pill('Get tickets', '#7C3AED', '#FFFFFF', 0, 40),
    ],
  },
};

/** Applies the starter's brand name and colours to a shared header/footer template. */
function brandSlotTemplate(template: TSlotTemplate, starter: TStarterTemplate): TSlotTemplate {
  if (!starter.brand && !starter.recolor && !starter.replaceText) return template;
  let json = JSON.stringify(template);
  if (starter.brand) {
    json = json
      .split('YOUR%20LOGO')
      .join(encodeURIComponent(starter.brand.toUpperCase()))
      .split('Your Company')
      .join(starter.brand);
  }
  for (const [from, to] of Object.entries(starter.replaceText ?? {})) {
    json = json.split(from).join(to);
  }
  for (const [from, to] of Object.entries(starter.recolor ?? {})) {
    json = json.replace(new RegExp(from, 'gi'), to);
  }
  return JSON.parse(json);
}

function findTemplate(list: TSlotTemplate[], id: string): TSlotTemplate {
  return list.find((tpl) => tpl.id === id) ?? list[0];
}

/** Builds a complete editor document for a starter template. */
export function buildStarterTemplate(name: string): TEditorConfiguration {
  const starter = STARTERS[name];
  if (!starter) throw new Error(`Unknown starter template: ${name}`);

  const doc: Record<string, TEditorBlock> = {};
  const addSlot = (slotId: string, baseTemplate: TSlotTemplate) => {
    const template = brandSlotTemplate(baseTemplate, starter);
    const { childrenIds, blocks } = flattenTemplate(template, `${slotId}-${name}`);
    Object.assign(doc, blocks);
    doc[slotId] = { type: 'Container', data: { style: template.containerStyle, props: { childrenIds } } } as TEditorBlock;
  };
  addSlot(HEADER_BLOCK_ID, findTemplate(HEADER_TEMPLATES, starter.header));
  addSlot(FOOTER_BLOCK_ID, findTemplate(FOOTER_TEMPLATES, starter.footer));

  const bodyTemplate: TSlotTemplate = {
    id: name,
    name: { en: name, zh: name },
    description: { en: '', zh: '' },
    containerStyle: {},
    nodes: starter.body,
  };
  const { childrenIds: bodyIds, blocks: bodyBlocks } = flattenTemplate(bodyTemplate, `body-${name}`);
  Object.assign(doc, bodyBlocks);

  doc.root = {
    type: 'EmailLayout',
    data: {
      backdropColor: starter.backdropColor ?? '#F4F4F5',
      canvasColor: '#FFFFFF',
      textColor: '#111827',
      fontFamily: 'MODERN_SANS',
      borderRadius: 8,
      childrenIds: [HEADER_BLOCK_ID, ...bodyIds, FOOTER_BLOCK_ID],
    },
  } as TEditorBlock;

  return doc as TEditorConfiguration;
}

export const STARTER_TEMPLATE_NAMES = Object.keys(STARTERS);
