import { NodeRuntime } from '@effect/platform-node';
import { Effect } from 'effect';
import { generateContent } from './generate.ts';
import { ContentLive } from './live.ts';

NodeRuntime.runMain(generateContent(process.cwd()).pipe(Effect.provide(ContentLive)));
