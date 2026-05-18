import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(projectRoot, 'public');
const publicAssetsDir = path.join(publicDir, 'assets');
const publicHookDir = path.join(publicDir, 'hook');

const hookLibraryCandidates = [
  path.join(projectRoot, 'AI人 hook'),
  path.join(projectRoot, 'AI人hook'),
  path.join(projectRoot, 'hook'),
];

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
  ensureHookAssetMirror();

  ensureSymlink({
    linkPath: path.join(publicAssetsDir, 'hook'),
    preferredTarget: '../../hook',
    fallbackPath: publicHookDir,
  });

  ensureSymlink({
    linkPath: path.join(publicAssetsDir, 'source'),
    preferredTarget: '../source',
    fallbackPath: path.join(publicDir, 'source'),
  });
};

export const getHookLibraryDir = () => {
  for (const candidate of hookLibraryCandidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return publicHookDir;
};

export const ensureHookAssetMirror = () => {
  const hookLibraryDir = getHookLibraryDir();

  if (!fs.existsSync(hookLibraryDir) || path.resolve(hookLibraryDir) === path.resolve(publicHookDir)) {
    return;
  }

  fs.mkdirSync(publicHookDir, {recursive: true});
  mirrorDirectory(hookLibraryDir, publicHookDir);
};

const mirrorDirectory = (sourceDir, targetDir) => {
  const entries = fs.readdirSync(sourceDir, {withFileTypes: true});

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(targetPath, {recursive: true});
      mirrorDirectory(sourcePath, targetPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (fs.existsSync(targetPath)) {
      continue;
    }

    const relativeTarget = path.relative(path.dirname(targetPath), sourcePath);
    fs.symlinkSync(relativeTarget, targetPath);
  }
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
