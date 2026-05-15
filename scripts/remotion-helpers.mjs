import fs from 'node:fs';
import path from 'node:path';

export const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const publicAssetsDir = path.join(publicDir, 'assets');

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

export const ensurePublicAssetLinks = () => {
  ensureSymlink({
    linkPath: path.join(publicAssetsDir, 'hook'),
    preferredTarget: '../../hook',
    fallbackPath: path.join(projectRoot, 'hook'),
  });

  ensureSymlink({
    linkPath: path.join(publicAssetsDir, 'source'),
    preferredTarget: '../source',
    fallbackPath: path.join(publicDir, 'source'),
  });
};

const ensureSymlink = ({linkPath, preferredTarget, fallbackPath}) => {
  const linkExists = fs.existsSync(linkPath) || fs.lstatSync(linkPath, {throwIfNoEntry: false});
  const fallbackExists = fs.existsSync(fallbackPath);

  if (!fallbackExists) {
    return;
  }

  if (linkExists) {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      const target = fs.readlinkSync(linkPath);
      const resolvedTarget = path.resolve(path.dirname(linkPath), target);
      if (fs.existsSync(resolvedTarget)) {
        return;
      }
      fs.unlinkSync(linkPath);
    } else if (stats.isDirectory()) {
      return;
    } else {
      return;
    }
  }

  fs.mkdirSync(path.dirname(linkPath), {recursive: true});
  fs.symlinkSync(preferredTarget, linkPath);
};
