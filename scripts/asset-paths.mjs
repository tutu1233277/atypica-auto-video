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

function buildLocalCandidate(assetPath, previewPath, diskPath) {
  return {assetPath, previewPath, diskPath};
}

function resolveLocalAsset(assetRef) {
  const relativeAssetPath = toRelativeAssetPath(assetRef);
  if (!relativeAssetPath) {
    return null;
  }

  const normalizedRelativePath = relativeAssetPath.replace(/^assets\//, '');
  if (!normalizedRelativePath.startsWith('hook/') && !normalizedRelativePath.startsWith('source/')) {
    return null;
  }

  const assetType = normalizedRelativePath.startsWith('hook/') ? 'hook' : 'source';
  const fileName = path.basename(normalizedRelativePath);
  const candidates = [
    buildLocalCandidate(
      normalizedRelativePath,
      `/${normalizedRelativePath}`,
      path.join(publicDir, normalizedRelativePath),
    ),
    buildLocalCandidate(
      `assets/${normalizedRelativePath}`,
      `/assets/${normalizedRelativePath}`,
      path.join(publicDir, 'assets', normalizedRelativePath),
    ),
    buildLocalCandidate(
      `${assetType}/${fileName}`,
      `/${assetType}/${fileName}`,
      path.join(publicDir, assetType, fileName),
    ),
    buildLocalCandidate(
      `assets/${assetType}/${fileName}`,
      `/assets/${assetType}/${fileName}`,
      path.join(publicDir, 'assets', assetType, fileName),
    ),
    buildLocalCandidate(
      `assets/${assetType}/${fileName}`,
      `/assets/${assetType}/${fileName}`,
      path.join(root, assetType, fileName),
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.diskPath)) {
      return {
        assetPath: candidate.assetPath,
        previewPath: candidate.previewPath,
      };
    }
  }

  return null;
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
