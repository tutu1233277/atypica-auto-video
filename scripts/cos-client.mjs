import fs from 'node:fs';
import COS from 'cos-nodejs-sdk-v5';
import {loadEnvFiles} from './research-lib.mjs';

const requiredKeys = ['COS_SECRET_ID', 'COS_SECRET_KEY', 'COS_BUCKET', 'COS_REGION'];

const getCosConfig = () => {
  loadEnvFiles();

  return {
    secretId: process.env.COS_SECRET_ID ?? '',
    secretKey: process.env.COS_SECRET_KEY ?? '',
    bucket: process.env.COS_BUCKET ?? '',
    region: process.env.COS_REGION ?? '',
  };
};

const assertConfigured = () => {
  const config = getCosConfig();
  const missing = requiredKeys.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing COS config: ${missing.join(', ')}`);
  }

  return config;
};

const createClient = () => {
  const {secretId, secretKey} = assertConfigured();
  return new COS({
    SecretId: secretId,
    SecretKey: secretKey,
  });
};

const normalizeUrl = (location) => {
  if (!location) {
    return null;
  }

  return location.startsWith('http://') || location.startsWith('https://')
    ? location
    : `https://${location}`;
};

export const uploadToCos = async (localPath, cosKey) => {
  const {bucket, region} = assertConfigured();
  const cos = createClient();
  const body = fs.createReadStream(localPath);

  const result = await cos.putObject({
    Bucket: bucket,
    Region: region,
    Key: String(cosKey).replace(/^\/+/, ''),
    Body: body,
  });

  return normalizeUrl(result.Location);
};

export const getPresignedUrl = async (cosKey, expiresInSeconds = 86400) => {
  const {bucket, region} = assertConfigured();
  const cos = createClient();

  const result = await cos.getObjectUrl({
    Bucket: bucket,
    Region: region,
    Key: String(cosKey).replace(/^\/+/, ''),
    Sign: true,
    Expires: expiresInSeconds,
  });

  return typeof result === 'string' ? result : result?.Url ?? null;
};
