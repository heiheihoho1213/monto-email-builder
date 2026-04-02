export type VariableGroupId = 'contacts' | 'email' | 'organization' | 'date' | 'links';

export type VariableKind = 'user' | 'builtin';

export type VariableGroup = {
  id: VariableGroupId;
  items: { name: string; labelKey: string; kind: VariableKind }[];
};

/** 变量目录（基础内置项）。自定义联系人属性会在 UI 层动态追加。 */
export const BASE_VARIABLE_GROUPS: VariableGroup[] = [
  {
    id: 'contacts',
    items: [
      { name: 'first_name', labelKey: 'text.variables.firstName', kind: 'user' },
      { name: 'last_name', labelKey: 'text.variables.lastName', kind: 'user' },
      { name: 'middle_name', labelKey: 'text.variables.middleName', kind: 'user' },
    ],
  },
  {
    id: 'email',
    items: [
      { name: 'email', labelKey: 'text.variables.email', kind: 'user' },
      { name: 'alternative_email', labelKey: 'text.variables.alternativeEmail', kind: 'user' },
    ],
  },
  {
    id: 'organization',
    items: [
      { name: 'company', labelKey: 'text.variables.company', kind: 'user' },
      { name: 'address_line_1', labelKey: 'text.variables.addressLine1', kind: 'user' },
      { name: 'address_line_2', labelKey: 'text.variables.addressLine2', kind: 'user' },
      { name: 'country', labelKey: 'text.variables.country', kind: 'user' },
      { name: 'city', labelKey: 'text.variables.city', kind: 'user' },
      { name: 'state', labelKey: 'text.variables.state', kind: 'user' },
      { name: 'postal_code', labelKey: 'text.variables.postalCode', kind: 'user' },
      { name: 'recipient_company', labelKey: 'text.variables.recipientCompany', kind: 'user' },
      { name: 'recipient_address_line_1', labelKey: 'text.variables.recipientAddressLine1', kind: 'user' },
      { name: 'recipient_address_line_2', labelKey: 'text.variables.recipientAddressLine2', kind: 'user' },
      { name: 'recipient_country', labelKey: 'text.variables.recipientCountry', kind: 'user' },
      { name: 'recipient_city', labelKey: 'text.variables.recipientCity', kind: 'user' },
      { name: 'recipient_state', labelKey: 'text.variables.recipientState', kind: 'user' },
      { name: 'recipient_postal_code', labelKey: 'text.variables.recipientPostalCode', kind: 'user' },
    ],
  },
  {
    id: 'date',
    items: [
      { name: 'birthday', labelKey: 'text.variables.birthday', kind: 'user' },
      { name: 'current_date', labelKey: 'text.variables.currentDate', kind: 'builtin' },
      { name: 'current_year', labelKey: 'text.variables.currentYear', kind: 'builtin' },
      { name: 'current_month_name', labelKey: 'text.variables.currentMonthName', kind: 'builtin' },
      { name: 'current_weekday', labelKey: 'text.variables.currentWeekday', kind: 'builtin' },
    ],
  },
  {
    id: 'links',
    items: [{ name: 'unsubscribe_link', labelKey: 'text.variables.unsubscribeLink', kind: 'builtin' }],
  },
];

export function buildAllowedVariableNameSets(args: {
  baseGroups?: VariableGroup[];
  contactAttributes?: { AttrField: string; Enable?: number | boolean }[] | null;
}) {
  const base = args.baseGroups ?? BASE_VARIABLE_GROUPS;
  const allowedUser = new Set<string>();
  const allowedBuiltin = new Set<string>();

  for (const g of base) {
    for (const it of g.items) {
      if (it.kind === 'user') allowedUser.add(it.name);
      else allowedBuiltin.add(it.name);
    }
  }

  const attrs = Array.isArray(args.contactAttributes) ? args.contactAttributes : [];
  for (const a of attrs) {
    const en = (a as any)?.Enable;
    if (en === 0 || en === false) continue;
    const f = typeof (a as any)?.AttrField === 'string' ? (a as any).AttrField.trim() : '';
    if (!f) continue;
    allowedUser.add(f);
  }

  return { allowedUser, allowedBuiltin };
}

