// One capture listener covers dynamically mounted code, editors, and dialogs.
// Updating the element directly keeps scroll feedback out of React rendering.
export function installScrollbars(root: Document) {
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  const scrolling = (event: Event) => {
    const element = event.target;
    if (!(element instanceof HTMLElement)) return;
    element.dataset.scrolling = 'true';
    clearTimeout(timers.get(element));
    timers.set(
      element,
      setTimeout(() => {
        delete element.dataset.scrolling;
        timers.delete(element);
      }, 800),
    );
  };
  root.addEventListener('scroll', scrolling, { capture: true, passive: true });
  return () => {
    root.removeEventListener('scroll', scrolling, true);
    for (const [element, timer] of timers) {
      clearTimeout(timer);
      delete element.dataset.scrolling;
    }
    timers.clear();
  };
}
