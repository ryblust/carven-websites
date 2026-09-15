import type { ThemeRegistration } from 'shiki';

// Syntax palette adapted from Vesper Black. Editor UI colors are intentionally omitted.
export default {
  name: 'carven-vesper-black',
  type: 'dark',
  colors: { 'editor.background': '#000000', 'editor.foreground': '#FFFFFF' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#929292' } },
    { scope: ['keyword', 'storage', 'variable.language'], settings: { foreground: '#A0A0A0' } },
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
    { scope: ['string', 'variable'], settings: { foreground: '#FFFFFF' } },
    { scope: ['invalid'], settings: { foreground: '#FF8080' } },
  ],
} satisfies ThemeRegistration;
