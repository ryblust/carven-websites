import { useHydrated, useLocation, useNavigate } from '@tanstack/react-router';
import { translate, type Locale } from '../lib/i18n';
import '../styles/hero-sketch.css';
import { LocaleText } from './LocaleText';
import parse from 'html-react-parser';
import { hero } from '../generated/hero';

// Article sketches and the homepage project share the site palette.
export function Sketch({
  kind = 'flow',
  locale = 'en',
}: {
  kind?: 'flow' | 'values';
  locale?: Locale;
}) {
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

  return <ProjectSketch locale={locale} />;
}

function ProjectSketch({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const hydrated = useHydrated();
  const hash = useLocation({ select: (location) => location.hash });
  const navigate = useNavigate();
  const selected = hydrated && hash === 'example-build' ? 'build.cv' : 'main.cv';
  const files = ['main.cv', 'build.cv'] as const;

  return (
    <figure className="hero-language">
      <div className="language-blueprint">
        <div className="language-project">
          <div className="language-file-heading">
            <div
              className="language-files"
              role="group"
              aria-label={t('示例项目文件', 'Example project files')}
            >
              {files.map((file) => (
                <button
                  key={file}
                  type="button"
                  aria-pressed={selected === file}
                  aria-controls={file === 'main.cv' ? 'hero-main' : 'hero-build'}
                  onClick={() =>
                    void navigate({
                      hash: file === 'build.cv' ? 'example-build' : '',
                      replace: true,
                      resetScroll: false,
                      hashScrollIntoView: false,
                    })
                  }
                >
                  {file}
                </button>
              ))}
            </div>
            <span className="language-project-name">hello/</span>
          </div>
          <div className="language-source-stage">
            {files.map((file) => (
              <div
                key={file}
                id={file === 'main.cv' ? 'hero-main' : 'hero-build'}
                className="language-source"
                aria-label={t(`${file} 源码`, `${file} source`)}
                aria-hidden={selected !== file}
                inert={selected !== file}
                data-active={selected === file}
              >
                {parse(hero[file]!)}
              </div>
            ))}
          </div>
          <dl
            className="language-workflow"
            aria-label={t('在项目目录中运行的命令', 'Commands in the project directory')}
          >
            <div>
              <dt>
                <code>carven run</code>
              </dt>
              <dd>
                <samp>Hello, World!</samp>
              </dd>
            </div>
            <div>
              <dt>
                <code>carven test</code>
              </dt>
              <dd>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m4 10 4 4 8-9" />
                </svg>
                <LocaleText locale={locale} zh="greeting 内联测试" en="greeting inline test" />
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <figcaption>
        <LocaleText
          locale={locale}
          zh="函数和测试写在一起，用 build.cv 声明原生项目。"
          en="Keep the function and test together. Declare the native project in build.cv."
        />
      </figcaption>
    </figure>
  );
}
