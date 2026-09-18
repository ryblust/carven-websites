// Both authored versions remain readable in static HTML. Enhance only complete pairs.
export function enhanceCodeComparisons(root: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  root.querySelectorAll<HTMLElement>('.code-comparison').forEach((comparison) => {
    const panels = Array.from(
      comparison.querySelectorAll<HTMLElement>(':scope > [data-code-choice]'),
    );
    if (panels.length !== 2) return;
    const group = root.ownerDocument.createElement('div');
    group.className = 'comparison-switch';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', comparison.getAttribute('aria-label') ?? 'Code');
    const buttons = panels.map((panel, index) => {
      const button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.textContent = panel.dataset.codeChoice ?? '';
      const select = () => {
        panels.forEach((item, active) => {
          item.hidden = active !== index;
          buttons[active]!.setAttribute('aria-pressed', String(active === index));
        });
      };
      button.addEventListener('click', select);
      cleanups.push(() => button.removeEventListener('click', select));
      group.append(button);
      return button;
    });
    comparison.prepend(group);
    buttons[0]!.click();
    cleanups.push(() => {
      group.remove();
      panels.forEach((panel) => {
        panel.hidden = false;
      });
    });
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}
