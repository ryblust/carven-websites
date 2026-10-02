import type { ThemeRegistration } from 'shiki';

// Syntax palette adapted from Vesper Black. Editor UI colors are intentionally omitted.
export default {
  name: 'carven-vesper-black',
  type: 'dark',
  colors: { 'editor.background': '#1D2026', 'editor.foreground': '#D8DDEA' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#9A9FAA' } },
    { scope: ['keyword', 'storage', 'variable.language'], settings: { foreground: '#E9A080' } },
    {
      scope: [
        'entity.name',
        'support.type',
        'support.class',
        'support.function',
        'variable.function',
        'constant.numeric',
        'constant.language',
        'constant.character',
      ],
      settings: { foreground: '#FFC799' },
    },
    { scope: ['string', 'variable'], settings: { foreground: '#D8DDEA' } },
    { scope: ['invalid'], settings: { foreground: '#FF8080' } },
  ],
} satisfies ThemeRegistration;
