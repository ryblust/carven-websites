// Small, code-native pen drawings share the palette in both themes.
export function Sketch({ kind = 'flow' }: { kind?: 'flow' | 'values' }) {
  if (kind === 'values') {
    return (
      <svg className="article-sketch" viewBox="0 0 240 140" fill="none" aria-hidden="true">
        <g transform="rotate(-7 80 40)">
          <path d="M13 19 142 17 145 68 16 70Z M9 24l2 49 127-1" />
          <text x="28" y="50">
            var x = 1
          </text>
        </g>
        <path d="M158 35q36-8 39 27m-10-7 11 9 5-13" />
        <g transform="rotate(-5 173 100)">
          <path d="m117 81 103-2 2 45-106 1Z" />
          <text x="139" y="110">
            x = 2
          </text>
        </g>
        <path d="m217 38 8-8m-22 0 3-10m19 32 11-2" />
      </svg>
    );
  }
  return (
    <svg className="hero-sketch" viewBox="0 0 520 390" fill="none" aria-hidden="true">
      <path
        className="sketch-grid"
        d="M40 70h440M40 110h440M40 150h440M40 190h440M40 230h440M40 270h440M40 310h440M80 40v310m40-310v310m40-310v310m40-310v310m40-310v310m40-310v310m40-310v310m40-310v310m40-310v310m40-310v310"
      />
      <g transform="rotate(-6 185 130)">
        <path className="sketch-paper" d="M72 48 287 51 289 213 69 209Z" />
        <path d="m65 57-2 159 216 4M73 83l213 3" />
        <circle cx="88" cy="67" r="2" />
        <circle cx="99" cy="67" r="2" />
        <circle cx="110" cy="67" r="2" />
        <text className="sketch-label" x="205" y="72">
          main.cv
        </text>
        <text x="94" y="121">
          let idea = 42;
        </text>
        <text x="94" y="154">
          println(idea);
        </text>
        <path className="sketch-accent" d="M93 163q58-4 131 0m-128 6 86-1" />
        <text className="sketch-label" x="94" y="191">
          a little more clarity.
        </text>
      </g>
      <path
        className="sketch-accent"
        d="M308 101c108-17 136 64 80 120m-1-20-3 23 23-4M322 83l7-14m-28 11 1-14m42 27 16-7"
      />
      <g transform="rotate(5 345 286)">
        <path className="sketch-paper" d="m240 238 206-2 3 102-212 1Z" />
        <path d="m246 344 208-1 1-97M242 266l203-2" />
        <text className="sketch-label" x="259" y="256">
          native C++
        </text>
        <text x="266" y="309">
          $ 42
        </text>
        <path className="sketch-accent" d="m385 299 9 10 20-25" />
      </g>
      <path
        className="sketch-accent"
        d="m111 268 5 15 16 5-16 5-5 16-5-16-16-5 16-5ZM52 253l-9 8m13-25-14-3M180 325q13 16 34 9"
      />
      <text className="sketch-note" x="318" y="169" transform="rotate(10 318 169)">
        same power.
      </text>
      <text className="sketch-note" x="330" y="191" transform="rotate(10 330 191)">
        less noise.
      </text>
    </svg>
  );
}
