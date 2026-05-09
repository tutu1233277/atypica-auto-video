import {getArg} from './remotion-helpers.mjs';
import {
  buildReport,
  fetchTrendReport,
  renderResearchMarkdown,
  scoreItem,
  writeJson,
  writeText,
} from './research-lib.mjs';

const query = getArg('query', '');
const preset = getArg('preset', '');
const limit = Number(getArg('limit', '12'));
const platforms = getArg('platforms', 'tiktok,instagram')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const out = getArg('out', 'data/research/ai-ugc-trends.json');
const outMd = getArg('out-md', out.replace(/\.json$/, '.md'));

const presetQueries = {
  competitor: [
    'competitor complaints',
    'why users hate this product',
    'bad support overpriced software',
  ],
  market: [
    'why users are not buying',
    'market research mistake',
    'customer pain point business idea',
  ],
  interview: [
    'interview red flags',
    'hiring manager mistake',
    'resume rejected why',
  ],
  dating: [
    'why he ghosted',
    'dating red flags',
    'relationship advice text back',
  ],
};

const queries = query
  ? [query]
  : preset && presetQueries[preset]
    ? presetQueries[preset]
    : ['competitor complaints'];

const reports = [];
for (const itemQuery of queries) {
  reports.push(await fetchTrendReport({query: itemQuery, limit, platforms}));
}

const mergedItems = reports
  .flatMap((report) => report.items)
  .sort((a, b) => scoreItem(b) - scoreItem(a))
  .slice(0, limit);
const diagnostics = reports.flatMap((report) => report.diagnostics ?? []);
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
