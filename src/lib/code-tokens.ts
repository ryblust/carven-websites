export interface CodeToken {
  content: string;
  htmlStyle?: Record<string, string | number>;
  color?: string;
}

export interface CodeStep {
  tokens: CodeToken[];
  matches: Partial<Record<string, [number, number][]>>;
}
