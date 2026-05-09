import {spawnSync} from 'node:child_process';
import {getArg, projectRoot, readConfig} from './remotion-helpers.mjs';

const configPath = getArg('config', 'data/videos/competitor-ugc.json');
const config = readConfig(configPath);

const result = spawnSync(
  'npx',
  [
    'remotion',
    'studio',
    'src/index.ts',
    `--props=${JSON.stringify({config})}`,
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
