import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateText} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {z} from 'zod';
import {loadEnvFiles, readVaultDoc, slugify} from './research-lib.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const presetsPath = path.join(root, 'data/tool/script-generator-presets.json');
const auditSkillPath = path.join(root, 'skills/script-review-audit/SKILL.md');
const debugDir = path.join(root, 'data/tool/debug');

const sceneSchema = z.object({
  title: z.string().min(1),
  zh: z.string().min(1),
  en: z.string().min(1),
  note: z.string().min(1),
});

const candidateSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1),
  angle: z.string().min(1),
  hookStyle: z.enum(['secret', 'mistake', 'panic']),
  score: z.number().int().min(0).max(100),
  audit: z.array(z.string().min(1)).min(3).max(5),
  scenes: z.array(sceneSchema).length(4),
});

const responseSchema = z.object({
  candidates: z.array(candidateSchema).length(3),
});

const alternateSceneSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  assetPath: z.string().min(1).optional(),
  time: z.string().min(1).optional(),
  subtitles: z.object({
    zh: z.string().min(1),
    en: z.string().min(1),
  }),
  directorNote: z.string().min(1),
});

const alternateCandidateSchema = z.object({
  id: z.string().min(1).optional(),
  internalTitle: z.string().min(1),
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
  return JSON.parse(fs.readFileSync(presetsPath, 'utf8'));
}

export function findFeaturePreset(featureKey) {
  const presets = loadGeneratorPresets();
  const feature = presets.features.find((item) => item.key === featureKey);
  if (!feature) {
    throw new Error(`Unknown feature: ${featureKey}`);
  }

  return {presets, feature};
}

export async function generateScriptCandidates({featureKey, topic}) {
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
    'Do not use trailing commas.',
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
    [
      'Output requirements:',
      '- Generate 3 clearly different script candidates.',
      '- Each candidate must fit the chosen feature only.',
      '- Each candidate must have 4 scenes matching the provided scene plan.',
      '- Scene 1 should be a TikTok-native hook.',
      '- Scenes 2-4 should show workflow proof, synthesis/follow-up, and a decision insight.',
      '- English subtitle lines should be concise and readable in 2-3 seconds.',
      '- Chinese subtitle lines are only for internal review and should match the English meaning.',
      '- Audit points should explain why the candidate passes or what to watch out for.',
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
    temperature: 0.7,
  });
  const rawJson = extractJsonText(text);
  let parsedJson;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch (error) {
    const repairedJson = await repairJsonText({
      litellm,
      model,
      rawJson,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    try {
      parsedJson = JSON.parse(repairedJson);
    } catch (repairError) {
      fs.mkdirSync(debugDir, {recursive: true});
      const rawPath = path.join(debugDir, 'last-script-response.txt');
      const repairedPath = path.join(debugDir, 'last-script-response-repaired.txt');
      fs.writeFileSync(rawPath, `${rawJson}\n`, 'utf8');
      fs.writeFileSync(repairedPath, `${repairedJson}\n`, 'utf8');
      console.error('Failed to parse model JSON response:');
      console.error(rawJson);
      console.error('Failed to parse repaired JSON response:');
      console.error(repairedJson);
      throw new Error(
        `Model returned invalid JSON twice. Debug files saved to ${path.relative(root, rawPath)} and ${path.relative(root, repairedPath)}`,
      );
    }
  }

  const parsed = normalizeCandidateResponse(parsedJson);

  return {
    model,
    baseURL,
    topic: resolvedTopic,
    feature: feature.key,
    candidates: parsed.candidates.map((candidate, index) => ({
      ...candidate,
      candidateId: slugify(candidate.candidateId || `${feature.key}-${index + 1}`),
    })),
  };
}

function normalizeCandidateResponse(value) {
  const standard = responseSchema.safeParse(value);
  if (standard.success) {
    return standard.data;
  }

  if (!value || typeof value !== 'object' || !Array.isArray(value.candidates)) {
    throw standard.error;
  }

  const normalized = {
    candidates: value.candidates.map((candidate, index) => normalizeLooseCandidate(candidate, index)),
  };

  return responseSchema.parse(normalized);
}

function normalizeLooseCandidate(candidate, index) {
  const safeCandidate = candidate && typeof candidate === 'object' ? candidate : {};
  const rawScenes = Array.isArray(safeCandidate.scenes) ? safeCandidate.scenes : [];
  const auditText = pickFirstString([
    safeCandidate.angle,
    safeCandidate.auditNotes?.zh,
    safeCandidate.auditNotes?.en,
    safeCandidate.audit?.[0],
  ]);
  const audit = normalizeAuditList(safeCandidate.audit, safeCandidate.auditNotes);

  return {
    candidateId: pickFirstString([safeCandidate.candidateId, safeCandidate.id, `candidate-${index + 1}`]),
    title: pickFirstString([
      safeCandidate.title,
      safeCandidate.internalTitle,
      `Candidate ${index + 1}`,
    ]),
    angle: auditText || audit[0],
    hookStyle: normalizeHookStyle(safeCandidate.hookStyle, rawScenes),
    score: normalizeScore(safeCandidate.score, index),
    audit,
    scenes: rawScenes.map((scene, sceneIndex) => normalizeLooseScene(scene, sceneIndex)),
  };
}

function normalizeLooseScene(scene, sceneIndex) {
  const safeScene = scene && typeof scene === 'object' ? scene : {};
  const zh = pickFirstString([
    safeScene.zh,
    safeScene.subtitles?.zh,
    safeScene.subtitle?.zh,
  ]);
  const en = pickFirstString([
    safeScene.en,
    safeScene.subtitles?.en,
    safeScene.subtitle?.en,
  ]);

  return {
    title: pickFirstString([safeScene.title, safeScene.id, `Scene ${sceneIndex + 1}`]),
    zh: zh || '待补充中文字幕',
    en: en || 'Subtitle to be refined',
    note: pickFirstString([safeScene.note, safeScene.directorNote, 'Match subtitle pacing to footage.']),
  };
}

function normalizeAuditList(audit, auditNotes) {
  const result = [];

  if (Array.isArray(audit)) {
    for (const item of audit) {
      const text = pickFirstString([item]);
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

  while (result.length < 3) {
    result.push('结构合理，但仍建议在最终出片前人工复核字幕节奏与镜头匹配。');
  }

  return result.slice(0, 5);
}

function normalizeHookStyle(hookStyle, scenes) {
  if (hookStyle === 'secret' || hookStyle === 'mistake' || hookStyle === 'panic') {
    return hookStyle;
  }

  return inferHookStyleFromScenes(scenes);
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

function splitAuditNotes(value) {
  return value
    .split(/[。！？\n]+/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferHookStyleFromScenes(scenes) {
  const hookText = `${scenes[0]?.subtitles?.zh ?? ''} ${scenes[0]?.subtitles?.en ?? ''}`.toLowerCase();
  if (hookText.includes('almost') || hookText.includes('差点')) {
    return 'mistake';
  }
  if (hookText.includes('panic') || hookText.includes('慌') || hookText.includes('惊')) {
    return 'panic';
  }
  return 'secret';
}

function extractJsonText(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('Model did not return parseable JSON');
}

async function repairJsonText({litellm, model, rawJson, errorMessage}) {
  const {text} = await generateText({
    model: litellm.chat(model),
    temperature: 0,
    system: [
      'You repair invalid JSON.',
      'Do not change the semantic meaning.',
      'Return valid JSON only.',
      'Do not include markdown fences.',
      'Do not include explanation before or after the JSON.',
      'Use double quotes for every key and every string value.',
      'Escape any double quote characters inside string values.',
      'Do not use trailing commas.',
    ].join('\n'),
    prompt: [
      `The following JSON failed to parse with this error: ${errorMessage}`,
      'Fix the JSON formatting only and return valid JSON.',
      rawJson,
    ].join('\n\n'),
  });

  return extractJsonText(text);
}

function trimForPrompt(value, limit) {
  const trimmed = value.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, limit)}\n...[truncated]`;
}
