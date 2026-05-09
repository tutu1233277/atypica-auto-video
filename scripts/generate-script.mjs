import fs from 'node:fs';
import path from 'node:path';
import {getArg, projectRoot} from './remotion-helpers.mjs';
import {
  cleanMarkdown,
  isHighCostFormat,
  readJsonIfExists,
  readVaultDoc,
  selectBestInspiration,
  slugify,
} from './research-lib.mjs';

const preset = getArg('preset', '');
const topic = getArg('topic', '');
const resolvedKey = preset || topic || 'competitor';
const output = getArg('out', `data/videos/${slugify(topic || resolvedKey)}.json`);
const researchPath = getArg('research', 'data/research/ai-ugc-trends.json');

const knowledge = readVaultDoc('atypica产品知识库.md');
const scriptsDoc = readVaultDoc('atypica海外内容完整脚本.md');
const trendsDoc = readVaultDoc('tiktok ig视频链接.md');
const researchReport = readJsonIfExists(researchPath);

const templates = [
  {
    key: 'competitor',
    match: ['竞品', 'competitor'],
    defaultTopic: 'Competitor Research',
    inspirationHint: 'complaint',
    scenes: [
      {
        id: 'hook-reaction',
        assetPath: 'hook/特写脸部惊讶表情.mp4',
        durationInFrames: 90,
        subtitle: {zh: '千万别让我老板\n知道这个', en: 'DO NOT let my boss\nfind out about this'},
      },
      {
        id: 'research-question',
        assetPath: 'source/竞品分析：抓取社媒界面.mp4',
        durationInFrames: 90,
        subtitle: {zh: '我只输入了一个问题\n它开始抓真实社媒信号', en: 'I typed one question\nand it pulled real social signals'},
      },
      {
        id: 'report-patterns',
        assetPath: 'source/competitor-report-proof.mp4',
        durationInFrames: 90,
        subtitle: {zh: '不是几条评论截图\n是直接整理成痛点报告', en: 'Not random screenshots\nan actual pain-point report'},
      },
      {
        id: 'report-result',
        assetPath: 'source/竞品分析：报告结果中总结的三个痛点.mp4',
        durationInFrames: 90,
        subtitle: {zh: '20分钟后\n我知道该从哪里打他们', en: '20 minutes later\nI knew exactly where to compete'},
      },
    ],
  },
  {
    key: 'market',
    match: ['室内', 'market', 'design', 'validation'],
    defaultTopic: 'Market Validation',
    inspirationHint: 'turns out',
    scenes: [
      {
        id: 'hook-reaction',
        assetPath: 'hook/特写脸部惊讶表情.mp4',
        durationInFrames: 90,
        subtitle: {zh: '我差点做了一个\n没人真的想要的产品', en: 'I almost built something\nnobody actually wanted'},
      },
      {
        id: 'research-question',
        assetPath: 'source/室内设计是否有市场：抓取社媒界面.mp4',
        durationInFrames: 90,
        subtitle: {zh: '我把市场问题输进去\n它开始抓真实讨论', en: 'I typed the market question\nand it pulled real discussions'},
      },
      {
        id: 'social-proof',
        assetPath: 'source/market-social-proof.mp4',
        durationInFrames: 90,
        subtitle: {zh: '重点不是大家说了什么\n是它把重复模式找出来了', en: 'The point was not the comments\nit found the repeated patterns'},
      },
      {
        id: 'report-result',
        assetPath: 'source/atypica-pointing-hand.mp4',
        durationInFrames: 90,
        subtitle: {zh: '然后我才决定\n这个市场值不值得做', en: 'Then I decided\nif the market was worth building for'},
      },
    ],
  },
  {
    key: 'interview',
    match: ['面试', 'interview', 'hiring', 'resume', 'job'],
    defaultTopic: 'Interview Insights',
    inspirationHint: 'boss',
    scenes: [
      {
        id: 'hook-reaction',
        assetPath: 'hook/market-hook-closeup.mp4',
        durationInFrames: 54,
        subtitle: {zh: 'I scraped what hiring managers complain about', en: 'I scraped what hiring managers\nactually reject people for'},
      },
      {
        id: 'scrape-proof',
        assetPath: 'source/market-social-proof.mp4',
        durationInFrames: 78,
        subtitle: {zh: 'The pattern was not experience', en: 'The pattern was not experience.\nIt was vague, generic answers'},
      },
      {
        id: 'cta-hand',
        assetPath: 'source/atypica-pointing-hand.mp4',
        durationInFrames: 48,
        subtitle: {zh: 'That is how I prep for interviews now', en: 'That is how I prep for interviews now'},
      },
    ],
  },
  {
    key: 'dating',
    match: ['两性', 'dating', 'ghost', 'relationship', 'love'],
    defaultTopic: 'Dating Patterns',
    inspirationHint: 'turns out',
    scenes: [
      {
        id: 'hook-reaction',
        assetPath: 'hook/market-hook-closeup.mp4',
        durationInFrames: 54,
        subtitle: {zh: 'I scraped why people get ghosted', en: 'I scraped why people\nkeep getting ghosted'},
      },
      {
        id: 'scrape-proof',
        assetPath: 'source/market-social-proof.mp4',
        durationInFrames: 78,
        subtitle: {zh: 'It was not because they texted first', en: 'It was not because they texted first.\nIt was low-effort replies'},
      },
      {
        id: 'cta-hand',
        assetPath: 'source/atypica-pointing-hand.mp4',
        durationInFrames: 48,
        subtitle: {zh: 'That changed how I read dating advice', en: 'That changed how I read dating advice'},
      },
    ],
  },
];

const template = pickTemplate({topic, preset});
const resolvedTopic = topic || template.defaultTopic;
const inspiration = buildInspiration({
  researchReport,
  markdown: trendsDoc,
  topic: resolvedTopic,
  hint: template.inspirationHint,
});
const config = {
  id: slugify(resolvedTopic),
  title: `${resolvedTopic} Auto Script`,
  topic: resolvedTopic,
  fps: 30,
  width: 1080,
  height: 1920,
  style: {
    accent: '#ff8d4d',
    background: '#050816',
  },
  inspiration,
  scenes: template.scenes,
  cta: {
    zh: 'atypica.com',
    en: 'atypica.com',
  },
  notes: {
    sourceDocs: summarizeSourceCoverage([knowledge, scriptsDoc, trendsDoc]),
    researchProvider: researchReport?.provider ?? 'local_markdown',
    researchQuery: researchReport?.query ?? null,
    templateKey: template.key,
    topFormats: researchReport?.summary?.topFormats ?? [],
  },
};

const outputPath = path.resolve(projectRoot, output);
fs.mkdirSync(path.dirname(outputPath), {recursive: true});
fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

console.log(`Generated ${path.relative(projectRoot, outputPath)}`);

function pickTemplate({topic: inputTopic, preset: inputPreset}) {
  if (inputPreset) {
    const direct = templates.find((candidate) => candidate.key === inputPreset.toLowerCase());
    if (direct) {
      return direct;
    }
  }

  const normalized = inputTopic.toLowerCase();
  return (
    templates.find((candidate) =>
      candidate.match.some((keyword) => normalized.includes(keyword.toLowerCase())),
    ) ?? templates[0]
  );
}

function buildInspiration({researchReport, markdown, hint, topic}) {
  const bestResearchItem = selectBestInspiration(researchReport?.items ?? [], {hint, topic});
  if (bestResearchItem) {
    return [
      {
        platform: capitalize(bestResearchItem.platform),
        title: bestResearchItem.title,
        url: bestResearchItem.url ?? undefined,
        insight:
          bestResearchItem.format === 'shock-hook + step proof'
            ? 'Use a shocked face hook, numbered proof steps, and a strong value reveal.'
            : `Use a ${bestResearchItem.format} structure and keep production low-cost.`,
      },
    ];
  }

  const blocks = markdown
    .split(/\n---+\n/g)
    .filter((block) => !isHighCostFormat(block));
  const candidates = blocks.filter((block) =>
    block.toLowerCase().includes(hint.toLowerCase()),
  );
  const picked = candidates[0] ?? blocks[0] ?? '';
  const url = picked.match(/https?:\/\/\S+/)?.[0];
  const titleLine =
    picked
      .split('\n')
      .find((line) => line.includes('**@') || line.includes('**公式：')) ?? 'Local trend reference';
  const insightLine =
    picked
      .split('\n')
      .find((line) => line.includes('**核心借鉴：')) ?? 'Use a proof-driven UGC structure.';

  return [
    {
      platform: url?.includes('instagram') ? 'Instagram' : 'TikTok',
      title: cleanMarkdown(titleLine),
      url,
      insight: cleanMarkdown(insightLine),
    },
  ];
}

function summarizeSourceCoverage(docs) {
  return docs.map((doc) => doc.length).reduce((total, size) => total + size, 0);
}

function capitalize(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
