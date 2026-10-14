import { htmlToDOM } from 'html-react-parser';
import { getElementsByTagName, textContent } from 'domutils';

export function articleHeadings(html: string) {
  return getElementsByTagName((name) => name === 'h2' || name === 'h3', htmlToDOM(html))
    .filter((heading) => heading.attribs.id)
    .map((heading) => ({
      level: Number(heading.name.slice(1)),
      id: heading.attribs.id!,
      title: textContent(heading),
    }));
}
