import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(root, 'public');

function toRelativeAssetPath(assetRef) {
  if (typeof assetRef !== 'string') {
    return null;
  }

  const trimmed = assetRef.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      return decodeURIComponent(url.pathname).replace(/^\/+/, '');
    } catch {
      return null;
    }
  }

  return trimmed.replace(/^\/+/, '').replace(/^public\//, '');
}

function resolveLocalAsset(assetRef) {
  const relativeAssetPath = toRelativeAssetPath(assetRef);
  if (!relativeAssetPath) {
    return null;
  }

  if (!relativeAssetPath.startsWith('hook/') && !relativeAssetPath.startsWith('source/')) {
    return null;
  }

  const directPublicPath = path.join(publicDir, relativeAssetPath);
  const assetMirrorPath = path.join(publicDir, 'assets', relativeAssetPath);
  const repoPath = path.join(root, relativeAssetPath);

  if (!fs.existsSync(directPublicPath) && !fs.existsSync(assetMirrorPath) && !fs.existsSync(repoPath)) {
    return null;
  }

  return {
    assetPath: `assets/${relativeAssetPath}`,
    previewPath: `/public/assets/${relativeAssetPath}`,
  };
}

export function normalizeAssetPath(assetRef) {
  return resolveLocalAsset(assetRef)?.assetPath ?? assetRef;
}

export function normalizePreviewPath(assetRef, previewPath) {
  return resolveLocalAsset(assetRef)?.previewPath ?? previewPath;
}

export function normalizeGeneratorPresets(presets) {
  return {
    ...presets,
    features: (presets.features ?? []).map((feature) => ({
      ...feature,
      scenePlan: (feature.scenePlan ?? []).map((scene) => ({
        ...scene,
        assetPath: normalizeAssetPath(scene.assetPath),
        previewPath: normalizePreviewPath(scene.assetPath, scene.previewPath),
      })),
    })),
  };
}
