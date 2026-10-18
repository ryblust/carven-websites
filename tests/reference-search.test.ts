import { describe, expect, it } from 'vitest';
import { referenceSearchSections } from '../scripts/content/reference-search';

describe('reference symbol extraction', () => {
  it('groups rendered code spellings and prose diagnostics under their actual headings', () => {
    const sections = referenceSearchSections(`
      <p><code>Value::parse</code> starts a tree. Ordinary prose stays out.</p>
      <h2 id="types">Public <code>Value</code> types</h2>
      <table><tr><td><code>UTF8ErrorKind</code></td><td><code>InvalidLead</code></td></tr></table>
      <h3 id="members">Array and object methods</h3>
      <pre><code><span>value</span><span>.</span><span>member_value_at</span>(index: usize)</code></pre>
      <p><code>value.member_value_at</code> is repeated.</p>
      <p>An invalid import reports CV-IMPORT-RESOLUTION.</p>
      <h2 id="next">Next section</h2>
      <p><code>finish</code></p>`);
    const members = sections.find((section) => section.id === 'members')!;
    expect(members.title).toBe('Array and object methods');
    expect(members.symbols.split(' ')).toEqual(
      expect.arrayContaining(['value.member_value_at', 'CV-IMPORT-RESOLUTION']),
    );
    expect(members.symbols).not.toContain('finish');
    expect(sections.find((section) => section.id === 'next')?.symbols).toContain('finish');
    expect(sections.flatMap((section) => section.symbols.split(' '))).not.toContain('Ordinary');
  });
});
