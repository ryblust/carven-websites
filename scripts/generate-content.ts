import { NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';
import { generateContent } from './content/generate.ts';
import { ContentLive } from './content/live.ts';

NodeRuntime.runMain(generateContent(process.cwd()).pipe(Effect.provide(ContentLive)));
