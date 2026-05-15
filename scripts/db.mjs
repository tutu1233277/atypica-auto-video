import fs from 'node:fs';
import path from 'node:path';
import {projectRoot} from './remotion-helpers.mjs';

const dbPath = path.join(projectRoot, 'data', 'tool', 'local-db.json');

const defaultDb = () => ({
  candidates: [],
  jobs: [],
});

const blockedFragments = [
  'subtitle to be refined',
  '待补充中文字幕',
  'match subtitle pacing to footage',
  '结构合理，但仍建议在最终出片前人工复核字幕节奏与镜头匹配。',
];

const ensureDbFile = () => {
  fs.mkdirSync(path.dirname(dbPath), {recursive: true});
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, `${JSON.stringify(defaultDb(), null, 2)}\n`, 'utf8');
  }
};

const readDb = () => {
  ensureDbFile();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};

const writeDb = (db) => {
  fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
};

const nowIso = () => new Date().toISOString();

export const initDb = async () => {
  ensureDbFile();
};

export const saveCandidates = async (candidates, metadata = {}) => {
  const validCandidates = candidates.filter(isUsableCandidate);
  if (validCandidates.length !== candidates.length) {
    throw new Error('Generated candidates contained placeholder script content');
  }

  const db = readDb();
  const createdAt = nowIso();
  const feature = metadata.feature ?? 'unknown';

  const rows = validCandidates.map((candidate, index) => ({
    id: `${candidate.candidateId}-${Date.now()}-${index}`,
    candidate_id: candidate.candidateId,
    feature,
    topic: metadata.topic ?? '',
    title: candidate.title,
    angle: candidate.angle,
    hook_style: candidate.hookStyle,
    score: candidate.score,
    scenes: candidate.scenes ?? [],
    audit: candidate.audit ?? [],
    model: metadata.model ?? '',
    base_url: metadata.baseURL ?? '',
    selected: index === 0,
    created_at: createdAt,
    updated_at: createdAt,
  }));

  db.candidates = db.candidates.filter((row) => row.feature !== feature);
  db.candidates.unshift(...rows);
  writeDb(db);
  return rows;
};

export const getCandidates = async (feature) => {
  const db = readDb();
  return db.candidates
    .filter((row) => row.feature === feature)
    .filter(isUsableCandidate)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
};

export const selectCandidate = async (candidateId) => {
  const db = readDb();
  let selected = null;

  db.candidates = db.candidates.map((row) => {
    if (row.candidate_id === candidateId) {
      selected = {
        ...row,
        selected: true,
        updated_at: nowIso(),
      };
      return selected;
    }

    return row.selected
      ? {
          ...row,
          selected: false,
          updated_at: nowIso(),
        }
      : row;
  });

  writeDb(db);
  if (!selected) {
    throw new Error(`Candidate not found: ${candidateId}`);
  }

  return selected;
};

export const createJob = async (jobId, payload = {}) => {
  const db = readDb();
  const createdAt = nowIso();
  const job = {
    id: jobId,
    status: 'pending',
    created_at: createdAt,
    updated_at: createdAt,
    ...payload,
  };

  db.jobs = db.jobs.filter((row) => row.id !== jobId);
  db.jobs.unshift(job);
  writeDb(db);
  return job;
};

export const updateJob = async (jobId, patch = {}) => {
  const db = readDb();
  let updated = null;

  db.jobs = db.jobs.map((row) => {
    if (row.id !== jobId) {
      return row;
    }

    updated = {
      ...row,
      ...patch,
      updated_at: nowIso(),
    };
    return updated;
  });

  writeDb(db);
  if (!updated) {
    throw new Error(`Job not found: ${jobId}`);
  }

  return updated;
};

export const getJob = async (jobId) => {
  const db = readDb();
  return db.jobs.find((row) => row.id === jobId) ?? null;
};

export const getRecentJobs = async (limit = 20) => {
  const db = readDb();
  return db.jobs.slice(0, limit);
};

function isUsableCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  if (containsBlockedText(candidate.angle)) {
    return false;
  }

  if (Array.isArray(candidate.audit) && candidate.audit.some(containsBlockedText)) {
    return false;
  }

  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) {
    return false;
  }

  return candidate.scenes.every((scene) => {
    if (!scene || typeof scene !== 'object') {
      return false;
    }

    return !containsBlockedText(scene.zh) && !containsBlockedText(scene.en);
  });
}

function containsBlockedText(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) {
    return true;
  }

  return blockedFragments.some((fragment) => text.includes(fragment.toLowerCase()));
}
