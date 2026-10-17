import type { homeExamples } from './home-examples.ts';

interface HomeShowcase {
  code: keyof typeof homeExamples;
  cpp: keyof typeof homeExamples;
  cpp26?: keyof typeof homeExamples;
  playground: string;
}

export const homeShowcase = [
  { code: 'asyncWorkflow', cpp: 'asyncWorkflowCpp', playground: 'async-workflow' },
  { code: 'asyncScope', cpp: 'asyncScopeCpp', playground: 'async-scope' },
  { code: 'configuration', cpp: 'configurationCpp', playground: 'json-config' },
  { code: 'constants', cpp: 'constantsCpp', playground: 'static-text' },
  {
    code: 'specialization',
    cpp: 'specializationCpp',
    cpp26: 'specialization26Cpp',
    playground: 'specialization',
  },
  { code: 'audioMixer', cpp: 'audioMixerCpp', playground: 'audio-mixer' },
  { code: 'failures', cpp: 'failuresCpp', playground: 'typed-failures' },
  { code: 'native', cpp: 'nativeCpp', playground: 'native-json' },
] as const satisfies readonly HomeShowcase[];
