// Generated Markdown stays deployment-independent. Apply the base during SSR and
// hydration so links also work without JavaScript and when opened in a new tab.
// Input is trusted, rendered Markdown; authored root paths never include the base.
export function articleHtmlWithBase(html: string, base: string) {
  const prefix = base.replace(/\/$/, '');
  if (!prefix) return html;
  return html.replace(/<(?:a|img)\b[^>]*>/g, (tag) =>
    tag.replace(
      /(\s(?:href|src)=)(["'])\/(?!\/)/g,
      (_, attribute, quote) => `${attribute}${quote}${prefix}/`,
    ),
  );
}
