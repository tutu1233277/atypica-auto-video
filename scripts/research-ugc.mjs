import {getArg} from './remotion-helpers.mjs';
import {
  DEFAULT_MIN_LIKES,
  annotateTrendItem,
  buildReport,
  fetchTrendReport,
  passesLikesThreshold,
  rankInspiration,
  renderResearchMarkdown,
  writeJson,
  writeText,
} from './research-lib.mjs';

const query = getArg('query', '');
const preset = getArg('preset', '');
const limit = Number(getArg('limit', '12'));
const minLikes = Number(getArg('min-likes', String(DEFAULT_MIN_LIKES)));
const platforms = getArg('platforms', 'tiktok,instagram')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const out = getArg('out', 'data/research/ai-ugc-trends.json');
const outMd = getArg('out-md', out.replace(/\.json$/, '.md'));

const sharedUgcQueries = [
  'how is this even legal ai',
  'i almost paid for this ai',
  'comment guide ai tool',
];

const presetQueries = {
  competitor: [
    ...sharedUgcQueries,
    'ai tool review',
    'this ai replaced agency work',
    'competitor research ai',
  ],
  market: [
    ...sharedUgcQueries,
    'i almost built the wrong product',
    'market research mistake ai',
    'customer pain point ai',
  ],
  interview: [
    'what hiring managers actually reject',
    'my boss rejected this answer',
    'i found out why candidates fail',
  ],
  dating: [
    'why he ghosted',
    'turns out thats why i got ghosted',
    'relationship advice red flags',
  ],
};

const queries = query
  ? [query]
  : preset && presetQueries[preset]
    ? presetQueries[preset]
    : ['competitor complaints'];

const reports = [];
for (const itemQuery of queries) {
  reports.push(await fetchTrendReport({query: itemQuery, limit, platforms, minLikes}));
}

const mergedItems = dedupeItems(
  reports
    .flatMap((report) => report.items)
    .map((item) => annotateTrendItem(item, {topic: query || preset || item.platform})),
)
  .filter((item) => passesLikesThreshold(item, minLikes))
  .filter((item) => !item.hardReject)
  .sort((a, b) => rankInspiration(b, {topic: query || preset}) - rankInspiration(a, {topic: query || preset}))
  .slice(0, limit);
const diagnostics = reports.flatMap((report) => report.diagnostics ?? []);
if (Number.isFinite(minLikes) && minLikes > 0) {
  diagnostics.push(`Applied minimum likes filter: ${minLikes}.`);
}
const report = buildReport({
  query: query || preset || queries.join(', '),
  platforms,
  provider: reports[0]?.provider ?? 'local_markdown',
  items: mergedItems,
  diagnostics,
});
writeJson(out, report);
writeText(outMd, renderResearchMarkdown(report));

console.log(`Generated ${out}`);
console.log(`Generated ${outMd}`);
console.log(`Provider: ${report.provider}`);
console.log(`Items: ${report.items.length}`);
if (report.diagnostics?.length) {
  console.log('Diagnostics:');
  for (const item of report.diagnostics) {
    console.log(`- ${item}`);
  }
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.url || `${item.platform}:${item.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
