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
    .map((block, index) => {
      const url = block.match(/https?:\/\/\S+/)?.[0] ?? null;
      const titleLine =
        block
          .split('\n')
          .find((line) => line.includes('**@') || line.includes('**公式：')) ??
        `Local reference ${index + 1}`;
      const insightLine =
        block.split('\n').find((line) => line.includes('**核心借鉴：')) ??
        'Use a low-cost proof-driven UGC structure.';
      return {
        id: `local-${index + 1}`,
        platform: url?.includes('instagram') ? 'instagram' : 'tiktok',
        url,
        title: cleanMarkdown(titleLine),
        hook: '',
        summary: cleanMarkdown(insightLine),
        creator: '',
        likes: 0,
        views: 0,
        comments: 0,
        source: 'local_markdown',
        format: inferFormat(`${titleLine}\n${insightLine}`),
      };
    });
};

export const selectBestInspiration = (items, options = {}) => {
  const hint = typeof options === 'string' ? options : options.hint;
  const topic = typeof options === 'string' ? '' : options.topic ?? '';
  const filtered = items.filter((item) => !isHighCostFormat(`${item.title} ${item.summary} ${item.hook}`));
  const hinted = hint
    ? filtered.filter((item) =>
        `${item.title} ${item.summary} ${item.hook}`.toLowerCase().includes(hint.toLowerCase()),
      )
    : filtered;
  const pool = hinted.length > 0 ? hinted : filtered;
  return [...pool]
    .sort((a, b) => rankInspiration(b, {topic, hint}) - rankInspiration(a, {topic, hint}))[0] ?? null;
};

const rankInspiration = (item, {topic, hint}) => {
  const fit = scoreAtypicaFit(item, {topic, hint});
  return fit * 100000 + scoreItem(item);
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
      pickNumber(raw, ['likesCount', 'diggCount', 'likes', 'edge_media_preview_like.count']),
    ),
    views: numberOrZero(
      pickNumber(raw, ['playCount', 'videoPlayCount', 'viewCount', 'video_view_count']),
    ),
    comments: numberOrZero(
      pickNumber(raw, ['commentsCount', 'commentCount', 'comments', 'edge_media_to_comment.count']),
    ),
    source,
    format: inferFormat(`${title}\n${caption}`),
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
    if (item.url) {
      lines.push(`- URL: ${item.url}`);
    }
    if (item.creator) {
      lines.push(`- Creator: ${item.creator}`);
    }
    lines.push(`- Metrics: likes ${item.likes}, comments ${item.comments}, views ${item.views}`);
    lines.push(`- Hook: ${item.hook || 'n/a'}`);
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
}) => {
  loadEnvFiles();
  const providerConfig = loadProviderConfig();
  const diagnostics = [];

  if (providerConfig?.apify) {
    try {
      const apifyItems = await fetchFromApify({query, limit, platforms, providerConfig, diagnostics});
      if (apifyItems.length > 0) {
        const sorted = apifyItems
          .filter((item) => !isHighCostFormat(`${item.title} ${item.summary} ${item.hook}`))
          .sort((a, b) => scoreItem(b) - scoreItem(a));
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
  const localItems = parseMarkdownTrendBlocks(localMarkdown).slice(0, limit);
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
      limit,
      platform,
    });
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

const buildApifyEndpoint = ({settings, token}) => {
  if (settings.taskId) {
    return `https://api.apify.com/v2/actor-tasks/${encodeURIComponent(
      settings.taskId,
    )}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  }

  return `https://api.apify.com/v2/acts/${encodeURIComponent(
    settings.actorId,
  )}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
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

const countBy = (values) => {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
};
