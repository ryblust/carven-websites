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
      code: 'asyncWorkflow',
      cpp: 'asyncWorkflowCpp',
      standard: 'C++23',
      result: 'west: 3 records, total 12\neast: 3 records, total 9\nselected 1: 21',
      comparison: t(
        'west 和 east 各保留三条记录，合计分别为 12 和 9。第一个候选未达 20，第二个以 21 成功，因此两份程序都输出上面三行。\n\nC++23 使用独立 Asio 协程和单线程 io_context，&& 汇合成功结果，|| 选择首个成功并取消其余任务；两个候选都失败时，它抛出 multiple_exceptions，first_exception 提供原始失败。Carven 此时传播第一个选定的类型化失败。\n\nC++ 对照使用 Asio 1.38.2：clang++ -std=c++23 -pthread -I/path/to/asio/include example.cpp -o example。',
        'West and east each keep three records, totaling 12 and 9. The first candidate falls below 20; the combined total succeeds with 21. Both programs print the three lines above.\n\nThe C++23 version uses standalone Asio coroutines and a single-thread io_context: && joins successful results; || selects the first success and cancels the other task. When both candidates fail, Asio throws multiple_exceptions with an original failure available through first_exception; Carven propagates the first selected typed failure.\n\nUses Asio 1.38.2: clang++ -std=c++23 -pthread -I/path/to/asio/include example.cpp -o example.',
      ),
      path: '/reference/async/',
      playground: 'async-workflow',
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
        '取消提出停止请求。这里用 await close 等待结束，再取走数据；把 Take 提到 close 前会得到借用冲突诊断。',
        'Cancellation requests a stop. Here await close waits for completion before the data is taken. Move Take before close to see the borrow-conflict diagnostic.',
      ),
      code: 'asyncScope',
      cpp: 'asyncScopeCpp',
      standard: 'C++23',
      result: 'compile time: 1; runtime: 1',
      comparison: t(
        '两份程序都让子任务执行一轮，再取消、关闭并返回计数，编译期和运行时结果均为 1。Carven 的 FIFO 调度与显式 yield 确定了顺序，不依赖计时；close 等待任务接受取消后，才允许 Take。\n\nC++23 对照显式驱动一个 constexpr 状态机：resume 执行一步或接受取消，close 使它结束，析构时再次关闭也安全。它用 static_assert 检查结果，调度由这些显式调用表示；Carven 使用异步驱动器，并检查活动借用。\n\nC++ 编译命令：clang++ -std=c++23 example.cpp -o example。',
        'Both programs run one child step, cancel, close, and return its count: 1 during compilation and at runtime. Carven’s FIFO scheduling and explicit yield determine the order without timing assumptions; close waits for cancellation to finish before Take is allowed.\n\nThe C++23 version explicitly drives a constexpr state machine: resume steps or accepts cancellation, close finishes it, and destruction can safely close it again. static_assert checks the result. Those explicit calls model the schedule; Carven supplies an async driver and checks active borrows.\n\nCompile with clang++ -std=c++23 example.cpp -o example.',
      ),
      path: '/learn/async/',
      playground: 'async-scope',
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
      code: 'configuration',
      cpp: 'configurationCpp',
      result: '{"workers":8,"tags":["stable","observed"]}\n{"workers":2,"tags":["stable"]}',
      comparison: t(
        '副本变成八个工作单元、两个标签，模板仍是两个工作单元、一个标签。Carven 的 Value 和 C++ 的 ordered_json 都复制独立内容；Carven 的 get 也返回独立子值，因此修改 tags 后要 set 回配置。\n\nCarven 在编译期解析模板并检查初始值；C++20 对照在 main 中使用 nlohmann/json 解析。两份程序输出相同两行，C++ 版本需要该库头文件。',
        'The copy has eight workers and two tags; the template keeps two workers and one tag. Value and C++ ordered_json both copy independent contents. Carven’s get also returns an independent child, so changed tags are assigned back with set.\n\nCarven parses and checks the template during compilation; the C++20 version parses inside main with nlohmann/json. Both print the same two lines. The C++ version needs that library’s header.',
      ),
      standard: 'C++20',
      path: '/reference/json/',
      playground: 'json-config',
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
      code: 'constants',
      cpp: 'constantsCpp',
      result: 'Commands:\n  build: Compile the project\n  run: Run the program',
      comparison: t(
        '只有 build 和 run 启用，因此两份程序都在编译期生成相同两项帮助。\n\nCarven 的显式 str 标注保留静态文本视图；C++20 的 freeze 根据结果长度创建数组，再由 string_view 引用。const test 和 static_assert 分别核对完整内容。这里生成的是帮助文本，修改命令定义后需要重新编译。',
        'Only build and run are enabled, so both programs prepare the same two help entries during compilation.\n\nCarven’s explicit str annotation retains a static text view. The C++20 freeze helper sizes an array from the result and provides a string_view over it. const test and static_assert check the full content. This example generates help text; changing its command definitions requires recompilation.',
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
      note: t(
        '把 invoice 改成 INV-20x8，观察第一个结果变为 false。',
        'Change invoice to INV-20x8. The first result becomes false.',
      ),
      code: 'specialization',
      cpp: 'specializationCpp',
      cpp26: 'specialization26Cpp',
      result: 'INV-2048 → true\nINV-20x8 → false',
      comparison: t(
        'D 匹配一个 ASCII 数字，其余字节按字面匹配；检查长度后才访问输入，所以三个版本都输出 true false。\n\nCarven 的 const for 展开位置，const if 选择每个位置的检查。C++20 对照用 index_sequence 和参数包，C++26 对照用 template for；两者用 if constexpr 选择检查。Carven 的所有源分支仍接受类型、所有权和失败检查。这个模式只支持数字占位与字面字节，C++26 版本使用 Clang 23 验证。',
        'D matches one ASCII digit; other bytes match literally. Length is checked before input access, and all three versions print true false.\n\nCarven expands positions with const for and selects each check with const if. The C++20 version uses index_sequence and a parameter pack; C++26 uses template for. Both select checks with if constexpr. Carven still checks types, ownership, and failures in every source branch. This pattern supports digit placeholders and literal bytes. The C++26 version was verified with Clang 23.',
      ),
      standard: 'C++20',
      path: '/reference/functions/',
      playground: 'specialization',
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
      code: 'audioMixer',
      cpp: 'audioMixerCpp',
      result: 'samples=9 clipped=1 peak=1.00\nfirst=0.625 second=0.375 last=1.000',
      comparison: t(
        '九个输入样本中，最后一个需要限幅，因此输出 clipped=1、peak=1.00。两份程序使用相同增益、有限值检查和限幅规则。\n\nCarven 用浮点 SIMD 与有效通道掩码，C++20 对照用标量循环。Carven 还在编译期执行同一算法并保留 Vector，静态测试检查第九个样本；C++ 对照在运行时计算，并用异常报告非法输入。原生 Carven 根据目标使用 NEON、启用的 AVX2 或可移植后端，性能需实际测量。这里计算内嵌样本，不播放音频。',
        'The ninth sample clips, so the report shows clipped=1 and peak=1.00. Both programs use the same gains, finite checks, and clipping rule.\n\nCarven uses float SIMD and active masks; the C++20 version uses a scalar loop. Carven also runs the algorithm during compilation, retains its Vector, and checks the ninth sample in a static test. The C++ version calculates at runtime and reports invalid input with exceptions. Native Carven selects NEON, enabled AVX2, or portable lanes; performance needs measurement. The example computes embedded samples rather than playing audio.',
      ),
      standard: 'C++20',
      path: '/use-cases/',
      playground: 'audio-mixer',
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
      code: 'failures',
      cpp: 'failuresCpp',
      result: 'ok 9000 · missing 8080 · Denied: denied · Bad port: 9x00',
      comparison: t(
        '内存配置表提供正常、缺失、拒绝访问和错误文本四种输入。parse 接受 1–65535 的 ASCII 十进制端口；port 将 Missing 恢复为 8080，继续传播 Denied 和 BadPort，因此两个版本输出相同四行。\n\nC++23 用 expected、variant 和显式分支组织剩余失败；Carven 根据传播和恢复检查声明集合。C++ 编译命令为 clang++ -std=c++23 example.cpp -o example。',
        'An in-memory configuration table supplies success, absence, denied access, and invalid text. parse accepts ASCII decimal ports from 1 through 65535. port recovers Missing as 8080 and propagates Denied and BadPort, giving both versions the same four output lines.\n\nThe C++23 version organizes the remaining failures with expected, variant, and explicit branches. Carven checks the declared set against propagation and recovery. Compile C++ with clang++ -std=c++23 example.cpp -o example.',
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
      note: t(
        '这个例子可以在浏览器中生成 C++；实际调用第三方库需要在本地运行。',
        'Generate C++ for this example in the browser. Run it locally to execute the third-party library calls.',
      ),
      code: 'native',
      cpp: 'nativeCpp',
      result: '{"server":{"host":"localhost","port":9000}}',
      comparison: t(
        'patch 把 port 改成 9000，用 null 删除 debug，保留 host。两个版本都调用 nlohmann/json 3.12.0 的 parse、merge_patch 和 dump，输出相同 JSON；合并规则由库提供。\n\nCarven 三引号文本去除公共缩进，C++ 原始字符串保留缩进，这些空白不影响 JSON 解析。原生构建需要库头文件，C++ 检查重载和模板。需要恢复解析异常时，在 C++ 适配层捕获；链接教程给出接入步骤。',
        'The patch changes port to 9000, removes debug with null, and keeps host. Both versions call nlohmann/json 3.12.0 parse, merge_patch, and dump and print the same JSON; the library supplies the merge rules.\n\nCarven removes common indentation from its triple-quoted text, while C++ raw text retains it; both are valid JSON. Native builds need the library header, and C++ checks overloads and templates. Catch parse exceptions in a C++ adapter when recovery is needed; the linked tutorial covers integration.',
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
          <p className="home-try-note">
            {t(
              '无需安装。在浏览器中修改代码，查看运行结果与生成的 C++。',
              'No installation. Edit code in your browser, see its output, and inspect the generated C++.',
            )}
          </p>
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
              '从异步组合与编译期任务，到拥有 JSON 配置与 SIMD 数据处理。直接修改并运行，查看结果和生成的 C++。',
              'From async composition and compile-time tasks to owned JSON and SIMD data processing. Edit and run the examples, then inspect their results and generated C++.',
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
                key={item.playground}
                type="button"
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                <span className="showcase-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="showcase-tab-label">{item.label}</span>
              </button>
            ))}
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
              <summary>{t('示例说明与限制', 'Example details and limits')}</summary>
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
