import { useRef, useState, useTransition } from 'react';
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
import { homeCodeLoaders } from '../generated/home-tokens';
import initialStep from '../generated/home-tokens/asyncWorkflow';
import { homeShowcase } from '../content/home-showcase';
import type { CodeStep } from '../lib/code-tokens';
import '../styles/home.css';

type CodeLanguage = 'carven' | 'cpp' | 'cpp26';

function codeName(index: number, language: CodeLanguage) {
  const example = homeShowcase[index]!;
  return language === 'carven'
    ? example.code
    : language === 'cpp26' && 'cpp26' in example
      ? example.cpp26
      : example.cpp;
}

export default function Home({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const [{ selected, language, step }, setSelection] = useState<{
    selected: number;
    language: CodeLanguage;
    step: CodeStep;
  }>({ selected: 0, language: 'carven', step: initialStep });
  const intent = useRef({ selected, language });
  const request = useRef(0);
  const [committing, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const pending = loading || committing;
  const [loadError, setLoadError] = useState(false);

  async function choose(index: number, nextLanguage: CodeLanguage) {
    intent.current = { selected: index, language: nextLanguage };
    const generation = ++request.current;
    setLoadError(false);
    setLoading(true);

    try {
      const next = await homeCodeLoaders[codeName(index, nextLanguage)]();
      if (generation !== request.current) return;
      startTransition(() => {
        setSelection({ selected: index, language: nextLanguage, step: next });
        setLoading(false);
      });
    } catch {
      if (generation === request.current) {
        setLoadError(true);
        setLoading(false);
      }
    }
  }

  function prefetch(index: number, nextLanguage: CodeLanguage) {
    void homeCodeLoaders[codeName(index, nextLanguage)]().catch(() => {});
  }

  const examples = [
    {
      label: t('异步组合', 'Compose async work'),
      title: t(
        '并发处理批次，从候选中选出成功结果。',
        'Process batches. Select a successful result.',
      ),
      detail: t(
        '两个任务轮流处理记录，筛掉负值，各自返回名称、有效记录和合计。when_all 等待两个结果；first_successful 跳过不足 20 的单批合计，选中合计为 21 的汇总结果。',
        'Two tasks take turns processing records, dropping negative values and returning a name, accepted records, and total. when_all waits for both results; first_successful skips a batch total below 20 and selects the combined total of 21.',
      ),
      note: t(
        '把两个候选的目标值都从 20 改为 30，观察 BelowTarget 如何传播到入口。',
        'Raise both targets from 20 to 30 and see BelowTarget propagate to the entry point.',
      ),
      ...homeShowcase[0],
      standard: 'C++23',
      result: 'west: 3 records, total 12\neast: 3 records, total 9\nselected 1: 21',
      comparison: t(
        'C++23 对照使用独立版 Asio 协程和单线程 io_context：&& 等待两个结果，|| 选择首个成功。两个候选都失败时，Asio 用 multiple_exceptions 汇总异常，Carven 传播第一个选定的类型化失败。',
        'The C++23 version uses standalone Asio coroutines and a single-thread io_context: && awaits both results; || selects the first success. If both candidates fail, Asio collects exceptions in multiple_exceptions, while Carven propagates the first selected typed failure.',
      ),
      path: '/reference/async/',
    },
    {
      label: t('编译期异步', 'Async before runtime'),
      title: t(
        '启动、取消、关闭，同一流程在两个阶段运行。',
        'Start, cancel, close. Run the same flow in both stages.',
      ),
      detail: t(
        '子任务让计数增加一次，父任务随后请求取消，等待关闭，再取走计数。同一个 const async fn 在编译期和运行时执行，const test 检查编译期结果。',
        'The child increments a counter once. Its parent requests cancellation, waits for closure, then takes the counter. The same const async fn runs during compilation and at runtime, with const test checking the compile-time result.',
      ),
      note: t(
        '把 Take 移到 close 前，观察借用冲突诊断。',
        'Move Take before close to see the borrow-conflict diagnostic.',
      ),
      ...homeShowcase[1],
      standard: 'C++23',
      result: 'compile time: 1; runtime: 1',
      comparison: t(
        'C++23 对照显式驱动 constexpr 状态机，用 static_assert 检查编译期结果。Carven 用同一个 const async fn 和异步驱动器表达流程，并检查子任务的活动借用。',
        'The C++23 version explicitly drives a constexpr state machine and checks the compile-time result with static_assert. Carven expresses the flow with one const async fn and an async driver, with checks on the child’s active borrows.',
      ),
      path: '/learn/async/',
    },
    {
      label: t('JSON 配置', 'Customize JSON'),
      title: t(
        '模板在编译期准备，副本在运行时独立修改。',
        'Prepare once. Customize independent copies.',
      ),
      detail: t(
        '标准库在编译期解析 JSON 模板。运行时复制配置，把工作单元改成 8，再追加一个标签；打印副本和模板，直接看到两者可以独立修改。',
        'Parse a JSON template during compilation. At runtime, copy it, set eight workers, and append a tag. Printing the copy and template shows that their contents are independent.',
      ),
      note: t(
        '修改工作单元数量或追加标签；第二行始终显示未修改的模板。',
        'Change the worker count or append a tag. The second line still prints the original template.',
      ),
      ...homeShowcase[2],
      result: '{"workers":8,"tags":["stable","observed"]}\n{"workers":2,"tags":["stable"]}',
      comparison: t(
        'Carven 在 const 初始化器中解析模板；C++20 对照使用 nlohmann/json，在 main 中解析。',
        'Carven parses the template in a const initializer; the C++20 version uses nlohmann/json to parse it in main.',
      ),
      standard: 'C++20',
      path: '/reference/json/',
    },
    {
      label: t('编译期生成', 'Build at compile time'),
      title: t('帮助文本，在程序运行前准备好。', 'Prepare the help text before the program runs.'),
      detail: t(
        '从命令定义生成帮助文本，只列出启用的命令。照常写循环、判断和插值；Carven 在编译期构造并检查结果，运行时直接使用静态文本。',
        'Build help text from command definitions, listing only enabled commands. Use ordinary loops, conditions, and interpolation; Carven builds and checks the result at compile time, leaving static text ready for runtime use.',
      ),
      note: t(
        '启用 trace，先不改测试预期：const test 会在编译时指出差异。',
        'Enable trace without updating the expected text. const test catches the difference at compile time.',
      ),
      ...homeShowcase[3],
      result: 'Commands:\n  build: Compile the project\n  run: Run the program',
      comparison: t(
        'Carven 用 str 保留静态文本视图；C++20 的 freeze 根据结果长度创建数组，再提供 string_view。const test 和 static_assert 分别检查生成的完整文本。',
        'Carven retains a static text view with str. The C++20 freeze helper sizes an array from the result and provides a string_view. const test and static_assert check the complete generated text.',
      ),
      standard: 'C++20',
      path: '/features/compile-time/',
    },
    {
      label: t('静态特化', 'Specialize runtime code'),
      title: t('格式提前确定，输入到来时直接检查。', 'Fix the format. Check the input.'),
      detail: t(
        '用 INV-DDDD 描述编号格式，D 表示一个 ASCII 数字。const for 展开每个位置，const if 选择数字检查或字面匹配。生成的函数只接收待检查的文本。',
        'Describe an identifier with INV-DDDD, where D stands for one ASCII digit. const for expands each position; const if selects a digit check or a literal match. The generated function receives only the text to check.',
      ),
      note: t(
        '把 invoice 改成 INV-20x8，观察第一个结果变为 false。',
        'Change invoice to INV-20x8. The first result becomes false.',
      ),
      ...homeShowcase[4],
      result: 'INV-2048 → true\nINV-20x8 → false',
      comparison: t(
        'C++20 对照用 index_sequence 和参数包展开位置，C++26 用 template for；两者用 if constexpr 选择检查。Carven 对应使用 const for 和 const if。',
        'The C++20 version expands positions with index_sequence and a parameter pack; C++26 uses template for. Both select checks with if constexpr. Carven uses const for and const if.',
      ),
      standard: 'C++20',
      path: '/reference/functions/',
    },
    {
      label: t('浮点 SIMD 混音', 'Mix audio with SIMD'),
      title: t(
        '混合、限幅、保留结果，尾部也接受静态验证。',
        'Mix, clip, retain. Verify the tail before runtime.',
      ),
      detail: t(
        '把人声与一半音量的音乐相加，再限制到 −1 到 1。每块处理八个样本，掩码标记尾部真正的输入；结果保存到 Vector，并统计限幅数量和峰值。',
        'Add voice to music at half gain, then clip to −1 through 1. Process eight samples per block, using a mask to identify real input in the tail. Store the samples in a Vector and report clipping and peak level.',
      ),
      note: t(
        '修改最后一个音乐样本，看看静态测试如何检查不足一块的尾部。',
        'Change the final music sample and see how the static test checks the partial tail.',
      ),
      ...homeShowcase[5],
      result: 'samples=9 clipped=1 peak=1.00\nfirst=0.625 second=0.375 last=1.000',
      comparison: t(
        'Carven 使用浮点 SIMD 和有效通道掩码，C++20 对照使用标量循环。Carven 还在编译期执行同一算法，用静态测试检查不足一块的尾部。',
        'Carven uses float SIMD and active masks; the C++20 version uses a scalar loop. Carven also executes the same algorithm during compilation and checks the partial tail with a static test.',
      ),
      standard: 'C++20',
      path: '/use-cases/',
    },
    {
      label: t('失败处理', 'Handle failures'),
      title: t('恢复一种失败，契约就少一种。', 'Handle a failure. Narrow the contract.'),
      detail: t(
        '配置缺失时使用默认端口。编译器算出剩下的失败：契约少写 BadPort 会报错，调用者漏处理某种失败时，错误信息会指出漏掉的类型。',
        'Use a default port when the config is missing. The compiler computes the failures that remain: leave BadPort out of the contract and it reports an error; a caller that misses a failure is told which type is uncovered.',
      ),
      note: t(
        '试着删掉 port 契约里的 BadPort，点击“检查”，看看编译器如何指出遗漏。',
        'Remove BadPort from the port contract, then choose Check to see how the compiler reports the omission.',
      ),
      ...homeShowcase[6],
      result: 'ok 9000 · missing 8080 · Denied: denied · Bad port: 9x00',
      comparison: t(
        'C++23 用 expected、variant 和显式分支组织成功与失败。Carven 根据传播和恢复行为检查函数声明的失败集合。',
        'The C++23 version represents success and failure with expected, variant, and explicit branches. Carven checks the declared failure set against propagation and recovery.',
      ),
      standard: 'C++23',
      path: '/features/failure-contracts/',
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
      note: t(
        '这个例子可以在浏览器中生成 C++；实际调用第三方库需要在本地运行。',
        'Generate C++ for this example in the browser. Run it locally to execute the third-party library calls.',
      ),
      ...homeShowcase[7],
      result: '{"server":{"host":"localhost","port":9000}}',
      comparison: t(
        '两个版本都使用 nlohmann/json 的合并规则。Carven 三引号文本移除公共缩进，C++ 原始字符串保留缩进；两者都可以直接交给 JSON 解析器。',
        'Both versions use nlohmann/json’s merge rules. Carven removes common indentation from triple-quoted text; C++ raw strings retain it. Both can be passed directly to the JSON parser.',
      ),
      standard: 'C++20',
      path: '/learn/interop/',
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
              '用清晰的数据归属、失败处理和异步任务编写原生应用，编译为 C++。',
              'Write native applications with explicit ownership, typed failures, and async tasks. Compile to C++.',
            )}
          </p>
          <div className="home-actions">
            <Link
              className="button button-primary"
              to={localizedPath('/playground/', locale)}
              hash="example=async-workflow"
            >
              <UIIcon icon={Play} /> {t('在线运行示例', 'Run an example')}
            </Link>
            <Link className="button button-secondary" to={localizedPath('/learn/', locale)}>
              {t('开始学习', 'Start learning')}
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
              '选择一个例子，对照 Carven 与 C++ 的实现。',
              'Choose an example and compare the Carven and C++ implementations.',
            )}
          </p>
        </header>
        <div className="showcase-grid" aria-busy={pending}>
          <div className="showcase-selector">
            <div className="showcase-selector-head">
              <span>{t('选择示例', 'Choose an example')}</span>
              <span role="status">
                {loadError
                  ? t(
                      '示例加载失败，请重新选择。',
                      'Could not load the example. Select it to retry.',
                    )
                  : pending
                    ? t('正在载入…', 'Loading…')
                    : t('Carven 与 C++ 对照', 'Carven and C++, side by side')}
              </span>
            </div>
            <div
              className="showcase-tabs"
              role="group"
              aria-label={t('选择示例', 'Choose an example')}
            >
              {examples.map((item, index) => (
                <button
                  key={item.playground}
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => choose(index, intent.current.language)}
                  onPointerEnter={() => prefetch(index, intent.current.language)}
                  onFocus={() => prefetch(index, intent.current.language)}
                >
                  <span className="showcase-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="showcase-tab-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="showcase-caption" aria-live="polite" aria-atomic="true">
            {examples.map((item, index) => (
              <div
                key={item.playground}
                className="showcase-caption-item"
                aria-hidden={selected !== index}
                inert={selected !== index}
              >
                <h3>{item.title}</h3>
                <p className="showcase-description">{item.detail}</p>
                <p className="showcase-note">{item.note}</p>
                <div className="showcase-links">
                  <Link
                    className="button button-primary showcase-try"
                    to={localizedPath('/playground/', locale)}
                    hash={`example=${item.playground}`}
                  >
                    <UIIcon icon={Play} />
                    {item.playground === 'native-json'
                      ? t('生成这个示例的 C++', 'Generate this example’s C++')
                      : t('修改并运行示例', 'Edit and run this example')}
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
                  onClick={() => choose(intent.current.selected, 'carven')}
                  onPointerEnter={() => prefetch(selected, 'carven')}
                  onFocus={() => prefetch(selected, 'carven')}
                >
                  Carven
                </button>
                <button
                  type="button"
                  aria-pressed={codeLanguage === 'cpp'}
                  onClick={() => choose(intent.current.selected, 'cpp')}
                  onPointerEnter={() => prefetch(selected, 'cpp')}
                  onFocus={() => prefetch(selected, 'cpp')}
                >
                  {example.standard}
                </button>
                {cpp26 && (
                  <button
                    type="button"
                    aria-pressed={codeLanguage === 'cpp26'}
                    onClick={() => choose(intent.current.selected, 'cpp26')}
                    onPointerEnter={() => prefetch(selected, 'cpp26')}
                    onFocus={() => prefetch(selected, 'cpp26')}
                  >
                    C++26
                  </button>
                )}
              </div>
              <span className="showcase-code-label">
                {String(selected + 1).padStart(2, '0')} · {example.label}
              </span>
            </div>
            <MorphingCode
              step={step}
              example={
                codeLanguage === 'carven'
                  ? example.code
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
              <summary>{t('实现对照', 'Implementation comparison')}</summary>
              {example.comparison.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
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
                '从 C++ 托管的流收集器到协程，看看所有权、失败与完成契约如何成为生成代码。',
                'From a C++ hosted stream collector to coroutines, see how ownership, failure, and completion contracts shape generated code.',
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
