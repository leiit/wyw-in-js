import fs from 'fs';
import os from 'os';
import path from 'path';

import { TransformCacheCollection } from '../cache';
import { transform } from '../transform';

const processorFile = path.resolve(
  __dirname,
  '__fixtures__',
  'test-css-processor.js'
);

const COMPONENTS = 30;
const STORIES = 20;
const CONCURRENCY = 16;
const SEED = 9;

const createRandom = (seed: number) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
};

// Each component imports up to two earlier components and each story uses up
// to three components. `loaded` is what a loader running before wyw hands to
// the transform: Storybook's react-docgen-loader appends a statement to every
// module that exports a plain component, so it differs from the file on disk.
const createModules = (random: () => number) => {
  const files: Record<string, string> = {
    'tokens.ts': [
      `export const colors = { red: 'red', blue: 'blue' };`,
      `export const space = (n: number) => n * 4 + 'px';`,
      '',
    ].join('\n'),
  };
  const loaded: Record<string, string> = {};

  for (let i = 0; i < COMPONENTS; i += 1) {
    const imports: number[] = [];
    const count = i === 0 ? 0 : Math.floor(random() * 3);
    for (let k = 0; k < count; k += 1) {
      const j = Math.floor(random() * i);
      if (!imports.includes(j)) imports.push(j);
    }

    const code = [
      "import { css } from 'test-css-processor';",
      "import { colors, space } from './tokens';",
      ...imports.map((j) => `import { C${j}, C${j}_ERR } from './C${j}';`),
      `export const C${i}_ERR = 'c${i}-err';`,
      `export const c${i}Size = space(${i % 7});`,
      `export const C${i} = () => [${imports
        .map((j) => `C${j}()`)
        .join(', ')}];`,
      `export const c${i}Class = css\`color: \${colors.blue}; padding: \${c${i}Size}; ${imports
        .map((j) => `& .\${C${j}_ERR} { margin: 0; }`)
        .join(' ')}\`;`,
      '',
    ].join('\n');
    const name = `C${i}.ts`;
    files[name] = code;
    loaded[name] = `${code}\nC${i}.__docgenInfo = { displayName: 'C${i}' };\n`;
  }

  for (let s = 0; s < STORIES; s += 1) {
    const used: number[] = [];
    const count = 1 + Math.floor(random() * 3);
    for (let k = 0; k < count; k += 1) {
      const j = Math.floor(random() * COMPONENTS);
      if (!used.includes(j)) used.push(j);
    }

    files[`S${s}.ts`] = [
      "import { css } from 'test-css-processor';",
      ...used.map(
        (j) => `import { C${j}, C${j}_ERR, c${j}Size } from './C${j}';`
      ),
      `export const story${s} = css\`${used
        .map((j) => `& .\${C${j}_ERR} { width: \${c${j}Size}; }`)
        .join(' ')}\`;`,
      `export default { components: [${used
        .map((j) => `C${j}`)
        .join(', ')}] };`,
      '',
    ].join('\n');
  }

  Object.keys(files).forEach((name) => {
    loaded[name] ??= files[name];
  });

  return { files, loaded };
};

const shuffle = <T>(items: T[], random: () => number) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

// A cold build on one shared cache: bundler workers transform the modules in
// no particular order and every module arrives with its loader output. No file
// changes on disk during the build, so nothing is stale and every transform
// has to finish.
it('finishes every module of a cold build when a loader appends code to the components', async () => {
  const random = createRandom(SEED);
  const { files, loaded } = createModules(random);
  const queue = shuffle(Object.keys(files), random);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wyw-loader-output-'));
  const cache = new TransformCacheCollection();
  const failures: string[] = [];

  const asyncResolve = async (what: string, importer: string) => {
    if (what === 'test-css-processor') return processorFile;

    const file = path.resolve(path.dirname(importer), what);
    return fs.existsSync(`${file}.ts`) ? `${file}.ts` : file;
  };

  const worker = async () => {
    for (let name = queue.shift(); name; name = queue.shift()) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await transform(
          {
            cache,
            options: {
              filename: path.join(root, name),
              root,
              pluginOptions: {
                configFile: false,
                tagResolver: (source, tag) =>
                  source === 'test-css-processor' && tag === 'css'
                    ? processorFile
                    : null,
                babelOptions: {
                  babelrc: false,
                  configFile: false,
                  presets: [
                    ['@babel/preset-env', { loose: true }],
                    '@babel/preset-typescript',
                  ],
                },
              },
            },
          },
          loaded[name],
          asyncResolve
        );
      } catch (error) {
        failures.push(`${name}: ${String(error)}`);
      }
    }
  };

  try {
    Object.entries(files).forEach(([name, code]) => {
      fs.writeFileSync(path.join(root, name), code);
    });

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  expect(failures).toEqual([]);
}, 120000);
