import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateText} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {z} from 'zod';
import {normalizeGeneratorPresets} from './asset-paths.mjs';
import {
  annotateTrendItem,
  loadEnvFiles,
  rankInspiration,
  readVaultDoc,
  slugify,
} from './research-lib.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const presetsPath = path.join(root, 'data/tool/script-generator-presets.json');
const auditSkillPath = path.join(root, 'skills/script-review-audit/SKILL.md');

const sceneSchema = z.object({
  title: z.string().min(1),
  zh: z.string().min(1),
  en: z.string().min(1),
  note: z.string().optional().default(''),
});

const candidateSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1),
  angle: z.string().min(1),
  hookStyle: z.enum(['secret', 'mistake', 'panic']),
  score: z.number().int().min(0).max(100),
  audit: z.array(z.string().min(1)).max(5),
  scenes: z.array(sceneSchema).length(4),
});

const responseSchema = z.object({
  candidates: z.array(candidateSchema).length(3),
});

const alternateSceneSchema = z.object({
  scene_id: z.string().min(1).optional(),
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  time: z.string().min(1).optional(),
  zh: z.string().min(1).optional(),
  en: z.string().min(1).optional(),
  note: z.string().min(1).optional(),
  audit: z
    .union([
      z.string().min(1),
      z.object({
        zh: z.string().min(1).optional(),
        en: z.string().min(1).optional(),
      }),
    ])
    .optional(),
  asset: z.string().min(1).optional(),
});

const alternateCandidateSchema = z.object({
  candidateId: z.string().min(1).optional(),
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  theme: z.string().min(1).optional(),
  internalTitle: z.string().min(1).optional(),
  angle: z.string().min(1).optional(),
  hookStyle: z.string().min(1).optional(),
  hook_type: z.string().min(1).optional(),
  score: z.number().int().min(0).max(100).optional(),
  audit: z
    .object({
      feature_fit: z.string().min(1).optional(),
      hook_strength: z.string().min(1).optional(),
      claim_credibility: z.string().min(1).optional(),
      visual_match: z.string().min(1).optional(),
      watch_out: z.string().min(1).optional(),
    })
    .optional(),
  auditNotes: z
    .object({
      zh: z.string().min(1).optional(),
      en: z.string().min(1).optional(),
    })
    .optional(),
  scenes: z.array(alternateSceneSchema).length(4),
});

const alternateResponseSchema = z.object({
  candidates: z.array(alternateCandidateSchema).length(3),
});

export function loadGeneratorPresets() {
  const presets = JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
  return normalizeGeneratorPresets(presets);
}

export function findFeaturePreset(featureKey) {
  const presets = loadGeneratorPresets();
  const feature = presets.features.find((item) => item.key === featureKey);
  if (!feature) {
    throw new Error(`Unknown feature: ${featureKey}`);
  }

  return {presets, feature};
}

export async function generateScriptCandidates({featureKey, topic, researchPath = ''}) {
  loadEnvFiles();

  const apiKey = process.env.AI_SDK_API_KEY || process.env.LITELLM_API_KEY;
  if (!apiKey) {
    throw new Error('Missing AI_SDK_API_KEY');
  }

  const baseURL =
    process.env.AI_SDK_BASE_URL ||
    process.env.LITELLM_BASE_URL ||
    'https://cloudnative.tezign.com/litellm/api/v1';
  const model = process.env.AI_SDK_MODEL || process.env.LITELLM_MODEL || 'claude-sonnet-4-6';
  const {feature} = findFeaturePreset(featureKey);
  const skillText = fs.readFileSync(auditSkillPath, 'utf8');
  const knowledge = trimForPrompt(readVaultDoc('atypica产品知识库.md'), 5000);
  const historicalScripts = trimForPrompt(readVaultDoc('atypica海外内容完整脚本.md'), 4000);
  const resolvedTopic = topic?.trim() || feature.defaultTopic;
  const recentResearch = loadRecentResearchReferences({
    featureKey,
    topic: resolvedTopic,
    researchPath,
  });

  const instructions = [
    'You generate short-form UGC video script candidates for Atypica internal use.',
    'Follow the provided script review audit rules strictly.',
    'The website UI is Chinese, but the generated video should use English subtitle lines.',
    'Return Chinese internal review text in zh fields and English video subtitle text in en fields.',
    'Do not mention Atypica in subtitle copy unless explicitly requested.',
    'The tone should feel like a creator sharing a discovery, not a direct ad.',
    'Return exactly 3 distinct candidates.',
    'Return valid JSON only.',
    'Do not include markdown fences.',
    'Do not include explanation before or after the JSON.',
    'Use double quotes for every JSON key and every string value.',
    'Escape any double quote characters inside string values.',
    'Prefer rewriting to avoid double quote characters inside string values entirely.',
    'Do not use trailing commas.',
    'Every candidate must include 4 fully written scenes with non-placeholder zh and en subtitle lines.',
    'Do not use placeholders such as "Subtitle to be refined", "待补充中文字幕", or "TBD".',
    'Audit items must be specific and non-generic.',
    'Use exactly this shape and no extra keys: {"candidates":[{"candidateId":"","title":"","angle":"","hookStyle":"secret|mistake|panic","score":90,"audit":["","",""],"scenes":[{"title":"","zh":"","en":"","note":""},{"title":"","zh":"","en":"","note":""},{"title":"","zh":"","en":"","note":""},{"title":"","zh":"","en":"","note":""}]}]}',
    'Do not output nested audit objects, scene_id fields, theme fields, asset fields, or time fields.',
  ].join('\n');

  const input = [
    `Feature: ${feature.label} (${feature.key})`,
    `User topic: ${resolvedTopic}`,
    `Feature description: ${feature.description}`,
    `Scene plan: ${JSON.stringify(feature.scenePlan, null, 2)}`,
    `Example topics: ${feature.sampleTopics.join(', ')}`,
    'Audit skill and hard rules:',
    skillText,
    'Product knowledge summary:',
    knowledge,
    'Historical script examples summary:',
    historicalScripts,
    'Recent viral hook references:',
    recentResearch.length > 0
      ? recentResearch.map((item) => `- ${item}`).join('\n')
      : '- No recent research cache found. Lean on hook rules and product proof.',
    [
      'Output requirements:',
      '- Generate 3 clearly different script candidates.',
      '- Each candidate must fit the chosen feature only.',
      '- Each candidate must have 4 scenes matching the provided scene plan.',
      '- Scene 1 should be a TikTok-native hook.',
      '- Scenes 2-4 should show workflow proof, synthesis/follow-up, and a decision insight.',
      '- Borrow hook structure or pacing from the recent references when useful, but do not copy niche details that do not fit Atypica.',
      '- English subtitle lines should be concise and readable in 2-3 seconds.',
      '- Chinese subtitle lines are only for internal review and should match the English meaning.',
      '- Audit points should explain why the candidate passes or what to watch out for.',
      '- Keep every audit point to one short sentence.',
      '- Do not quote phrases inside audit or note text; rewrite instead.',
    ].join('\n'),
  ].join('\n\n');

  const litellm = createOpenAI({
    apiKey,
    baseURL,
  });

  const {text} = await generateText({
    model: litellm.chat(model),
    system: instructions,
    prompt: input,
  });
  const parsed = validateCandidateResponse(await parseCandidateTextResponse(text, litellm.chat(model)));

  return {
    model,
    baseURL,
    topic: resolvedTopic,
    feature: feature.key,
    recentResearch,
    candidates: parsed.candidates.map((candidate, index) => ({
      ...candidate,
      candidateId: slugify(candidate.candidateId || `${feature.key}-${index + 1}`),
    })),
  };
}

function loadRecentResearchReferences({featureKey, topic, researchPath}) {
  const reports = loadResearchReports(researchPath);
  const hint = featureKey === 'research' ? 'report' : 'interview';
  const references = reports
    .flatMap((report) =>
      (report.items ?? []).map((item) => ({
        ...annotateTrendItem(item, {topic, hint}),
        reportGeneratedAt: report.generatedAt ?? null,
      })),
    )
    .filter((item) => !item.hardReject)
    .sort((a, b) => {
      const rankDelta = rankInspiration(b, {topic, hint}) - rankInspiration(a, {topic, hint});
      if (rankDelta !== 0) {
        return rankDelta;
      }
      return (Date.parse(b.reportGeneratedAt ?? '') || 0) - (Date.parse(a.reportGeneratedAt ?? '') || 0);
    });

  const seen = new Set();
  return references
    .filter((item) => {
      const key = item.url || `${item.platform}:${item.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 4)
    .map((item) => formatReferenceLine(item));
}

function loadResearchReports(researchPath) {
  const targetPaths = resolveResearchPaths(researchPath);
  const reports = [];

  for (const targetPath of targetPaths) {
    if (!fs.existsSync(targetPath)) {
      continue;
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        reports.push(parsed);
      }
    } catch {
      // Ignore malformed cache files and continue with the rest.
    }
  }

  return reports;
}

function resolveResearchPaths(researchPath) {
  if (researchPath) {
    return [path.isAbsolute(researchPath) ? researchPath : path.join(root, researchPath)];
  }

  const researchDir = path.join(root, 'data/research');
  if (!fs.existsSync(researchDir)) {
    return [];
  }

  return fs
    .readdirSync(researchDir)
    .filter((fileName) => fileName.endsWith('.json') && fileName !== 'x-launch-examples.json')
    .map((fileName) => path.join(researchDir, fileName));
}

function formatReferenceLine(item) {
  const hook = trimInline(item.hook || item.title, 90);
  const why = trimInline((item.fitReasons ?? []).join('; '), 120);
  return `${capitalize(item.platform)} | ${item.fitVerdict} | ${item.format} | Hook: ${hook} | Why it worked: ${why}`;
}

function capitalize(value) {
  const text = typeof value === 'string' ? value : 'unknown';
  return text.slice(0, 1).toUpperCase() + text.slice(1);
}

function trimInline(value, limit) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1)}…`;
}

function validateCandidateResponse(value) {
  const parsed = normalizeCandidateResponse(value);

  for (const candidate of parsed.candidates) {
    assertMeaningfulText(candidate.angle, `Candidate "${candidate.title}" is missing a usable angle`);

    for (const auditItem of candidate.audit) {
      assertMeaningfulText(auditItem, `Candidate "${candidate.title}" contains a generic audit note`);
    }

    for (const scene of candidate.scenes) {
      assertMeaningfulText(scene.zh, `Candidate "${candidate.title}" has a placeholder Chinese subtitle`);
      assertMeaningfulText(scene.en, `Candidate "${candidate.title}" has a placeholder English subtitle`);
    }
  }

  return parsed;
}

async function parseCandidateTextResponse(text, model) {
  const extracted = extractJsonObject(text);
  const attempts = [extracted, repairJsonStringQuotes(extracted)];
  let lastError = null;

  for (const candidateText of attempts) {
    try {
      return JSON.parse(candidateText);
    } catch (error) {
      lastError = error;
    }
  }

  if (model) {
    const repaired = await repairCandidateJsonWithModel(extracted, model);
    const repairedObject = extractJsonObject(repaired);
    for (const candidateText of [repairedObject, repairJsonStringQuotes(repairedObject)]) {
      try {
        return JSON.parse(candidateText);
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError ?? new Error('Model output was not valid JSON');
}

function extractJsonObject(text) {
  const raw = String(text ?? '').trim();
  const fenced = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model output did not contain a JSON object');
  }

  return fenced.slice(start, end + 1);
}

function repairJsonStringQuotes(text) {
  let result = '';
  let inString = false;
  let escaping = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      result += char;
      continue;
    }

    if (escaping) {
      result += char;
      escaping = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escaping = true;
      continue;
    }

    if (char === '"') {
      const nextNonWhitespace = findNextNonWhitespace(text, index + 1);
      if (nextNonWhitespace === ',' || nextNonWhitespace === '}' || nextNonWhitespace === ']' || nextNonWhitespace === ':') {
        result += char;
        inString = false;
      } else {
        result += '\\"';
      }
      continue;
    }

    result += char;
  }

  return result;
}

function findNextNonWhitespace(text, startIndex) {
  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    if (!/\s/u.test(char)) {
      return char;
    }
  }

  return '';
}

async function repairCandidateJsonWithModel(brokenJson, model) {
  const repairInstructions = [
    'You repair malformed JSON.',
    'Return valid JSON only.',
    'Preserve all original content and wording.',
    'Do not summarize, translate, or rewrite content.',
    'Only fix escaping, missing commas, brackets, or quotes.',
    'Do not wrap the JSON in markdown fences.',
  ].join('\n');

  const {text} = await generateText({
    model,
    system: repairInstructions,
    prompt: brokenJson,
  });

  return text;
}

function normalizeCandidateResponse(value) {
  const standard = responseSchema.safeParse(value);
  if (standard.success) {
    return standard.data;
  }

  const alternate = alternateResponseSchema.safeParse(value);
  if (!alternate.success) {
    throw standard.error;
  }

  return responseSchema.parse({
    candidates: alternate.data.candidates.map((candidate, index) => normalizeAlternateCandidate(candidate, index)),
  });
}

function normalizeAlternateCandidate(candidate, index) {
  const auditList = normalizeAuditList(candidate.audit, candidate.auditNotes, candidate.scenes);
  const title = pickFirstString([candidate.title, candidate.theme, candidate.internalTitle]);
  return {
    candidateId: pickFirstString([candidate.candidateId, candidate.id, `candidate-${index + 1}`]),
    title,
    angle: pickFirstString([
      candidate.angle,
      candidate.theme,
      typeof candidate.audit === 'object' && !Array.isArray(candidate.audit) ? candidate.audit.hook_strength : '',
      auditList[0],
      title,
    ]),
    hookStyle: normalizeHookStyle(candidate.hookStyle || candidate.hook_type),
    score: normalizeScore(candidate.score, index),
    audit: auditList,
    scenes: candidate.scenes.map((scene, sceneIndex) => normalizeAlternateScene(scene, sceneIndex)),
  };
}

function normalizeAlternateScene(scene, sceneIndex) {
  const auditText = pickAuditText(scene.audit);
  return {
    title: pickFirstString([scene.title, humanizeSceneId(scene.scene_id || scene.id), `Scene ${sceneIndex + 1}`]),
    zh: requireText(scene.zh, `Scene ${sceneIndex + 1} is missing Chinese subtitle`),
    en: requireText(scene.en, `Scene ${sceneIndex + 1} is missing English subtitle`),
    note: pickFirstString([scene.note, auditText]),
  };
}

function assertMeaningfulText(value, errorMessage) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(errorMessage);
  }

  const normalized = text.toLowerCase();
  const blockedPhrases = [
    'subtitle to be refined',
    '待补充中文字幕',
    'match subtitle pacing to footage',
    'tbd',
    'to be filled',
    'placeholder',
    '结构合理，但仍建议在最终出片前人工复核字幕节奏与镜头匹配。',
  ];

  if (blockedPhrases.some((phrase) => normalized.includes(phrase.toLowerCase()))) {
    throw new Error(errorMessage);
  }
}

function normalizeAuditList(audit, auditNotes, scenes = []) {
  const result = [];

  if (Array.isArray(audit)) {
    for (const item of audit) {
      const text = String(item ?? '').trim();
      if (text) {
        result.push(text);
      }
    }
  } else if (audit && typeof audit === 'object') {
    for (const item of Object.values(audit)) {
      const text = String(item ?? '').trim();
      if (text) {
        result.push(text);
      }
    }
  }

  if (result.length === 0 && auditNotes?.zh) {
    result.push(...splitAuditNotes(auditNotes.zh));
  }

  if (result.length === 0 && auditNotes?.en) {
    result.push(...splitAuditNotes(auditNotes.en));
  }

  if (result.length === 0) {
    for (const scene of scenes) {
      const sceneAudit = pickAuditText(scene?.audit);
      if (sceneAudit) {
        result.push(sceneAudit);
      }
    }
  }

  return result.slice(0, 5);
}

function pickAuditText(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    return pickFirstString([value.zh, value.en]);
  }

  return '';
}

function normalizeHookStyle(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'secret' || text === 'mistake' || text === 'panic') {
    return text;
  }

  if (text.includes('almost') || text.includes('mistake')) {
    return 'mistake';
  }

  if (text.includes('panic') || text.includes('shock')) {
    return 'panic';
  }

  return 'secret';
}

function normalizeScore(score, index) {
  if (typeof score === 'number' && Number.isFinite(score)) {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  return Math.max(82, 96 - index * 3);
}

function pickFirstString(values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function requireText(value, errorMessage) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw new Error(errorMessage);
  }
  return text;
}

function humanizeSceneId(value) {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return text
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function splitAuditNotes(value) {
  return value
    .split(/[。！？\n]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function trimForPrompt(value, limit) {
  const trimmed = value.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, limit)}\n...[truncated]`;
}
