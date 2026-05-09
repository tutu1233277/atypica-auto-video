import {getArg} from './remotion-helpers.mjs';
import {defaultOutputPath, writeLaunchVariants} from './x-launch-lib.mjs';

const out = getArg('out', defaultOutputPath);
const count = Number(getArg('count', '5'));
const url = getArg('url', '');

const {payload} = writeLaunchVariants({out, count, customUrl: url});
const recommended = payload.variants.find((item) => item.id === payload.recommendedId);

console.log(`Generated ${out}`);
console.log('');
console.log(`Recommended: ${payload.recommendedId}`);
console.log(recommended?.text ?? 'No recommended draft.');
console.log('');
console.log('Next step:');
console.log(`node scripts/post-to-x.mjs --draft=${out} --variant=${payload.recommendedId}`);
console.log(
  `node scripts/post-to-x.mjs --draft=${out} --variant=${payload.recommendedId} --publish=true`,
);
