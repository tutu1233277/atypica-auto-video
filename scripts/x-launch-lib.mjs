import fs from 'node:fs';
import path from 'node:path';
import {readConfig} from './remotion-helpers.mjs';
import {loadEnvFiles, readVaultDoc, slugify} from './research-lib.mjs';

export const defaultOutputPath = 'data/x/atypica-launch-drafts.json';

const defaultFacts = {
  name: 'Atypica',
  url: 'https://atypica.com',
  category: 'AI market research',
  audience: 'founders, PMs, and researchers',
  oldWay: '3 months + $50,000',
  newWay: '20 minutes + $20/month',
  sources: 'X, Reddit, TikTok, and Instagram',
  outcome: 'clear market answers before you build the wrong thing',
};

export const getProductFacts = () => {
  const knowledge = readVaultDoc('atypica产品知识库.md');
  const facts = {...defaultFacts};

  if (knowledge.includes('AI驱动的市场调研平台')) {
    facts.category = 'AI-driven market research';
  }

  if (knowledge.includes('创业者/Founders')) {
    facts.audience = 'founders, product teams, and UX researchers';
  }

  if (knowledge.includes('TikTok、Twitter/X、Instagram、Reddit')) {
    facts.sources = 'X, TikTok, Instagram, and Reddit';
  }

  return facts;
};

export const loadLaunchExamples = (relativePath = 'data/research/x-launch-examples.json') => {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
};

export const generateLaunchVariants = ({
  count = 5,
  customUrl = '',
  examplesPath,
}) => {
  const facts = getProductFacts();
  if (customUrl) {
    facts.url = customUrl;
  }

  const examples = loadLaunchExamples(examplesPath);
  const variants = [
    {
      id: 'contrast-launch',
      angle: 'contrast',
      inspiredBy: ['Kairos', 'Unlink'],
      text: `Market research used to mean ${facts.oldWay}.\n\nWe built ${facts.name} so founders and product teams can go from question to answer in ${facts.newWay}.\n\nReal signals in. Clear decision out.\n\n${facts.url}`,
    },
    {
      id: 'official-launch',
      angle: 'official',
      inspiredBy: ['Holoworld AI'],
      text: `It’s official. ${facts.name} is live.\n\nThis is ${facts.category} for teams that do not have months or a $50k research budget.\n\nAsk a market question. Get real social signal. Leave with a decision.\n\n${facts.url}`,
    },
    {
      id: 'founder-pain',
      angle: 'founder_story',
      inspiredBy: ['SuperX'],
      text: `Founders should not need ${facts.oldWay} to learn what users actually want.\n\nSo we built ${facts.name}.\n\nIt turns real conversations from ${facts.sources} into market research in ${facts.newWay}.\n\n${facts.url}`,
    },
    {
      id: 'one-line-promise',
      angle: 'one_liner',
      inspiredBy: ['Kairos', 'YC / chasi_ai'],
      text: `We built ${facts.name}: ${facts.category} that turns ${facts.oldWay} into ${facts.newWay}.\n\nBuilt for ${facts.audience} who need ${facts.outcome}.\n\n${facts.url}`,
    },
    {
      id: 'social-proof',
      angle: 'proof',
      inspiredBy: ['virat', 'Unlink'],
      text: `We built ${facts.name} for one reason:\nmarket research is still way too slow and way too expensive.\n\n${facts.name} turns real social signal from ${facts.sources} into a usable report in ${facts.newWay}.\n\nNo agency timeline. No five-figure scope.\n\n${facts.url}`,
    },
    {
      id: 'pm-hook',
      angle: 'pm',
      inspiredBy: ['YC / chasi_ai'],
      text: `For PMs and founders, the most expensive mistake is building before you understand demand.\n\n${facts.name} helps you validate ideas and map competitor pain points with real social signal.\n\n${facts.newWay} instead of ${facts.oldWay}.\n\n${facts.url}`,
    },
  ]
    .map((variant) => ({
      ...variant,
      charCount: countCharacters(variant.text),
      score: scoreVariant(variant.text),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  const recommended = variants[0] ?? null;

  return {
    product: facts,
    research: summarizeExamples(examples),
    generatedAt: new Date().toISOString(),
    recommendedId: recommended?.id ?? null,
    variants,
  };
};

export const writeLaunchVariants = ({
  out = defaultOutputPath,
  count = 5,
  customUrl = '',
  examplesPath = 'data/research/x-launch-examples.json',
}) => {
  const payload = generateLaunchVariants({count, customUrl, examplesPath});
  const absolutePath = path.resolve(process.cwd(), out);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return {payload, out, slug: slugify(payload.product.name)};
};

export const pickVariantFromFile = ({
  filePath = defaultOutputPath,
  variantId = '',
}) => {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const payload = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  const variant =
    payload.variants.find((item) => item.id === variantId) ??
    payload.variants.find((item) => item.id === payload.recommendedId) ??
    payload.variants[0] ??
    null;
  return {payload, variant};
};

export const loadXCredentials = (configPath = 'config/x-account.json') => {
  loadEnvFiles();
  const fileConfig = fs.existsSync(path.resolve(process.cwd(), configPath))
    ? readConfig(configPath)
    : {};
  return {
    appKey: process.env.X_API_KEY ?? process.env.X_CONSUMER_KEY ?? fileConfig.appKey ?? '',
    appSecret:
      process.env.X_API_SECRET ?? process.env.X_CONSUMER_SECRET ?? fileConfig.appSecret ?? '',
    accessToken: process.env.X_ACCESS_TOKEN ?? fileConfig.accessToken ?? '',
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET ?? fileConfig.accessSecret ?? '',
  };
};

const summarizeExamples = (examples) => {
  return {
    provider: examples.provider,
    query: examples.query,
    topPatterns: examples.summary?.patterns ?? [],
    topExamples: (examples.items ?? []).slice(0, 3).map((item) => ({
      title: item.title,
      url: item.url,
      hook: item.hook,
    })),
  };
};

const scoreVariant = (text) => {
  let score = 0;
  const lowered = text.toLowerCase();

  if (text.length <= 280) {
    score += 20;
  } else {
    score -= (text.length - 280) * 2;
  }

  if (/\d/.test(text)) {
    score += 8;
  }
  if (lowered.includes('we built')) {
    score += 6;
  }
  if (lowered.includes('it’s official') || lowered.includes("it's official")) {
    score += 5;
  }
  if (lowered.includes('no ')) {
    score += 4;
  }
  if (lowered.includes('founders') || lowered.includes('pms')) {
    score += 4;
  }
  if (lowered.includes('reddit') || lowered.includes('tiktok')) {
    score += 3;
  }

  return score;
};

const countCharacters = (text) => [...text].length;
