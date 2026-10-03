import type { ThemeRegistration } from 'shiki';

export default {
  name: 'carven-paper',
  type: 'light',
  colors: { 'editor.background': '#FCFAF7', 'editor.foreground': '#2E3B61' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#73746F' } },
    { scope: ['keyword', 'storage', 'variable.language'], settings: { foreground: '#BF401C' } },
    {
      scope: [
        'entity.name',
        'support.type',
        'support.class',
        'support.function',
        'variable.function',
      ],
      settings: { foreground: '#5144A1' },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'constant.character'],
      settings: { foreground: '#28704A' },
    },
    { scope: ['string'], settings: { foreground: '#8A5A24' } },
    { scope: ['variable'], settings: { foreground: '#2E3B61' } },
    { scope: ['invalid'], settings: { foreground: '#B32236' } },
  ],
} satisfies ThemeRegistration;
