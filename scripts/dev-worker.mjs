import { createServer } from 'vite';
import { Effect } from 'effect';
import { generateContent } from './content/generate.ts';
import { ContentLive } from './content/live.ts';

try {
  await Effect.runPromise(generateContent(process.cwd()).pipe(Effect.provide(ContentLive)));
  const server = await createServer({
    plugins: [
      {
        name: 'carven-local-preview-control',
        configureServer(server) {
          server.middlewares.use(`${server.config.base}_carven/dev`, (request, response) => {
            if (request.method === 'POST') {
              if (request.headers['x-carven-preview-token'] !== process.env.CARVEN_DEV_TOKEN) {
                response.writeHead(403).end();
                return;
              }
              response.writeHead(200).end('Stopping');
              setTimeout(() => {
                void server.close().then(() => process.exit(0));
              }, 100);
              return;
            }
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ project: 'carven-website', pid: process.pid }));
          });
        },
      },
    ],
  });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  process.send?.({ ready: true, url });
  console.log(`Carven preview: ${url}`);
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      void server.close().then(() => process.exit(0));
    });
} catch (error) {
  console.error(error);
  process.send?.({ ready: false, error: String(error) });
  process.exit(1);
}
