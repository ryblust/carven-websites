import { useState } from 'react';
import { MorphingCode } from '../components/MorphingCode';
import { Link } from '@tanstack/react-router';
import { localizedPath, translate, type Locale } from '../lib/i18n';
import { href } from '../lib/site';
import { homeExamples } from '../generated/home-examples';
import '../styles/home.css';

export default function HomeContent({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const [selected, setSelected] = useState(0);
  const [language, setLanguage] = useState<'carven' | 'cpp'>('carven');
  const examples = [
    {
      label: t('失败处理', 'Handle failures'),
      title: t('恢复一种失败，上层就少一种责任。', 'Handle a failure. Narrow the contract.'),
      detail: t(
        '配置缺失，就用默认端口。你写成功路径和恢复规则，Carven 处理传播，并检查剩下的失败契约。',
        'Use a default port when the config is missing. Write the success path and recovery rule; Carven handles propagation and checks the remaining failure contract.',
      ),
      html: homeExamples.failures,
      cpp: homeExamples.failuresCpp,
      result: t(
        'Missing → 8080 · Denied + BadPort → 调用者',
        'Missing → 8080 · Denied + BadPort → caller',
      ),
      comparison: t(
        '两边都省略错误类型及 read、parse 的实现。read 读取端口文本，可能产生 Missing 或 Denied；parse 将文本解析为端口，可能产生 BadPort。Carven 注释列出提供者契约。C++23 用 expected、variant 和分支实现同样的返回值与失败类型；异常或其他库可以提供不同写法。这里展示的是手写等价代码，不是编译器输出。',
        'Both omit error types and the implementations of read and parse. read supplies port text or Missing / Denied; parse returns a port or BadPort. Carven comments summarize those contracts. C++23 uses expected, variant, and branches to preserve the same results and failure types; exceptions or other libraries offer different approaches. This is a handwritten equivalent, not compiler output.',
      ),
      standard: 'C++23',
      path: '/features/failure-contracts/',
    },
    {
      label: t('编译期生成', 'Build at compile time'),
      title: t('构造时可以修改，运行时只剩结果。', 'Mutable while building. Static when shipped.'),
      detail: t(
        '从配置生成启用的接口清单，照常写循环、判断和文本追加。Carven 在编译期完成构造，将结果保存为静态文本。',
        'Build a list of enabled endpoints from configuration, using ordinary loops, conditions, and text operations. Carven runs the construction at compile time and keeps the result as static text.',
      ),
      html: homeExamples.constants,
      cpp: homeExamples.constantsCpp,
      result: t(
        '编译期结果 · 静态 str\n/health\n/users',
        'Compile-time result · Static str\n/health\n/users',
      ),
      comparison: t(
        '两边筛选相同的路由配置，生成以换行分隔的路径文本；这里不创建 HTTP 路由器。C++20 用 constexpr string 构造，再用 freeze 模板按结果长度建立持久数组，供 string_view 引用。Carven 在常量初始化时将临时 String 冻结为静态 str。对照是手写等价实现；静态字符串库也可以封装这项存储工作。',
        'Both filter the same route configuration into newline-separated path text; this does not create an HTTP router. C++20 builds with constexpr string, then freeze sizes lasting array storage for a string_view. Carven freezes the temporary String into a static str at constant initialization. The comparison is handwritten; a static-string library could encapsulate the storage work.',
      ),
      standard: 'C++20',
      path: '/features/compile-time/',
    },
    {
      label: t('调用 C++', 'Use C++ libraries'),
      title: t('现成的 C++ 库，直接用。', 'Use the C++ library you already have.'),
      detail: t(
        '导入 nlohmann/json，解析配置，调用对象方法。这个调用无需另写绑定，现成的 C++ 库继续为你工作。',
        'Import nlohmann/json, parse the config, and call its object methods. No binding is needed for this call; the C++ library you already use keeps doing the work.',
      ),
      html: homeExamples.native,
      cpp: homeExamples.nativeCpp,
      result: t(
        'nlohmann/json → 配置对象 → Port: 9000',
        'nlohmann/json → config object → Port: 9000',
      ),
      comparison: t(
        '使用 nlohmann/json 3.12.0，两边读取相同的 JSON；port 缺失时返回 8080。示例输入是合法对象，port 存在时为范围内的整数。头文件需在 C++ 包含路径中，库的重载与模板仍由 C++ 编译器检查。原生异常不会变成 Carven failure；需要恢复时在 C++ 适配层处理。详情页提供运行步骤。',
        'Uses nlohmann/json 3.12.0. Both read the same JSON and use 8080 when port is absent. Input is a valid object; an existing port is an in-range integer. Put the header on the C++ include path. The C++ compiler checks library overloads and templates. Native exceptions do not become Carven failures; handle them in a C++ adapter when recovery is needed. The linked tutorial includes run instructions.',
      ),
      standard: 'C++20',
      path: '/learn/interop/',
    },
  ] as const;
  const example = examples[selected]!;
  return (
    <div className="home-page">
      <section className="home-intro" aria-labelledby="home-heading">
        <img
          className="home-art"
          src={href('brand/carven-light-hero.webp')}
          width={1672}
          height={941}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <div className="home-hero-copy">
          <h1 id="home-heading">Carven</h1>
          <p className="home-tagline">
            The power of C++,
            <br />
            in the palm of your hand.
          </p>
          <p className="why-lead">
            {t(
              '一门编译为 C++ 的语言，沿用你的原生库与工具链。',
              'A language that compiles to C++, with your native libraries and toolchain.',
            )}
          </p>
          <div className="home-actions">
            <Link className="button button-primary" to={localizedPath('/learn/', locale)}>
              {t('开始学习', 'Start learning')} <span aria-hidden="true">→</span>
            </Link>
            <Link to={localizedPath('/reference/', locale)}>
              Reference <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section
        id="why-carven"
        className="why-demo"
        aria-label={t('Carven 代码示例', 'Carven code examples')}
      >
        <header className="home-demo-intro">
          <p className="why-eyebrow">{t('建立在 C++ 之上', 'Built on C++')}</p>
          <h2>
            <span>{t('意图，交给 Carven。', 'Express intent with Carven.')}</span>
            <span>{t('力量，来自 C++。', 'Build on the power of C++.')}</span>
          </h2>
          <p className="home-demo-lead">
            {t(
              '让语言处理失败传播与常量存储，继续使用现成的 C++ 库。切换代码，对比同一任务的两种写法。',
              'Let the language handle failure propagation and constant storage. Keep using your C++ libraries. Switch code to compare two ways to express the same task.',
            )}
          </p>
        </header>
        <div className="why-comparison">
          <div className="why-demo-caption" aria-live="polite" aria-atomic="true">
            <p className="why-eyebrow">{t('同一个任务', 'The same task')}</p>
            <h3>{example.title}</h3>
            <p>{example.detail}</p>
            <Link to={localizedPath(example.path, locale)}>
              {t('探索这项能力', 'Explore this feature')} <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="why-demo-surface">
            <div
              className="why-selectors"
              role="group"
              aria-label={t('选择示例', 'Choose an example')}
            >
              {examples.map((item, index) => (
                <button
                  key={item.path}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="why-demo-body">
              <div className="why-code-label">
                <div
                  className="code-language-switch"
                  role="group"
                  aria-label={t('代码语言', 'Code language')}
                >
                  <button
                    type="button"
                    aria-pressed={language === 'carven'}
                    onClick={() => setLanguage('carven')}
                  >
                    Carven
                  </button>
                  <button
                    type="button"
                    aria-pressed={language === 'cpp'}
                    onClick={() => setLanguage('cpp')}
                  >
                    C++
                  </button>
                </div>
                <span>
                  {language === 'carven'
                    ? t('Carven 源码', 'Carven source')
                    : `${example.standard} · ${t('手写等价示例', 'Handwritten equivalent')}`}
                </span>
              </div>
              <MorphingCode html={language === 'carven' ? example.html : example.cpp} />
              <p className="why-result">{example.result}</p>
              <details className="why-example-details" key={selected}>
                <summary>{t('对照条件与边界', 'Comparison scope and limits')}</summary>
                <p>{example.comparison}</p>
              </details>
            </div>
          </div>
        </div>
      </section>
      <section className="why-native" aria-labelledby="native-heading">
        <p className="why-eyebrow">{t('继续使用你的 C++ 工具链', 'Native integration')}</p>
        <h2 id="native-heading">
          {t('更高阶的表达，扎根原生能力。', 'Higher-level expression. Native foundations.')}
        </h2>
        <p>
          {t(
            '产物是可检查、可编译的 C++。Carven 检查访问、所有权与失败契约；C++ 工具链负责原生编译、链接和优化。',
            'The output is inspectable, compilable C++. Carven checks access, ownership, and failure contracts; your C++ toolchain handles native compilation, linking, and optimization.',
          )}
        </p>
        <div className="why-actions">
          <Link className="button button-primary" to={localizedPath('/learn/', locale)}>
            {t('写第一个程序', 'Write your first program')} <span aria-hidden="true">→</span>
          </Link>
          <Link to={localizedPath('/use-cases/', locale)}>
            {t('接入现有工程', 'Integrate with your project')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
