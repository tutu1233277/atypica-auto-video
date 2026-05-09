import crypto from 'node:crypto';
import {getArg} from './remotion-helpers.mjs';
import {defaultOutputPath, loadXCredentials, pickVariantFromFile} from './x-launch-lib.mjs';

const draft = getArg('draft', defaultOutputPath);
const variantId = getArg('variant', '');
const textArg = getArg('text', '');
const publish = getArg('publish', 'false') === 'true';
const configPath = getArg('config', 'config/x-account.json');

const text = resolveText({draft, variantId, textArg});
if ([...text].length > 280) {
  throw new Error(`Post exceeds 280 chars: ${[...text].length}`);
}

if (!publish) {
  console.log('Dry run only. Pass --publish=true to send the post.');
  console.log('');
  console.log(text);
  process.exit(0);
}

const credentials = loadXCredentials(configPath);
assertCredentials(credentials);

const response = await createPost({text, credentials});
console.log('Post created successfully.');
console.log(JSON.stringify(response, null, 2));

function resolveText({draft, variantId, textArg}) {
  if (textArg) {
    return textArg.trim();
  }

  const {variant} = pickVariantFromFile({filePath: draft, variantId});
  if (!variant?.text) {
    throw new Error('No post text found. Generate drafts first or pass --text=...');
  }

  return variant.text.trim();
}

function assertCredentials(credentials) {
  for (const [key, value] of Object.entries(credentials)) {
    if (!value) {
      throw new Error(`Missing X credential: ${key}`);
    }
  }
}

async function createPost({text, credentials}) {
  const url = 'https://api.x.com/2/tweets';
  const body = JSON.stringify({text});
  const oauth = buildOAuthHeader({
    method: 'POST',
    url,
    consumerKey: credentials.appKey,
    consumerSecret: credentials.appSecret,
    token: credentials.accessToken,
    tokenSecret: credentials.accessSecret,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauth,
      'Content-Type': 'application/json',
    },
    body,
  });

  const json = await response.json().catch(async () => ({raw: await response.text()}));
  if (!response.ok) {
    throw new Error(`X API error ${response.status}: ${JSON.stringify(json)}`);
  }

  return json;
}

function buildOAuthHeader({method, url, consumerKey, consumerSecret, token, tokenSecret}) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  };

  const parameterString = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');
  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(parameterString),
  ].join('&');
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const header = Object.entries(headerParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ');

  return `OAuth ${header}`;
}

function percentEncode(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
