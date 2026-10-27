import { Link } from '@tanstack/react-router';
import { ArrowRight, Boxes, GitBranch, ScanLine, FlaskConical } from 'lucide-react';
import { localizedPath, type Locale } from '../lib/i18n';
import { Wordmark } from '../components/Brand';
import { Sketch } from '../components/Sketch';
import { LocaleText } from '../components/LocaleText';
import { UIIcon } from '../components/UIIcon';
import compiler from '../../carven-version.json' with { type: 'json' };
import '../styles/home.css';

export default function Home({ locale }: { locale: Locale }) {
  const t = (zh: string, en: string) => <LocaleText locale={locale} zh={zh} en={en} />;

  return (
    <div className="home-page">
      <section className="container home-intro" aria-labelledby="home-heading">
        <div className="home-hero-copy">
          <p className="eyebrow">
            <a href={`https://github.com/ryblust/carven/releases/tag/v${compiler.version}`}>
              {t(`Carven ${compiler.version} 已发布`, `Carven ${compiler.version} is available`)}
            </a>
          </p>
          <h1 id="home-heading">
            <span className="sr-only">Carven</span>
            <Wordmark priority />
          </h1>
          <p className="home-tagline">
            The power of C++,
            <br />
            in the palm of your hand.
          </p>
          <p className="home-lead">
            {t(
              '用清晰的所有权、类型化失败和异步任务编写原生软件。测试写在源码里，构建也用同一种语言；需要与外部系统协作时，接入 C++ 或宿主程序。',
              'Write native software with explicit ownership, typed failures, and async tasks. Write tests inline, build in the same language, and connect to C++ or a host application.',
            )}
          </p>
          <div className="home-actions">
            <Link
              className="button button-primary"
              to={localizedPath('/learn/first-program/', locale)}
            >
              {t('安装 Carven', 'Install Carven')}
            </Link>
            <a className="text-link" href="#language">
              {t('认识这门语言', 'Explore the language')} <UIIcon icon={ArrowRight} />
            </a>
          </div>
        </div>
        <Sketch locale={locale} />
      </section>

      <section className="container home-story" id="language" aria-labelledby="story-heading">
        <header className="home-section-head">
          <p className="eyebrow">{t('从语言到项目', 'From language to project')}</p>
          <h2 id="story-heading">
            {t('把意图写清楚，把软件做扎实。', 'Clear intent. Solid software.')}
          </h2>
          <p>
            {t(
              'Carven 将源码编译为 C++20。从数据的生命周期，到任务如何失败，再到项目怎样构建，让这些约定直接体现在代码里。',
              'Carven compiles to C++20. Express data lifetimes, task failures, and project builds directly in your code.',
            )}
          </p>
        </header>
        <div className="home-principles">
          {[
            {
              icon: ScanLine,
              title: ['数据如何使用，一目了然。', 'Make ownership visible.'],
              description: [
                '区分借用、修改与所有权转移，让函数的参数说明它会如何使用数据。',
                'Distinguish borrowing, mutation, and ownership transfer. Function parameters show how data will be used.',
              ],
              link: ['所有权与生命周期', 'Ownership and lifetimes'],
              path: '/reference/ownership/',
            },
            {
              icon: GitBranch,
              title: ['异步协作，失败有据可循。', 'Compose tasks with explicit failures.'],
              description: [
                '用异步任务组织并发工作，用类型声明可能的失败，在调用处选择处理或传播。',
                'Organize concurrent work with async tasks. Declare possible failures as types, then handle or propagate them at the call site.',
              ],
              link: ['异步任务', 'Async tasks'],
              path: '/reference/async/',
            },
            {
              icon: FlaskConical,
              title: ['源码、测试和构建，在一起。', 'Keep source, tests, and builds together.'],
              description: [
                '把内联测试写在实现旁，用 build.cv 组织项目，再用 carven test 一次运行项目的测试。',
                'Write inline tests beside the implementation, organize the project with build.cv, and run its tests with carven test.',
              ],
              link: ['构建与内联测试', 'Builds and inline tests'],
              path: '/learn/build/',
            },
            {
              icon: Boxes,
              title: ['复用 C++，连接宿主。', 'Reuse C++. Connect to a host.'],
              description: [
                '调用已有的 C++ 库，或将选定的 API 导出到 C++ 头文件。宿主也可以通过持久会话调用 Carven，并替换实现。',
                'Call existing C++ libraries or export selected APIs to C++ headers. Hosts can also call Carven through persistent sessions and replace implementations.',
              ],
              link: ['互操作与宿主集成', 'Interop and hosting'],
              path: '/reference/interop/',
            },
          ].map(({ icon, title, description, link, path }) => (
            <article className="home-principle" key={path}>
              <UIIcon icon={icon} className="home-principle-icon" />
              <h3>{t(title[0]!, title[1]!)}</h3>
              <p>{t(description[0]!, description[1]!)}</p>
              <Link className="text-link" to={localizedPath(path, locale)}>
                {t(link[0]!, link[1]!)} <UIIcon icon={ArrowRight} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="container home-start" aria-labelledby="start-heading">
        <div>
          <p className="eyebrow">{t('开始自己的项目', 'Make it your own')}</p>
          <h2 id="start-heading">{t('下一件工具，由你来写。', 'Build your next tool.')}</h2>
          <p>
            {t(
              '从安装工具链开始，编译并运行你的第一个原生程序。',
              'Install the toolchain, then compile and run your first native program.',
            )}
          </p>
        </div>
        <div className="home-actions">
          <Link
            className="button button-primary"
            to={localizedPath('/learn/first-program/', locale)}
          >
            {t(`安装 Carven ${compiler.version}`, `Install Carven ${compiler.version}`)}
          </Link>
        </div>
      </section>
    </div>
  );
}
