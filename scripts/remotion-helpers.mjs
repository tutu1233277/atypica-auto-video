import fs from 'node:fs';
import path from 'node:path';

export const projectRoot = process.cwd();

export const getArg = (name, fallback) => {
  const args = process.argv.slice(2);
  const match = args.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) {
    return fallback;
  }

  return match.slice(name.length + 3);
};

export const readConfig = (configPath) => {
  const absolutePath = path.resolve(projectRoot, configPath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
};
