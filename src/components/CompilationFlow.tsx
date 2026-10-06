import { ChevronDown } from 'lucide-react';
import { translate, type Locale } from '../lib/i18n';
import { UIIcon } from './UIIcon';

function StepSketch({ step }: { step: number }) {
  return (
    <svg className="workflow-sketch" viewBox="0 0 180 100" aria-hidden="true" focusable="false">
      {step === 0 ? (
        <>
          <path d="m44 12 72 2 22 20-2 53-93-2ZM116 15l-1 20 21-1M58 46l36 1m-37 12 61-1m-60 13 44 1" />
          <path className="sketch-accent" d="m20 72 21-23m-19 24-4 12 12-5m-10-8 10 8" />
        </>
      ) : step === 1 ? (
        <>
          <path d="m31 21 75-2 17 18-1 45-93 2ZM105 21l-1 17 18-1m-77 12 30-1m-30 13 51 1" />
          <path d="m121 31 27 1 14 14-1 43-31-1m17-56-.5 15 14-.5" />
          <path className="sketch-accent" d="m45 49-8 5 8 5m44-10 8 5-8 5m-16-13-6 18" />
        </>
      ) : (
        <>
          <path d="m28 22 124-2-1 64-122 2ZM30 37l120-1M39 29h1m9 0h1m9 0h1m57 29 20-1" />
          <path className="sketch-accent" d="m47 51 12 11-13 10m46-11 9 9 18-23" />
        </>
      )}
    </svg>
  );
}

export function CompilationFlow({ locale }: { locale: Locale }) {
  const t = translate(locale);
  const steps = [
    {
      title: t('编写 Carven', 'Write Carven'),
      artifact: 'main.cv',
      detail: t(
        '在源码中写明读取、修改还是转移所有权，以及哪些失败会向外传递。编译器在生成代码前检查这些契约。',
        'State whether code reads, mutates, or takes ownership, and which failures can escape. The compiler checks these contracts before generating code.',
      ),
      input: t('你的程序意图', 'Your program’s intent'),
      output: t('Carven 源文件', 'Carven source files'),
    },
    {
      title: t('生成 C++', 'Generate C++'),
      artifact: 'main.cpp',
      detail: t(
        'compile 输出可阅读的 C++20 源文件和所需接口。生成结果可以放进现有的原生构建。',
        'compile writes readable C++20 source and the required interfaces. Add the generated files to your existing native build.',
      ),
      input: t('Carven 源文件', 'Carven source files'),
      output: t('C++ 源文件与接口', 'C++ source and interfaces'),
      command: 'carven compile -o generated main.cv',
    },
    {
      title: t('原生构建', 'Build natively'),
      artifact: t('可执行程序', 'Executable'),
      detail: t(
        'C++ 工具链负责编译、链接和优化。直接运行源文件时默认使用 clang++，可用 CXX 指定其他编译器。',
        'Your C++ toolchain compiles, links, and optimizes. Running a source file directly uses clang++ by default; set CXX to choose another compiler.',
      ),
      input: t('生成的 C++ 与依赖库', 'Generated C++ and libraries'),
      output: t('原生可执行程序', 'A native executable'),
      command: 'carven main.cv',
    },
  ];

  return (
    <ol className="workflow-steps">
      {steps.map((step, index) => (
        <li key={step.artifact}>
          <details name="compilation-flow">
            <summary>
              <StepSketch step={index} />
              <span className="workflow-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="workflow-title">{step.title}</span>
              <span className="workflow-artifact">{step.artifact}</span>
              <span className="workflow-disclosure">
                {t('查看这一步', 'Explore this step')}
                <UIIcon icon={ChevronDown} />
              </span>
            </summary>
            <div className="workflow-detail">
              <p>{step.detail}</p>
              <dl>
                <div>
                  <dt>{t('输入', 'Input')}</dt>
                  <dd>{step.input}</dd>
                </div>
                <div>
                  <dt>{t('输出', 'Output')}</dt>
                  <dd>{step.output}</dd>
                </div>
              </dl>
              {step.command && <code>{step.command}</code>}
            </div>
          </details>
          {index < steps.length - 1 && (
            <svg
              className="workflow-connector"
              viewBox="0 0 40 20"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M2 11q16-3 34-1m-8-6 8 6-9 6" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}
