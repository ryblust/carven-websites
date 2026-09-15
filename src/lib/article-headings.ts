export function articleHeadings(html: string) {
  return Array.from(html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h[23]>/g), (match) => ({
    level: Number(match[1]),
    id: match[2]!,
    title: match[3]!
      .replace(/<[^>]+>/g, '')
      .replace(
        /&(?:amp|lt|gt|quot|#39);/g,
        (entity) =>
          ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" })[entity] ??
          entity,
      ),
  }));
}
