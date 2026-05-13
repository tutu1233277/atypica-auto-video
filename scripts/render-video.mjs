import {spawnSync} from 'node:child_process';
import {ensurePublicAssetLinks, getArg, projectRoot, readConfig} from './remotion-helpers.mjs';

const configPath = getArg('config', 'data/videos/competitor-ugc.json');
const outPath = getArg(
  'out',
  `out/${configPath.split('/').pop()?.replace('.json', '.mp4') ?? 'video.mp4'}`,
);
const browserExecutable = getArg('browser-executable', '');
const timeout = getArg('timeout', '120000');
const config = readConfig(configPath);

ensurePublicAssetLinks();

const renderArgs = [
  'remotion',
  'render',
  'src/index.ts',
  'AtypicaAutoVideo',
  outPath,
  `--timeout=${timeout}`,
  `--props=${JSON.stringify({config})}`,
];

if (browserExecutable) {
  renderArgs.push(`--browser-executable=${browserExecutable}`);
}

const result = spawnSync(
  'npx',
  renderArgs,
  {
    cwd: projectRoot,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
