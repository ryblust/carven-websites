import { NodeFileSystem } from '@effect/platform-node';
import { Layer } from 'effect';
import { ContentRepository } from './ContentRepository.ts';
import { Markdown } from './Markdown.ts';

export const ContentLive = Layer.merge(
  ContentRepository.layer.pipe(Layer.provide(NodeFileSystem.layer)),
  Markdown.layer,
);
