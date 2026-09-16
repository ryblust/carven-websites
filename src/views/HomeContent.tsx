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
      label: t('读取端口', 'Read a port'),
      title: t('恢复一种失败，上层就少一种责任。', 'Handle a failure. Narrow the contract.'),
      detail: t(
        '配置缺失时使用 8080；没有读取权限或端口格式不对，仍交给调用者处理。恢复 Missing 后，函数契约只剩 Denied 和 BadPort。',
        'Use 8080 when the config is missing. Leave denied access and invalid ports to the caller. Handling Missing leaves only Denied and BadPort in the contract.',
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
      label: t('编译期拼接文本', 'Compile-time text'),
      title: t('构造时可以修改，运行时只剩结果。', 'Mutable while building. Static when shipped.'),
      detail: t(
        '用循环拼接菜单，不必先算字符数或为结果另备数组。Carven 在编译期构造 String，再把结果冻结为静态 str。',
        'Join menu items in a loop, without first calculating a character count or supplying a storage array. Carven builds a String at compile time, then freezes the result into a static str.',
      ),
      html: homeExamples.constants,
      cpp: homeExamples.constantsCpp,
      result: t(
        '可变 String → 静态 str · Home / Docs / About',
        'Mutable String → Static str · Home / Docs / About',
      ),
      comparison: t(
        '两边用相同的循环拼接三个菜单项。C++20 的 constexpr string 可以参与计算；这里用 freeze 模板按计算出的长度建立数组，保存字符，再让 string_view 引用它。Carven 在常量初始化时完成这一步。C++ 示例是手写等价代码，也可以采用其他静态字符串封装。',
        'Both join three items with the same loop. C++20 constexpr string handles the computation; the freeze template sizes an array from the result, stores its characters, and gives string_view lasting storage. Carven does this at constant initialization. The C++ is handwritten; a static-string library could encapsulate this work.',
      ),
      standard: 'C++20',
      path: '/features/compile-time/',
    },
    {
      label: t('读取 JSON', 'Read JSON'),
      title: t('现成的 C++ 库，直接用。', 'Use the C++ library you already have.'),
      detail: t(
        '用 nlohmann/json 解析配置，调用 JSON 对象的方法读取端口。导入原生头文件即可使用这些接口，无需为这个调用另写绑定。',
        'Parse config with nlohmann/json, then read the port through its JSON object. Import the native header and use these APIs without writing a binding for this call.',
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
            {t('了解这项能力', 'Explore this feature')} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <section className="why-native" aria-labelledby="native-heading">
        <p className="why-eyebrow">{t('继续使用你的 C++ 工具链', 'Native integration')}</p>
        <h2 id="native-heading">
          {t('原生库、构建与调试，继续使用。', 'Build on the C++ tools you already use.')}
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
