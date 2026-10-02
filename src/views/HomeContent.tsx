import { useState } from 'react';
import { MorphingCode } from '../components/MorphingCode';
import { Link } from '@tanstack/react-router';
import { localizedPath, translate, type Locale } from '../lib/i18n';
import { Wordmark } from '../components/Brand';
import { Sketch } from '../components/Sketch';
import { repository } from '../lib/site';
import { homeExamples } from '../generated/home-examples';
import '../styles/home.css';

export default function HomeContent({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const [selected, setSelected] = useState(0);
  const [language, setLanguage] = useState<'carven' | 'cpp'>('carven');
  const examples = [
    {
      label: t('结构化打印', 'Print structured values'),
      title: t(
        '编译器知道字段名，你不用再写一遍。',
        'The compiler knows the fields. So does println.',
      ),
      detail: t(
        '结构体、枚举和数组直接交给 println，字段名、枚举成员和元素都会按结构打印。不用手写输出运算符，也不用反射库。',
        'Pass a struct, enum, or array to println and it prints field names, enum cases, and elements. No handwritten output operator or reflection library.',
      ),
      html: homeExamples.display,
      cpp: homeExamples.displayCpp,
      result: 'Order { id: 7, status: Status::Shipped(3), items: ["disk", "cable"] }',
      comparison: t(
        'Carven 的实际输出按每个字段、元素一行排列，这里的结果压缩成了一行。C++20 版本需要为每个类型手写 operator<<，字段增删后要同步修改，输出也更简略；main 与标准输出省略。Boost.PFR、magic_enum 或 C++26 反射可以减少这部分代码。同样的结构化显示也用于测试失败时报告的操作数值。',
        'Carven prints one field or element per line; the result is condensed here. The C++20 version writes an operator<< for each type, which must change when fields change, and prints a simpler layout; main and standard output are omitted. Boost.PFR, magic_enum, or C++26 reflection can reduce this code. The same structural display reports operand values when a test fails.',
      ),
      standard: 'C++20',
      path: '/learn/aggregates/',
    },
    {
      label: t('编译期生成', 'Build at compile time'),
      title: t('编译时构造，运行时直接使用。', 'Build at compile time. Use the result at runtime.'),
      detail: t(
        '从配置生成启用的接口清单，照常写循环、判断和文本追加。Carven 在编译期完成构造，将结果保存为静态文本，const test 在编译时就检查它。',
        'Build a list of enabled endpoints from configuration with ordinary loops, conditions, and text operations. Carven runs the construction at compile time, keeps the result as static text, and checks it with a const test during compilation.',
      ),
      html: homeExamples.constants,
      cpp: homeExamples.constantsCpp,
      result: t(
        '编译期结果 · 静态 str\n/health\n/users',
        'Compile-time result · Static str\n/health\n/users',
      ),
      comparison: t(
        '两边筛选相同的路由配置，生成以换行分隔的路径文本；这里不创建 HTTP 路由器。C++20 中 constexpr std::string 的内存不能保留到运行时，所以 freeze 先执行一次构造得到长度，再执行一次把内容复制进固定大小的数组，供 string_view 引用。Carven 在常量初始化时直接把 String 冻结为静态 str。对照是手写等价实现；静态字符串库也可以封装这项存储工作。',
        'Both filter the same route configuration into newline-separated path text; this does not create an HTTP router. In C++20, a constexpr std::string allocation cannot survive into runtime, so freeze runs the construction once for its length and again to copy it into a sized array behind a string_view. Carven freezes the String into a static str at constant initialization. The comparison is handwritten; a static-string library could encapsulate the storage work.',
      ),
      standard: 'C++20',
      path: '/features/compile-time/',
    },
    {
      label: t('失败处理', 'Handle failures'),
      title: t('恢复一种失败，契约就少一种。', 'Handle a failure. Narrow the contract.'),
      detail: t(
        '配置缺失时使用默认端口。编译器算出剩下的失败：契约少写 BadPort 会报错，调用者漏处理某种失败时，错误信息会指出漏掉的类型。',
        'Use a default port when the config is missing. The compiler computes the failures that remain: leave BadPort out of the contract and it reports an error; a caller that misses a failure is told which type is uncovered.',
      ),
      html: homeExamples.failures,
      cpp: homeExamples.failuresCpp,
      result: t(
        'Missing → 8080 · Denied + BadPort → 调用者',
        'Missing → 8080 · Denied + BadPort → caller',
      ),
      comparison: t(
        '两边都省略错误类型及 read、parse 的实现。read 读取端口文本，可能产生 Missing 或 Denied；parse 将文本解析为端口，可能产生 BadPort。Carven 注释列出提供者契约。C++23 用 expected、variant 和分支实现同样的返回值与失败类型，剩余失败类型由你手动维护；异常或其他库可以提供不同写法。这里展示的是手写等价代码，不是编译器输出。',
        'Both omit error types and the implementations of read and parse. read supplies port text or Missing / Denied; parse returns a port or BadPort. Carven comments summarize those contracts. C++23 uses expected, variant, and branches to preserve the same results and failure types, and you maintain the remaining failure list by hand; exceptions or other libraries offer different approaches. This is a handwritten equivalent, not compiler output.',
      ),
      standard: 'C++23',
      path: '/features/failure-contracts/',
    },
    {
      label: t('调用 C++', 'Use C++ libraries'),
      title: t('现成的 C++ 库，直接用。', 'Use the C++ library you already have.'),
      detail: t(
        '导入 nlohmann/json，解析配置，再调用返回对象的方法。这个示例直接使用库提供的接口，无需另写绑定。',
        'Import nlohmann/json, parse the config, and call methods on the returned object. This example uses the library’s own API without a separate binding.',
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
  const steps = [
    {
      title: t('编写 Carven', 'Write Carven'),
      detail: t(
        '在源码中写明读取、修改还是转移所有权，以及哪些失败会向外传递。编译器在生成代码前检查这些契约。',
        'State whether code reads, mutates, or takes ownership, and which failures can escape. The compiler checks these contracts before generating code.',
      ),
      command: 'main.cv',
    },
    {
      title: t('生成 C++', 'Generate C++'),
      detail: t(
        'compile 输出 C++20 源文件，可以直接打开阅读，也可以放进现有构建。',
        'compile writes C++20 source files you can open, read, and add to an existing build.',
      ),
      command: 'carven compile -o generated main.cv',
    },
    {
      title: t('原生构建', 'Build natively'),
      detail: t(
        '你的 C++ 编译器负责编译、链接与优化。直接运行源文件时默认使用 clang++，可用 CXX 指定其他编译器。',
        'Your C++ compiler handles compilation, linking, and optimization. Running a source file directly uses clang++ by default; set CXX to choose another compiler.',
      ),
      command: 'carven main.cv',
    },
  ];
  return (
    <div className="home-page">
      <section className="home-intro" aria-labelledby="home-heading">
        <div className="home-hero-copy">
          <p className="eyebrow">
            {t('原生的力量 · 清晰的表达', 'Native power · Clear expression')}
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
              '一门编译为 C++ 的语言，让你继续使用熟悉的库和工具链。',
              'A language that compiles to C++ and works with your existing libraries and toolchain.',
            )}
          </p>
          <div className="home-actions">
            <Link className="button button-primary" to={localizedPath('/learn/', locale)}>
              {t('开始学习', 'Start learning')} <span aria-hidden="true">→</span>
            </Link>
            <Link className="button button-secondary" to={localizedPath('/reference/', locale)}>
              {t('语言参考', 'Reference')}
            </Link>
          </div>
        </div>
        <Sketch />
      </section>

      <section id="why-carven" className="home-section showcase" aria-labelledby="showcase-heading">
        <header className="section-head">
          <p className="eyebrow">{t('建立在 C++ 之上', 'Built on C++')}</p>
          <h2 id="showcase-heading">
            <span>{t('意图，交给 Carven。', 'Express intent with Carven.')}</span>
            <span>{t('力量，来自 C++。', 'Build on the power of C++.')}</span>
          </h2>
          <p>
            {t(
              '直接打印结构体、在编译期构造文本、处理不同类型的失败，或调用现有 C++ 库。选择一个示例，切换 Carven 与 C++，看看同一任务怎样实现。',
              'Print a struct, build text at compile time, handle typed failures, or call an existing C++ library. Choose an example, then switch between Carven and C++ to compare implementations.',
            )}
          </p>
        </header>
        <div className="showcase-grid">
          <div
            className="showcase-tabs"
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
                <span className="showcase-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="showcase-caption" aria-live="polite" aria-atomic="true">
            <h3>{example.title}</h3>
            <p>{example.detail}</p>
            <Link className="text-link" to={localizedPath(example.path, locale)}>
              {t('查看示例讲解', 'Walk through the example')} <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="code-window showcase-code">
            <div className="code-window-bar">
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
            <div className="code-window-result">
              <span>{t('结果', 'Result')}</span>
              <p>{example.result}</p>
            </div>
            <details className="showcase-details" key={selected}>
              <summary>{t('示例说明与限制', 'Example details and limits')}</summary>
              <p>{example.comparison}</p>
            </details>
          </div>
        </div>
      </section>

      <section className="home-section workflow" aria-labelledby="native-heading">
        <header className="section-head">
          <p className="eyebrow">{t('继续使用你的 C++ 工具链', 'Native integration')}</p>
          <h2 id="native-heading">
            {t('写 Carven，用 C++ 工具链构建。', 'Write Carven. Build with your C++ tools.')}
          </h2>
          <p>
            {t(
              'Carven 检查访问、所有权和失败契约，生成可直接阅读的 C++ 源码。接下来，由你的 C++ 工具链完成编译、链接和优化。',
              'Carven checks access, ownership, and failure contracts, then generates C++ source you can inspect. Your C++ toolchain compiles, links, and optimizes it.',
            )}
          </p>
        </header>
        <ol className="workflow-steps">
          {steps.map((step, index) => (
            <li key={step.command}>
              <span className="workflow-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
              <code>{step.command}</code>
            </li>
          ))}
        </ol>
        <p className="workflow-more">
          <Link className="text-link" to={localizedPath('/features/cpp-generation/', locale)}>
            {t('了解 C++ 如何生成', 'See how the C++ is generated')}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </p>
      </section>

      <section className="home-section quickstart" aria-labelledby="quickstart-heading">
        <header className="section-head">
          <p className="eyebrow">{t('快速上手', 'Quick start')}</p>
          <h2 id="quickstart-heading">{t('运行第一个程序。', 'Run your first program.')}</h2>
          <p>
            {t(
              '构建编译器需要 Git、Xmake，以及支持 C++26 的 LLVM/Clang 工具链；生成的程序使用 C++20。',
              'Building the compiler requires Git, Xmake, and an LLVM/Clang toolchain with C++26 support. Generated programs use C++20.',
            )}
          </p>
          <p className="quickstart-note">
            {t(
              'Windows 使用 .\\xmakew.ps1；已安装编译器时，用 carven 代替 ./xmakew run carven。',
              'On Windows, use .\\xmakew.ps1. With an installed compiler, replace ./xmakew run carven with carven.',
            )}
          </p>
          <div className="home-actions">
            <Link className="button button-primary" to={localizedPath('/learn/', locale)}>
              {t('写第一个程序', 'Write your first program')} <span aria-hidden="true">→</span>
            </Link>
            <Link className="text-link" to={localizedPath('/use-cases/', locale)}>
              {t('接入现有工程', 'Integrate with your project')} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </header>
        <div className="code-window terminal">
          <div className="terminal-step">
            <p>{t('1 · 构建编译器', '1 · Build the compiler')}</p>
            <pre>
              <code>
                <span className="prompt">git clone {repository}.git</span>
                {'\n'}
                <span className="prompt">cd carven</span>
                {'\n'}
                <span className="prompt">./xmakew build</span>
              </code>
            </pre>
          </div>
          <div className="terminal-step">
            <p>{t('2 · 在仓库根目录保存 main.cv', '2 · Save main.cv in the repository root')}</p>
            <div dangerouslySetInnerHTML={{ __html: homeExamples.quickstart }} />
          </div>
          <div className="terminal-step">
            <p>{t('3 · 运行', '3 · Run')}</p>
            <pre>
              <code>
                <span className="prompt">./xmakew run carven main.cv</span>
                {'\n'}
                <span className="terminal-output">Answer: 42</span>
              </code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
