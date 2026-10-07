import { useState } from 'react';
import { MorphingCode } from '../components/MorphingCode';
import { Link } from '@tanstack/react-router';
import { localizedPath, translate, type Locale } from '../lib/i18n';
import { Wordmark } from '../components/Brand';
import { Sketch } from '../components/Sketch';
import { CompilationFlow } from '../components/CompilationFlow';
import { ArrowUpRight, Play } from 'lucide-react';
import { UIIcon } from '../components/UIIcon';
import { repository } from '../lib/site';
import { homeExamples } from '../generated/home-examples';
import '../styles/home.css';

export default function Home({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const [selected, setSelected] = useState(0);
  const [language, setLanguage] = useState<'carven' | 'cpp' | 'cpp26'>('carven');
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
        '两边都是完整程序，按相同的多行布局打印这个订单；结果栏压缩成了一行。C++20 对照为这个数据结构手写输出，字段变化时需同步修改。示例商品名不含需要转义的字符，对照没有实现通用文本转义。Boost.PFR、magic_enum 或 C++26 反射可以减少类型专用的代码。Carven 的结构化显示也用于测试失败时报告操作数值。',
        'Both are complete programs that print this order with the same multiline layout; the result is condensed here. The C++20 comparison writes a printer for this schema, which must change with its fields. Item names contain no characters needing escaping; the comparison does not implement general text escaping. Boost.PFR, magic_enum, or C++26 reflection can reduce type-specific code. Carven also uses structural display to report operands in failed tests.',
      ),
      standard: 'C++20',
      path: '/learn/aggregates/',
      playground: 'structured-output',
    },
    {
      label: t('编译期生成', 'Build at compile time'),
      title: t('帮助文本，在程序运行前准备好。', 'Prepare the help text before the program runs.'),
      detail: t(
        '从命令定义生成帮助文本，只列出启用的命令。照常写循环、判断和插值；Carven 在编译期构造并检查结果，运行时直接使用静态文本。',
        'Build help text from command definitions, listing only enabled commands. Use ordinary loops, conditions, and interpolation; Carven builds and checks the result at compile time, leaving static text ready for runtime use.',
      ),
      html: homeExamples.constants,
      cpp: homeExamples.constantsCpp,
      result: 'Commands:\n  build: Compile the project\n  run: Run the program',
      comparison: t(
        '两边都在编译期筛选三个命令定义，生成相同的帮助文本；这里不解析参数或执行命令。C++20 对照用 constexpr 字符串操作构造文本，再用 freeze 确定长度并复制进数组，供 string_view 引用；静态字符串库也能封装这部分存储。Carven 在常量初始化时直接把 String 冻结为静态 str，用 const test 核对完整内容。命令配置变化后需要重新编译。',
        'Both filter three command definitions at compile time and produce the same help text; neither parses arguments nor executes commands. The C++20 comparison builds text with constexpr string operations, then uses freeze to determine its length and copy it into an array behind a string_view. A static-string library can encapsulate that storage. Carven freezes the String into a static str at constant initialization and checks the full content with const test. Changing the command configuration requires recompilation.',
      ),
      standard: 'C++20',
      path: '/features/compile-time/',
      playground: 'static-text',
    },
    {
      label: t('静态特化', 'Specialize runtime code'),
      title: t('格式提前确定，输入到来时直接检查。', 'Fix the format. Check the input.'),
      detail: t(
        '用 INV-DDDD 描述编号格式，D 表示一个 ASCII 数字。const for 展开每个位置，const if 选择数字检查或字面匹配。生成的函数只接收待检查的文本。',
        'Describe an identifier with INV-DDDD, where D stands for one ASCII digit. const for expands each position; const if selects a digit check or a literal match. The generated function receives only the text to check.',
      ),
      html: homeExamples.specialization,
      cpp: homeExamples.specializationCpp,
      cpp26: homeExamples.specialization26Cpp,
      result: 'INV-2048 → true\nINV-20x8 → false',
      comparison: t(
        '三份都是完整程序，依次输出 true、false。D 匹配一个 ASCII 数字，其余字节按字面匹配；先检查长度，再访问输入。这个小型模式没有转义、重复次数或捕获，CTRE 等 C++ 库提供更丰富的语法。C++20 用 index_sequence 和参数包展开位置，C++26 用 template for 展开同一索引序列，两版均以 if constexpr 选择检查。Carven 仍检查所有源分支的类型、所有权和失败契约，两种语言的分支检查规则不同。C++26 版已在支持枚举展开语句的 Clang 23 验证。',
        'All three are complete programs that print true, then false. D matches one ASCII digit; other bytes match literally. Length is checked before accessing the input. This small pattern has no escapes, repetition counts, or captures; C++ libraries such as CTRE offer richer syntax. C++20 expands positions with index_sequence and a parameter pack; C++26 uses template for over the same index sequence. Both select checks with if constexpr. Carven still checks types, ownership, and failure contracts in every source branch; the two languages differ in how they check discarded branches. The C++26 version was verified with Clang 23’s enumerating expansion statements.',
      ),
      standard: 'C++20',
      path: '/reference/functions/',
      playground: 'specialization',
    },
    {
      label: t('SIMD 字节扫描', 'Scan bytes with SIMD'),
      title: t(
        '按块统计字节，读到末尾也不越界。',
        'Count bytes in blocks, without reading past the end.',
      ),
      detail: t(
        '用向量比较 32 个字节，再用掩码统计匹配项。最后不足一块时，只读取实际数据，并用 active 排除补零的位置。',
        'Compare 32 byte lanes, then count matching mask bits. A partial final block reads only available input and uses active to exclude zero-filled lanes.',
      ),
      html: homeExamples.simd,
      cpp: homeExamples.simdCpp,
      result: '2',
      comparison: t(
        '两边都是完整程序，统计指定字节出现的次数；这只是分隔符计数，不是 CSV 解析器。第二个静态测试保证零填充不会被计入。C++20 对照逐字节完成相同任务，未手写 SIMD；原生优化器可能将循环向量化。Carven 的逻辑向量由 NEON、显式启用的 AVX2 或可移植后端实现，没有运行时分派，也不承诺速度提升。',
        'Both are complete programs that count occurrences of one byte; this is delimiter counting, not a CSV parser. The second static test ensures zero padding is excluded. The C++20 comparison performs the same task byte by byte, without handwritten SIMD; a native optimizer may vectorize that loop. Carven implements logical vectors with NEON, explicitly enabled AVX2, or a portable backend, with no runtime dispatch or promised speedup.',
      ),
      standard: 'C++20',
      path: '/reference/simd/',
      playground: 'simd-bytes',
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
      result: 'ok 9000 · missing 8080 · Denied: denied · Bad port: 9x00',
      comparison: t(
        '两边都是包含完整类型、函数实现和入口的可运行程序，按顺序输出上面的四行。read 使用内存配置表展示正常、缺失、拒绝访问和错误文本；parse 只接受 1–65535 范围内的 ASCII 十进制端口。port 只恢复 Missing，其余失败交给调用者处理。C++23 用 expected、variant 和分支表达同样的结果，剩余失败列表需要手动维护；Carven 从实际传播与恢复中检查契约。C++ 是手写等价实现，使用 clang++ -std=c++23 编译；Carven 保存为 ports.cv 后运行 carven ports.cv。',
        'Both are runnable programs with complete types, function definitions, and an entry point. They print the four lines above in order. read uses an in-memory configuration store to demonstrate success, absence, denied access, and invalid text; parse accepts only ASCII decimal ports from 1 through 65535. port recovers only Missing and leaves the other failures to its caller. C++23 expresses the same results with expected, variant, and branches, with a manually maintained remaining failure list; Carven checks contracts against propagation and recovery. Compile the handwritten C++ equivalent with clang++ -std=c++23; save the Carven program as ports.cv and run carven ports.cv.',
      ),
      standard: 'C++23',
      path: '/features/failure-contracts/',
      playground: 'typed-failures',
    },
    {
      label: t('调用 C++', 'Use C++ libraries'),
      title: t(
        '合并配置，继续用原来的库。',
        'Merge configuration with the library you already use.',
      ),
      detail: t(
        '用三引号直接写多行 JSON，再交给 nlohmann/json：保留 host，把 port 改成 9000，并删除 debug。文本按代码层级缩进，双引号无需转义；直接调用库的现有接口。',
        'Write multiline JSON directly with triple quotes, then pass it to nlohmann/json: keep host, change port to 9000, and remove debug. Indent the text with your code and leave double quotes unescaped; call the library’s existing API directly.',
      ),
      html: homeExamples.native,
      cpp: homeExamples.nativeCpp,
      result: '{"server":{"host":"localhost","port":9000}}',
      comparison: t(
        '使用 nlohmann/json 3.12.0，两边都是完整程序，调用相同的 parse、merge_patch 和 dump，输出相同。Carven 三引号文本自动去除公共缩进；C++ 原始字符串也能直接写多行 JSON，但保留内部缩进。JSON 解析器允许这些空白，因此不影响结果。合并与 null 删除字段的规则由库提供。头文件需在 C++ 包含路径中，重载和模板仍由 C++ 编译器检查；插值格式化 dump 返回的原生 std::string。原生异常需要在 C++ 适配层恢复，详情页提供接入步骤。',
        'Uses nlohmann/json 3.12.0. Both complete programs call the same parse, merge_patch, and dump APIs and print identical output. Carven triple-quoted text removes common indentation automatically; C++ raw strings also support multiline JSON but retain that indentation. JSON allows this whitespace, so the result is unchanged. The library supplies merge semantics and field removal with null. Put its header on the C++ include path; the C++ compiler still checks overloads and templates. Interpolation formats the native std::string returned by dump. Recover native exceptions in a C++ adapter; the linked tutorial covers integration.',
      ),
      standard: 'C++20',
      path: '/learn/interop/',
      playground: 'native-json',
    },
  ] as const;
  const example = examples[selected]!;
  const cpp26 = 'cpp26' in example ? example.cpp26 : undefined;
  const codeLanguage = language === 'cpp26' && !cpp26 ? 'cpp' : language;
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
              '打印结构体、生成静态文本、按固定格式检查编号、按块扫描字节、恢复指定失败，或调用现有 C++ 库。选择一个任务，切换 Carven 与 C++，比较实现方式与适用范围。',
              'Print a struct, build static text, check identifiers against a fixed format, scan byte blocks, recover from a selected failure, or call a C++ library. Choose a task, then switch between Carven and C++ to compare implementations and their scope.',
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
            {examples.map((item, index) => (
              <div
                key={item.path}
                className="showcase-caption-item"
                aria-hidden={selected !== index}
                inert={selected !== index}
              >
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <div className="showcase-links">
                  <Link
                    className="text-link showcase-try"
                    to={localizedPath('/playground/', locale)}
                    hash={`example=${item.playground}`}
                  >
                    <UIIcon icon={Play} />
                    {t('在 Playground 打开', 'Open in Playground')}
                  </Link>
                  <Link className="text-link" to={localizedPath(item.path, locale)}>
                    {t('了解相关用法', 'Explore this feature')} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            ))}
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
                  aria-pressed={codeLanguage === 'carven'}
                  onClick={() => setLanguage('carven')}
                >
                  Carven
                </button>
                <button
                  type="button"
                  aria-pressed={codeLanguage === 'cpp'}
                  onClick={() => setLanguage('cpp')}
                >
                  {example.standard}
                </button>
                {cpp26 && (
                  <button
                    type="button"
                    aria-pressed={codeLanguage === 'cpp26'}
                    onClick={() => setLanguage('cpp26')}
                  >
                    C++26
                  </button>
                )}
              </div>
              <span>
                {codeLanguage === 'carven'
                  ? t('Carven 源码', 'Carven source')
                  : t('手写对照', 'Handwritten comparison')}
              </span>
            </div>
            <MorphingCode
              html={
                codeLanguage === 'carven'
                  ? example.html
                  : codeLanguage === 'cpp26'
                    ? cpp26!
                    : example.cpp
              }
            />
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
        <div className="workflow-intro">
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
          <Link
            className="workflow-article"
            to={localizedPath('/features/cpp-generation/', locale)}
          >
            <span className="workflow-article-label">{t('深入阅读', 'Further reading')}</span>
            <h3>{t('让语义决定 C++ 的组织', 'Let semantics shape the C++')}</h3>
            <p>
              {t(
                '从模块接口到所有权与失败传播，看看源码中的契约如何成为生成代码。',
                'From module interfaces to ownership and failure propagation, see how source contracts shape the generated code.',
              )}
            </p>
            <span className="workflow-article-action">
              {t('阅读文章', 'Read the article')} <UIIcon icon={ArrowUpRight} />
            </span>
          </Link>
        </div>
        <CompilationFlow locale={locale} />
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
            <Link
              className="button button-primary"
              to={localizedPath('/learn/first-program/', locale)}
            >
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
