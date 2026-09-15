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
      label: t('类型失败契约', 'Typed failure contracts'),
      title: t('恢复一种失败，上层就少一种责任。', 'Handle a failure. Narrow the contract.'),
      detail: t(
        '配送不可用时退回商品金额。商品校验的失败保留原有类型与载荷，继续向调用者传播。',
        'Fall back to the item total when delivery is unavailable. Item failures keep their types and payloads as they propagate.',
      ),
      html: homeExamples.failures,
      cpp: homeExamples.failuresCpp,
      result: t(
        '三种失败进入 · 恢复 DeliveryError · 两种失败向外',
        'Three failures in · DeliveryError handled · Two failures out',
      ),
      comparison: t(
        'Carven 检查失败集合与传播出口；手写 C++23 用 expected、variant 和分支组织同一恢复流程。双方省略错误定义和提供者：line_total 返回商品结果，delivery_fee 只可能产生 DeliveryError；金额假定不溢出。',
        'Carven checks failure sets and propagation; handwritten C++23 uses expected, variant, and branches for the same recovery flow. Both omit error definitions and providers: line_total returns an item result; delivery_fee can only fail with DeliveryError. Amounts are assumed not to overflow.',
      ),
      standard: 'C++23',
      path: '/features/failure-contracts/',
    },
    {
      label: t('构造静态数据', 'Build static data'),
      title: t('构造时可以修改，运行时只剩结果。', 'Mutable while building. Static when shipped.'),
      detail: t(
        '循环、格式化和文本增长在 Carven 编译期完成。String 冻结为静态 str，测试也在编译期验证。',
        'Carven runs the loop, formatting, and text growth at compile time. The String freezes into a static str, verified by a compile-time test.',
      ),
      html: homeExamples.constants,
      cpp: homeExamples.constantsCpp,
      result: t(
        '可变 String → 静态 str · "[00][01][02]"',
        'Mutable String → Static str · "[00][01][02]"',
      ),
      comparison: t(
        '同样生成 [00][01][02]。Carven 用文本操作构造并冻结结果；这份 C++20 写法显式确定数组容量、写入字符，再建立静态视图。C++ 示例支持 0–100 个两位标签。',
        'Both produce [00][01][02]. Carven builds text and freezes the result; this C++20 implementation sizes an array, writes characters, and creates a static view. The C++ example supports 0–100 two-digit labels.',
      ),
      standard: 'C++20',
      path: '/features/compile-time/',
    },
    {
      label: t('连接原生工程', 'Connect native code'),
      title: t('复用 C++ 的库，也把接口交回 C++。', 'Use C++ libraries. Export a C++ interface.'),
      detail: t(
        '直接调用原生数学库，导出供 C++ 使用的标量接口。公开声明与实现由编译器分别生成。',
        'Call the native math library and export a scalar interface for C++ callers. The compiler generates its public declaration and implementation.',
      ),
      html: homeExamples.native,
      cpp: homeExamples.nativeCpp,
      result: t(
        '原生数学库 → Carven 函数 → 生成的 C++ 公共 API',
        'Native math library → Carven function → Generated C++ API',
      ),
      comparison: t(
        '同样公开一个调用 hypot 的函数。Carven 从一份声明生成接口与实现；手写 C++ 分别维护头文件和实现文件。这里用 app 命名空间示意，Carven 导出的实际命名空间由模块决定。',
        'Both expose a function calling hypot. Carven generates an interface and implementation from one declaration; handwritten C++ maintains a header and source file. app is illustrative; Carven export namespaces follow the module.',
      ),
      standard: 'C++20',
      path: '/features/cpp-generation/',
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
          <p className="why-eyebrow">{t('从表达，到实现', 'From expression to implementation')}</p>
          <h2>
            <span>{t('把程序意图', 'Express your intent')}</span>
            <span>{t('编译成 C++', 'Compile it to C++')}</span>
          </h2>
        </header>
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
          <div className="why-demo-body" aria-live="polite" aria-atomic="true">
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
              <span>{language === 'carven' ? '.cv' : example.standard}</span>
            </div>
            <MorphingCode html={language === 'carven' ? example.html : example.cpp} />
            <p className="why-result">{example.result}</p>
            <details className="why-example-details" key={selected}>
              <summary>{t('示例说明', 'Example notes')}</summary>
              <p>{example.comparison}</p>
            </details>
          </div>
        </div>
        <div className="why-demo-caption">
          <h3>{example.title}</h3>
          <p>{example.detail}</p>
          <Link to={localizedPath(example.path, locale)}>
            {t('展开这个例子', 'Explore this example')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="why-native" aria-labelledby="native-heading">
        <p className="why-eyebrow">{t('继续使用你的 C++ 工具链', 'Keep your C++ toolchain')}</p>
        <h2 id="native-heading">
          {t('原生库、构建与调试，继续使用。', 'Your libraries. Your build. Your debugger.')}
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
