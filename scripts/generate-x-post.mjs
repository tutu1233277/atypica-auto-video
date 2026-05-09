import {getArg} from './remotion-helpers.mjs';
import {defaultOutputPath, writeLaunchVariants} from './x-launch-lib.mjs';

const out = getArg('out', defaultOutputPath);
const count = Number(getArg('count', '5'));
const url = getArg('url', '');
const examples = getArg('examples', 'data/research/x-launch-examples.json');

const {payload} = writeLaunchVariants({
  out,
  count,
  customUrl: url,
  examplesPath: examples,
});

console.log(`Generated ${out}`);
console.log(`Recommended variant: ${payload.recommendedId}`);
for (const variant of payload.variants) {
  console.log(`- ${variant.id} (${variant.charCount} chars)`);
}
