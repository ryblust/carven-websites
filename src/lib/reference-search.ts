export interface ReferenceSearchSection {
  readonly id: string;
  readonly title: string;
  readonly symbols: string;
}

export function symbolParts(text: string) {
  return text.toLocaleLowerCase().split(/::|\./).filter(Boolean);
}
