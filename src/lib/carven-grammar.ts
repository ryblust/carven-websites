import type { LanguageRegistration } from 'shiki';
// Presentation grammar only. Language rules remain in the compiler repository.
export default {
  name: 'carven',
  scopeName: 'source.carven',
  aliases: ['cv'],
  repository: {},
  patterns: [
    { name: 'comment.line.double-slash.carven', match: '//.*$' },
    { name: 'comment.block.carven', begin: '/\\*', end: '\\*/' },
    {
      name: 'string.quoted.double.carven',
      begin: '"',
      end: '"',
      patterns: [{ name: 'constant.character.escape.carven', match: '\\\\.' }],
    },
    {
      name: 'string.quoted.single.carven',
      begin: "'",
      end: "'",
      patterns: [{ name: 'constant.character.escape.carven', match: '\\\\.' }],
    },
    { name: 'entity.name.function.carven', match: '\\b(?<=fn )\\w+' },
    {
      name: 'keyword.control.carven',
      match:
        '\\b(fn|struct|enum|let|var|const|return|if|else|for|in|while|break|continue|match|throw|try|catch|rethrow|import|export|private|using|test|as)\\b',
    },
    {
      name: 'storage.type.carven',
      match: '\\b(i8|i16|i32|i64|u8|u16|u32|u64|isize|usize|f32|f64|bool|char|str|void)\\b',
    },
    { name: 'entity.name.function.carven', match: '\\b[a-z_][A-Za-z0-9_]*(?=\\s*\\()' },
    { name: 'constant.language.carven', match: '\\b(true|false)\\b' },
    { name: 'constant.numeric.carven', match: '\\b[0-9]+(?:\\.[0-9]+)?\\b' },
    { name: 'entity.name.type.carven', match: '\\b[A-Z][A-Za-z0-9_]*\\b' },
  ],
} satisfies LanguageRegistration;
