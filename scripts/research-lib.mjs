import fs from 'node:fs';
import path from 'node:path';
import {projectRoot} from './remotion-helpers.mjs';

const vaultRoot = path.resolve(projectRoot, '..');
const highCostKeywords = [
  'street interview',
  'street',
  'man on the street',
  'vox pop',
  '路人',
  '街头',
  '采访',
  '追人',
];

export const DEFAULT_MIN_LIKES = 5000;
export const DEFAULT_RECENT_DAYS = 120;

export const loadEnvFiles = () => {
  for (const fileName of ['.env.local', '.env']) {
    const absolutePath = path.resolve(projectRoot, fileName);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
};

export const readVaultDoc = (fileName) => {
  const absolutePath = path.resolve(vaultRoot, fileName);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
};

export const readJsonIfExists = (relativePath) => {
  const absolutePath = path.resolve(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
};

export const ensureDirForFile = (relativePath) => {
  fs.mkdirSync(path.dirname(path.resolve(projectRoot, relativePath)), {recursive: true});
};

export const writeJson = (relativePath, data) => {
  ensureDirForFile(relativePath);
  fs.writeFileSync(
    path.resolve(projectRoot, relativePath),
    `${JSON.stringify(data, null, 2)}\n`,
    'utf8',
  );
};

export const writeText = (relativePath, content) => {
  ensureDirForFile(relativePath);
  fs.writeFileSync(path.resolve(projectRoot, relativePath), content, 'utf8');
};

export const slugify = (value) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const cleanMarkdown = (value) => {
  return value.replace(/\*\*/g, '').replace(/^[->\s]+/, '').trim();
};

export const isHighCostFormat = (value) => {
  const lowered = value.toLowerCase();
  return highCostKeywords.some((keyword) => lowered.includes(keyword));
};

export const scoreItem = (item) => {
  const likes = numberOrZero(item.likes);
  const views = numberOrZero(item.views);
  const comments = numberOrZero(item.comments);
  return likes * 3 + comments * 5 + views * 0.02;
};

export const passesLikesThreshold = (item, minLikes = DEFAULT_MIN_LIKES) => {
  if (!Number.isFinite(minLikes) || minLikes <= 0) {
    return true;
  }

  return numberOrZero(item.likes) >= minLikes;
};

const genericLowFitKeywords = [
  'top 10',
  'top ten',
  'best ai tools',
  'ai tools',
  'apps you need',
  'guide',
  'tutorial',
  'comment "list"',
  "comment 'list'",
  'free tools',
  'for success in 2025',
  'websites you should know',
];

const educationalExplainerKeywords = [
  'course',
  'lecture',
  'playlist',
  'tutorial',
  'follow me',
  'save this post',
  'job ready',
  'internship',
  'call:',
  'no degree required',
  'learn ai',
  'free ai course',
  'surface-level',
  'fundamentals',
  'masterclass',
  'webinar',
];

const ugcHookSignals = [
  'i almost',
  'i thought',
  'i found out',
  'turns out',
  'nobody tells you',
  'my boss',
  'don’t let',
  'do not let',
  'dont let',
  'waste your money',
  'how is this even legal',
  'what nobody tells you',
  'secretly',
  'i was wrong',
  'i tried',
  'i paid',
];

const productProofSignals = [
  'step 1',
  'step 2',
  'step 3',
  '1.',
  '2.',
  '3.',
  'report',
  'workflow',
  'screen',
  'dashboard',
  'question',
  'generate',
  'paste',
  'copy',
  '20 min',
  '20 minutes',
  'save',
  'saved me',
  'roi',
];

const promoHeavyKeywords = [
  'dm ',
  'comment "',
  "comment '",
  'comment “',
  'comment below',
  'follow for more',
  'follow me',
  'link in bio',
  'swipe right',
  'call:',
  'www.',
];

const explainerLeadSignals = [
  'this ai can',
  'here is how',
  "here's how",
  'here are',
  'how to make',
  'most people are using',
  'learn how to',
];

const tutorialHeavyKeywords = [
  'tutorial',
  'step by step tutorial',
  'top 5',
  'top five',
  'top tools',
  'tool list',
  'best tools',
  'best ai tools',
  'free course',
  'workshop',
  'webinar',
];

const reactionHookSignals = [
  'this is crazy',
  'wish i knew this earlier',
  'dont buy this yet',
  'don’t buy this yet',
  'turns out',
  'nobody tells you',
  'my boss',
  'i almost',
  'i didn’t expect this',
  'i didn\'t expect this',
  'i was wrong',
  'what if',
  'real question',
  'you need to see this',
  'wait',
  'hold on',
  'bro',
  'no way',
  'wtf',
  'why is nobody talking about this',
  'i cant believe',
  'i can’t believe',
  'i was today years old',
  'did not know this',
  'didn’t know this',
];

const aiToolSignals = [
  'ai',
  'chatgpt',
  'openai',
  'claude',
  'perplexity',
  'tool',
  'tools',
  'software',
  'app',
  'apps',
  'workflow',
  'automation',
  'dashboard',
  'research',
  'prompt',
  'generate',
  'content',
  'saas',
];

const humanHookSignals = [
  'i ',
  'my ',
  'me ',
  'we ',
  'my boss',
  'i almost',
  'i thought',
  'i found out',
  'i tried',
  'i paid',
  'i was wrong',
  'turns out',
  'nobody tells you',
  'what if',
  'wait',
  'hold on',
  'you need to see this',
];

const productUiSignals = [
  'app',
  'tool',
  'software',
  'dashboard',
  'screen',
  'interface',
  'project',
  'calendar',
  'report',
  'workflow',
  'prompt',
  'generate',
  'generated',
  'results',
  'comments',
  'data',
  'input',
  'output',
  'connect',
  'set up',
  'builds',
  'built',
];

const topicSignals = [
  {
    match: ['竞品', 'competitor'],
    positive: ['competitor', 'complaint', 'weakness', 'users hate', 'bad support', 'too expensive'],
  },
  {
    match: ['市场', 'market', 'idea', 'validate', '室内', 'design'],
    positive: ['market', 'validate', 'demand', 'people want', 'why users buy', 'why users do not buy'],
  },
  {
    match: ['访谈', 'interview', '面试', 'job', 'resume', 'hiring'],
    positive: ['interview', 'hiring', 'job', 'resume', 'candidate', 'salary', 'manager'],
  },
  {
    match: ['两性', 'dating', 'ghost', 'relationship', 'love'],
    positive: ['dating', 'relationship', 'ghosted', 'text back', 'boyfriend', 'girlfriend'],
  },
];

const broadAtypicaSignals = [
  'boss',
  'why users',
  'turns out',
  'do not let',
  'don’t let',
  'secretly',
  'comments',
  'social posts',
  'report',
  'research',
  'pain point',
  'complaint',
  'people say',
  'what people complain',
  'found out',
  'interview',
  'reddit',
  'tiktok',
  'instagram',
];

const nativeShortVideoSignals = [
  'how is this even legal',
  'turns out',
  'i found',
  'my boss',
  'nobody tells you',
  'secret',
  'comment',
  'part ',
];

export const parseMarkdownTrendBlocks = (markdown) => {
  return markdown
    .split(/\n---+\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !isHighCostFormat(block))
    .filter((block) => /https?:\/\/\S+/.test(block))
    .map((block, index) => {
      const url = block.match(/https?:\/\/\S+/)?.[0] ?? null;
      const titleLine =
        block
          .split('\n')
          .find((line) => line.includes('**@') || line.includes('**公式：')) ??
        `Local reference ${index + 1}`;
      const explicitHookLine = block
        .split('\n')
        .find((line) => /hook[:：]/i.test(line));
      const quotedHookMatch = block.match(/\*\*"([^"\n]{4,160})"\*\*/);
      const insightLine =
        block.split('\n').find((line) => line.includes('**核心借鉴：')) ??
        'Use a low-cost proof-driven UGC structure.';
      return {
        id: `local-${index + 1}`,
        platform: url?.includes('instagram') ? 'instagram' : 'tiktok',
        url,
        title: cleanMarkdown(titleLine),
        hook: cleanMarkdown(explicitHookLine ?? quotedHookMatch?.[1] ?? ''),
        summary: cleanMarkdown(insightLine),
        creator: '',
        likes: extractMetricFromText(titleLine, 'likes'),
        views: extractMetricFromText(titleLine, 'views'),
        comments: extractMetricFromText(titleLine, 'comments'),
        source: 'local_markdown',
        format: inferFormat(`${titleLine}\n${insightLine}`),
      };
    });
};

export const selectBestInspiration = (items, options = {}) => {
  const hint = typeof options === 'string' ? options : options.hint;
  const topic = typeof options === 'string' ? '' : options.topic ?? '';
  const minLikes =
    typeof options === 'string' ? DEFAULT_MIN_LIKES : Number(options.minLikes ?? DEFAULT_MIN_LIKES);
  const filtered = items.filter((item) => {
    if (isHighCostFormat(`${item.title} ${item.summary} ${item.hook}`)) {
      return false;
    }
    if (!passesLikesThreshold(item, minLikes)) {
      return false;
    }
    const fit = annotateTrendItem(item, {topic, hint});
    return !fit.hardReject;
  });
  const hinted = hint
    ? filtered.filter((item) =>
        `${item.title} ${item.summary} ${item.hook}`.toLowerCase().includes(hint.toLowerCase()),
      )
    : filtered;
  const pool = hinted.length > 0 ? hinted : filtered;
  return [...pool]
    .sort((a, b) => rankInspiration(b, {topic, hint}) - rankInspiration(a, {topic, hint}))[0] ?? null;
};

export const rankInspiration = (item, {topic = '', hint = ''} = {}) => {
  const fit = annotateTrendItem(item, {topic, hint});
  const freshness = item.postedAt ? Date.parse(item.postedAt) || 0 : 0;
  return fit.fitScore * 100000 + freshness * 0.000001 + scoreItem(item);
};

export const isRecentEnough = (item, recentDays = DEFAULT_RECENT_DAYS) => {
  if (!Number.isFinite(recentDays) || recentDays <= 0) {
    return true;
  }

  const postedAt = Date.parse(item.postedAt ?? '');
  if (!Number.isFinite(postedAt)) {
    return false;
  }

  return Date.now() - postedAt <= recentDays * 24 * 60 * 60 * 1000;
};

const scoreAtypicaFit = (item, {topic, hint}) => {
  const text = `${item.title} ${item.summary} ${item.hook}`.toLowerCase();
  let score = 0;

  for (const keyword of broadAtypicaSignals) {
    if (text.includes(keyword)) {
      score += 2;
    }
  }

  for (const keyword of nativeShortVideoSignals) {
    if (text.includes(keyword)) {
      score += 2;
    }
  }

  for (const keyword of genericLowFitKeywords) {
    if (text.includes(keyword)) {
      score -= 4;
    }
  }

  if (item.format === 'shock-hook + step proof') {
    score += 5;
  }
  if (item.format === 'screen-proof + insight reveal') {
    score += 6;
  }
  if (item.comments > 100) {
    score += 2;
  }

  if (hint && text.includes(hint.toLowerCase())) {
    score += 3;
  }

  const matchedTopicSignal = topicSignals.find((signal) =>
    signal.match.some((keyword) => topic.toLowerCase().includes(keyword)),
  );
  if (matchedTopicSignal) {
    for (const keyword of matchedTopicSignal.positive) {
      if (text.includes(keyword)) {
        score += 4;
      }
    }
  }

  return score;
};

export const annotateTrendItem = (item, {topic = '', hint = ''} = {}) => {
  const text = `${item.title} ${item.summary} ${item.hook}`.toLowerCase();
  let fitScore = scoreAtypicaFit(item, {topic, hint});
  const fitReasons = [];
  const flags = [];

  const instagramReel =
    item.platform === 'instagram' &&
    (item.url?.includes('/reel/') ||
      item.productType === 'clips' ||
      item.mediaType === 'Video' ||
      item.isVideo === true);
  const instagramFeedPost =
    item.platform === 'instagram' &&
    !instagramReel &&
    (item.url?.includes('/p/') || item.mediaType === 'Image' || item.mediaType === 'Sidecar');
  if (instagramReel) {
    fitScore += 5;
    fitReasons.push('Instagram Reel format');
  }
  if (instagramFeedPost) {
    fitScore -= 8;
    flags.push('Instagram feed post, not Reel');
  }

  const hookMatches = ugcHookSignals.filter((keyword) => text.includes(keyword));
  if (hookMatches.length > 0) {
    fitScore += Math.min(8, hookMatches.length * 2);
    fitReasons.push(`UGC hook signals: ${hookMatches.slice(0, 2).join(', ')}`);
  } else {
    fitScore -= 5;
    flags.push('Missing emotional/confessional hook');
  }

  const proofMatches = productProofSignals.filter((keyword) => text.includes(keyword));
  if (proofMatches.length > 0) {
    fitScore += Math.min(6, proofMatches.length * 2);
    fitReasons.push('Shows proof, steps, or workflow');
  }

  const aiToolMatches = aiToolSignals.filter((keyword) => text.includes(keyword));
  if (aiToolMatches.length > 0) {
    fitScore += Math.min(8, aiToolMatches.length);
    fitReasons.push(`AI/product signals: ${aiToolMatches.slice(0, 3).join(', ')}`);
  } else {
    fitScore -= 8;
    flags.push('Missing AI/product keywords');
  }

  if (/\bi\b|\bmy\b|\bme\b/.test(text)) {
    fitScore += 2;
    fitReasons.push('First-person creator framing');
  }

  if ((item.hook ?? '').length > 0 && item.hook.length <= 120) {
    fitScore += 2;
    fitReasons.push('Short hook line');
  }

  const reactionMatches = reactionHookSignals.filter((keyword) => text.includes(keyword));
  if (reactionMatches.length > 0) {
    fitScore += Math.min(10, reactionMatches.length * 3);
    fitReasons.push(`Reaction/confessional hooks: ${reactionMatches.slice(0, 2).join(', ')}`);
  }

  const humanHookMatches = humanHookSignals.filter((keyword) => text.includes(keyword));
  if (humanHookMatches.length > 0) {
    fitScore += Math.min(8, humanHookMatches.length * 2);
    fitReasons.push(`Human hook framing: ${humanHookMatches.slice(0, 2).join(', ')}`);
  } else {
    fitScore -= 8;
    flags.push('Missing human/person-led hook');
  }

  const productUiMatches = productUiSignals.filter((keyword) => text.includes(keyword));
  if (productUiMatches.length > 0) {
    fitScore += Math.min(10, productUiMatches.length * 2);
    fitReasons.push(`Product UI/proof signals: ${productUiMatches.slice(0, 3).join(', ')}`);
  } else {
    fitScore -= 10;
    flags.push('Missing product UI/proof signals');
  }

  const explainerMatches = educationalExplainerKeywords.filter((keyword) => text.includes(keyword));
  if (explainerMatches.length > 0) {
    fitScore -= Math.min(12, explainerMatches.length * 3);
    flags.push(`Educational/explainer cues: ${explainerMatches.slice(0, 2).join(', ')}`);
  }

  const tutorialMatches = tutorialHeavyKeywords.filter((keyword) => text.includes(keyword));
  if (tutorialMatches.length > 0) {
    fitScore -= Math.min(14, tutorialMatches.length * 4);
    flags.push(`Tutorial/listicle cues: ${tutorialMatches.slice(0, 2).join(', ')}`);
  }

  if (explainerLeadSignals.some((keyword) => text.startsWith(keyword))) {
    fitScore -= 4;
    flags.push('Starts like an explainer instead of a UGC hook');
  }

  const promoMatches = promoHeavyKeywords.filter((keyword) => text.includes(keyword));
  if (promoMatches.length > 0 && proofMatches.length === 0) {
    fitScore -= Math.min(8, promoMatches.length * 2);
    flags.push('Heavy CTA without enough proof');
  }

  if ((item.summary ?? '').length > 900) {
    fitScore -= 4;
    flags.push('Caption is very long, likely explainer-heavy');
  }

  if (!isRecentEnough(item, DEFAULT_RECENT_DAYS)) {
    fitScore -= 10;
    flags.push(`Older than ${DEFAULT_RECENT_DAYS} days`);
  }

  if (item.source !== 'local_markdown' && (item.views ?? 0) === 0 && (item.likes ?? 0) < 30) {
    fitScore -= 3;
    flags.push('Weak visible traction');
  }

  const hardReject =
    instagramFeedPost ||
    !isRecentEnough(item, DEFAULT_RECENT_DAYS) ||
    aiToolMatches.length === 0 ||
    humanHookMatches.length === 0 ||
    productUiMatches.length === 0 ||
    tutorialMatches.length >= 1 ||
    (explainerMatches.length >= 2 && proofMatches.length === 0) ||
    fitScore < -2;

  return {
    ...item,
    fitScore,
    fitVerdict: hardReject ? 'reject' : fitScore >= 16 ? 'strong' : fitScore >= 8 ? 'usable' : 'weak',
    fitReasons,
    flags,
    hardReject,
  };
};

export const normalizeTrendItem = (raw, platform, source) => {
  const caption =
    pickString(raw, [
      'caption',
      'text',
      'title',
      'description',
      'videoMeta.text',
      'node.edge_media_to_caption.edges.0.node.text',
    ]) ?? '';
  const title =
    pickString(raw, ['title', 'caption', 'text', 'description']) ??
    caption.slice(0, 140) ??
    `${platform} trend`;
  return {
    id:
      pickString(raw, ['id', 'awemeId', 'shortCode', 'code', 'postId']) ??
      `${platform}-${Math.random().toString(36).slice(2, 10)}`,
    platform,
    url:
      pickString(raw, ['url', 'webVideoUrl', 'videoUrl', 'postUrl', 'inputUrl', 'permalink']) ??
      null,
    title: title.trim(),
    hook: caption.split('\n')[0]?.trim() ?? '',
    summary: caption.trim(),
    creator:
      pickString(raw, [
        'authorMeta.name',
        'authorMeta.nickName',
        'author.username',
        'ownerUsername',
        'username',
      ]) ?? '',
    likes: numberOrZero(
      pickNumber(raw, [
        'likesCount',
        'like_count',
        'diggCount',
        'likes',
        'edge_media_preview_like.count',
      ]),
    ),
    views: numberOrZero(
      pickNumber(raw, [
        'playCount',
        'videoPlayCount',
        'igPlayCount',
        'play_count',
        'view_count',
        'videoViewCount',
        'viewCount',
        'video_view_count',
      ]),
    ),
    comments: numberOrZero(
      pickNumber(raw, [
        'commentsCount',
        'comment_count',
        'commentCount',
        'comments',
        'edge_media_to_comment.count',
      ]),
    ),
    postedAt:
      pickString(raw, ['createTimeISO', 'timestamp', 'taken_at', 'taken_at_timestamp', 'createTime']) ??
      null,
    source,
    format: inferFormat(`${title}\n${caption}`),
    mediaType: pickString(raw, ['type']) ?? null,
    productType: pickString(raw, ['productType', 'product_type']) ?? null,
    isVideo: getByPath(raw, 'is_video') ?? null,
  };
};

export const inferFormat = (text) => {
  const lowered = text.toLowerCase();
  if (lowered.includes('how is this even legal') || lowered.includes('步骤') || lowered.includes('step')) {
    return 'shock-hook + step proof';
  }
  if (lowered.includes('secret') || lowered.includes('boss') || lowered.includes('hack')) {
    return 'secret-weapon confession';
  }
  if (lowered.includes('screen') || lowered.includes('report') || lowered.includes('social')) {
    return 'screen-proof + insight reveal';
  }
  return 'low-cost ai ugc';
};

export const summarizeResearch = (items) => {
  const formats = countBy(items.map((item) => item.format));
  const platforms = countBy(items.map((item) => item.platform));
  const hooks = items
    .map((item) => item.hook)
    .filter(Boolean)
    .slice(0, 3);
  return {
    itemCount: items.length,
    topFormats: Object.entries(formats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({name, count})),
    platforms: Object.entries(platforms).map(([name, count]) => ({name, count})),
    sampleHooks: hooks,
  };
};

export const buildReport = ({query, platforms, provider, items, diagnostics = []}) => {
  return {
    query,
    platforms,
    provider,
    generatedAt: new Date().toISOString(),
    summary: summarizeResearch(items),
    items,
    diagnostics,
  };
};

export const renderResearchMarkdown = (report) => {
  const lines = [
    `# ${report.query} Research`,
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Platforms: ${report.platforms.join(', ')}`,
    `- Provider: ${report.provider}`,
    `- Items: ${report.items.length}`,
    '',
    '## Summary',
    '',
    ...report.summary.topFormats.map((item) => `- ${item.name}: ${item.count}`),
    '',
    '## Top Items',
    '',
  ];

  for (const item of report.items.slice(0, 8)) {
    lines.push(`### ${item.title}`);
    lines.push(`- Platform: ${item.platform}`);
    lines.push(`- Format: ${item.format}`);
    if (item.fitVerdict) {
      lines.push(`- Fit: ${item.fitVerdict} (${item.fitScore})`);
    }
    if (item.url) {
      lines.push(`- URL: ${item.url}`);
    }
    if (item.creator) {
      lines.push(`- Creator: ${item.creator}`);
    }
    lines.push(`- Metrics: likes ${item.likes}, comments ${item.comments}, views ${item.views}`);
    lines.push(`- Hook: ${item.hook || 'n/a'}`);
    if (item.fitReasons?.length) {
      lines.push(`- Why it fits: ${item.fitReasons.join('; ')}`);
    }
    if (item.flags?.length) {
      lines.push(`- Risks: ${item.flags.join('; ')}`);
    }
    lines.push(`- Summary: ${item.summary || 'n/a'}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
};

export const loadProviderConfig = () => {
  return readJsonIfExists('config/research-providers.json');
};

export const fetchTrendReport = async ({
  query,
  limit,
  platforms,
  minLikes = DEFAULT_MIN_LIKES,
}) => {
  loadEnvFiles();
  const providerConfig = loadProviderConfig();
  const diagnostics = [];

  if (providerConfig?.apify) {
    try {
      const apifyItems = await fetchFromApify({query, limit, platforms, providerConfig, diagnostics});
      if (apifyItems.length > 0) {
        const sorted = apifyItems
          .map((item) => annotateTrendItem(item, {topic: query}))
          .filter((item) => !isHighCostFormat(`${item.title} ${item.summary} ${item.hook}`))
          .filter((item) => passesLikesThreshold(item, minLikes))
          .filter((item) => !item.hardReject)
          .sort((a, b) => rankInspiration(b, {topic: query}) - rankInspiration(a, {topic: query}));
        return buildReport({
          query,
          platforms,
          provider: 'apify',
          items: sorted,
          diagnostics,
        });
      }

      diagnostics.push('Apify returned 0 usable items, falling back to local markdown references.');
    } catch (error) {
      diagnostics.push(
        `Apify fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    diagnostics.push('Missing config/research-providers.json, using local markdown references.');
  }

  const localMarkdown = readVaultDoc('tiktok ig视频链接.md');
  const localItems = parseMarkdownTrendBlocks(localMarkdown)
    .map((item) => annotateTrendItem(item, {topic: query}))
    .filter((item) => passesLikesThreshold(item, minLikes))
    .sort((a, b) => rankInspiration(b, {topic: query}) - rankInspiration(a, {topic: query}))
    .slice(0, limit);
  return buildReport({
    query,
    platforms,
    provider: 'local_markdown',
    items: localItems,
    diagnostics,
  });
};

const fetchFromApify = async ({query, limit, platforms, providerConfig, diagnostics}) => {
  const tokenEnv = providerConfig.apify.tokenEnv ?? 'APIFY_TOKEN';
  const token = process.env[tokenEnv];
  if (!token) {
    diagnostics.push(`Missing ${tokenEnv} in environment, cannot call Apify.`);
    return [];
  }

  const outputs = [];
  for (const platform of platforms) {
    const settings = providerConfig.apify.platforms?.[platform];
    if (!settings?.taskId && !settings?.actorId) {
      diagnostics.push(`Apify ${platform} is not configured with taskId or actorId.`);
      continue;
    }

    const body = fillTemplate(settings.baseInput ?? {}, {
      query,
      queryTag: toTagToken(query),
      querySlug: slugify(query).replace(/-/g, ''),
      limit,
      platform,
    });
    sanitizeApifyInput(body, {platform, query});
    const endpoint = buildApifyEndpoint({settings, token});
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Apify ${platform} request failed: ${response.status} ${response.statusText}${
          responseText ? ` - ${responseText.slice(0, 240)}` : ''
        }`,
      );
    }

    const items = await response.json();
    if (!Array.isArray(items)) {
      throw new Error(`Apify ${platform} returned non-array dataset items.`);
    }

    diagnostics.push(`Apify ${platform} returned ${items.length} items.`);
    for (const item of items) {
      outputs.push(normalizeTrendItem(item, platform, 'apify'));
    }
  }

  return outputs;
};

const sanitizeApifyInput = (body, {platform, query}) => {
  if (!body || typeof body !== 'object') {
    return;
  }

  if (platform === 'instagram') {
    body.hashtags = buildInstagramHashtags(query, body.hashtags);
  }
};

const buildInstagramHashtags = (query, seedTags = []) => {
  const normalized = String(query ?? '').toLowerCase();
  const tags = new Set(seedTags);

  if (normalized.includes('boss')) {
    tags.add('aitools');
    tags.add('chatgpttips');
    tags.add('automation');
  }
  if (normalized.includes('crazy') || normalized.includes('turns out')) {
    tags.add('aitools');
    tags.add('aiworkflow');
    tags.add('automation');
  }
  if (normalized.includes('wish i knew') || normalized.includes('nobody tells')) {
    tags.add('aitools');
    tags.add('chatgpttips');
    tags.add('productivitytools');
  }
  if (normalized.includes('buy this') || normalized.includes('dont buy')) {
    tags.add('saas');
    tags.add('software');
    tags.add('aitools');
  }

  tags.add('aitools');
  tags.add('chatgpt');
  tags.add('openai');

  return [...tags].slice(0, 8);
};

const buildApifyEndpoint = ({settings, token}) => {
  const extraParams = new URLSearchParams({token});
  if (settings.memoryMb) {
    extraParams.set('memory', String(settings.memoryMb));
  }
  if (settings.timeoutSecs) {
    extraParams.set('timeout', String(settings.timeoutSecs));
  }

  if (settings.taskId) {
    return `https://api.apify.com/v2/actor-tasks/${encodeURIComponent(
      settings.taskId,
    )}/run-sync-get-dataset-items?${extraParams.toString()}`;
  }

  return `https://api.apify.com/v2/acts/${encodeURIComponent(
    settings.actorId,
  )}/run-sync-get-dataset-items?${extraParams.toString()}`;
};

const fillTemplate = (value, vars) => {
  if (Array.isArray(value)) {
    return value.map((item) => fillTemplate(item, vars));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, fillTemplate(nested, vars)]),
    );
  }

  if (typeof value !== 'string') {
    return value;
  }

  const directVarMatch = value.match(/^\{\{(\w+)\}\}$/);
  if (directVarMatch) {
    return vars[directVarMatch[1]] ?? '';
  }

  return value.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
};

const toTagToken = (value) => {
  const normalized = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return normalized || 'aitools';
};

const pickString = (source, paths) => {
  for (const itemPath of paths) {
    const value = getByPath(source, itemPath);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const pickNumber = (source, paths) => {
  for (const itemPath of paths) {
    const value = getByPath(source, itemPath);
    if (typeof value === 'number' || typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const getByPath = (source, itemPath) => {
  return itemPath.split('.').reduce((current, part) => {
    if (current == null) {
      return undefined;
    }

    if (/^\d+$/.test(part)) {
      return current[Number(part)];
    }

    return current[part];
  }, source);
};

const numberOrZero = (value) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

const extractMetricFromText = (value, label) => {
  const match = String(value ?? '').match(
    new RegExp(`([\\d.,]+\\s*[kKmM]?)\\s+${label}\\b`, 'i'),
  );
  if (!match) {
    return 0;
  }

  return parseCompactNumber(match[1]);
};

const parseCompactNumber = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/,/g, '');
  if (!normalized) {
    return 0;
  }

  const multiplier = normalized.endsWith('m') ? 1000000 : normalized.endsWith('k') ? 1000 : 1;
  const numericPart = multiplier === 1 ? normalized : normalized.slice(0, -1);
  const parsed = Number(numericPart);
  return Number.isFinite(parsed) ? parsed * multiplier : 0;
};

const countBy = (values) => {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
};
