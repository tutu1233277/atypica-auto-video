import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnvFiles, slugify} from './research-lib.mjs';
import {findFeaturePreset, generateScriptCandidates, loadGeneratorPresets} from './openai-script-generator.mjs';
import {initDb, saveCandidates, getCandidates, selectCandidate, createJob, updateJob, getJob, getRecentJobs} from './db.mjs';
import {uploadToCos, getPresignedUrl} from './cos-client.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT ?? 4180);

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
]);

// 初始化数据库
await initDb();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
  console.log(`${request.method} ${url.pathname}`);

  // CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/presets') {
    sendJson(response, 200, loadGeneratorPresets());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/candidates') {
    await handleGetCandidates(request, response);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/jobs') {
    await handleGetJobs(request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/generate-candidates') {
    await handleGenerateCandidates(request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/select-candidate') {
    await handleSelectCandidate(request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/generate-json') {
    await handleGenerateJson(request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/render') {
    await handleRender(request, response);
    return;
  }

  serveStatic(url.pathname, response);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Atypica Video Generator: http://127.0.0.1:${port}`);
  console.log(`Database: PostgreSQL at ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 5432}`);
});

async function handleGetCandidates(request, response) {
  try {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`);
    const feature = url.searchParams.get('feature') || 'research';
    const candidates = await getCandidates(feature);
    sendJson(response, 200, {ok: true, candidates});
  } catch (error) {
    sendJson(response, 500, {ok: false, error: error.message});
  }
}

async function handleGetJobs(request, response) {
  try {
    const jobs = await getRecentJobs(20);
    sendJson(response, 200, {ok: true, jobs});
  } catch (error) {
    sendJson(response, 500, {ok: false, error: error.message});
  }
}

async function handleSelectCandidate(request, response) {
  try {
    const payload = await readRequestBody(request);
    const candidate = await selectCandidate(payload.candidateId);
    sendJson(response, 200, {ok: true, candidate});
  } catch (error) {
    sendJson(response, 400, {ok: false, error: error.message});
  }
}

async function handleGenerateCandidates(request, response) {
  try {
    const payload = await readRequestBody(request);
    const result = await generateScriptCandidates({
      featureKey: coerceFeature(payload.feature),
      topic: typeof payload.topic === 'string' ? payload.topic : '',
    });

    // 保存到数据库
    await saveCandidates(result.candidates, {
      feature: result.feature,
      topic: result.topic,
      model: result.model,
      baseURL: result.baseURL,
    });

    sendJson(response, 200, {
      ok: true,
      message: 'Script candidates generated',
      ...result,
    });
  } catch (error) {
    console.error('Generate candidates error:', error);
    sendJson(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleGenerateJson(request, response) {
  try {
    const payload = await readRequestBody(request);
    const result = createVideoConfig(payload);
    writeJsonFile(result.configPath, result.config);

    // 创建任务记录
    const jobId = `job-${Date.now()}`;
    await createJob(jobId, {
      candidateId: payload.candidate?.candidateId,
      feature: result.feature,
      topic: result.topic,
      configPath: result.configPath,
      outputPath: result.outputPath,
      command: result.command,
    });

    sendJson(response, 200, {
      ok: true,
      message: 'JSON generated',
      jobId,
      ...result,
    });
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleRender(request, response) {
  let jobId = null;
  try {
    const payload = await readRequestBody(request);
    const result = createVideoConfig(payload);
    writeJsonFile(result.configPath, result.config);

    // 创建任务记录
    jobId = `job-${Date.now()}`;
    await createJob(jobId, {
      candidateId: payload.candidate?.candidateId,
      feature: result.feature,
      topic: result.topic,
      configPath: result.configPath,
      outputPath: result.outputPath,
      command: result.command,
    });

    // 更新状态为渲染中
    await updateJob(jobId, {status: 'rendering'});

    const render = await runRender(result.configPath, result.outputPath);

    // 上传视频到 COS
    let cosUrl = null;
    let presignedUrl = null;
    if (render.exitCode === 0) {
      try {
        const cosKey = `videos/${path.basename(result.outputPath)}`;
        cosUrl = await uploadToCos(result.outputPath, cosKey);
        presignedUrl = await getPresignedUrl(cosKey, 3600 * 24); // 24小时有效
        console.log(`[COS] Uploaded: ${cosUrl}`);
      } catch (cosError) {
        console.error(`[COS] Upload failed: ${cosError.message}`);
      }
    }

    // 更新渲染结果
    await updateJob(jobId, {
      status: render.exitCode === 0 ? 'completed' : 'failed',
      exit_code: render.exitCode,
      render_stdout: render.stdout,
      render_stderr: render.stderr,
    });

    sendJson(response, render.exitCode === 0 ? 200 : 500, {
      ok: render.exitCode === 0,
      message: render.exitCode === 0 ? 'Render completed' : 'Render failed',
      jobId,
      cosUrl,
      presignedUrl,
      ...result,
      render,
    });
  } catch (error) {
    if (jobId) {
      await updateJob(jobId, {
        status: 'failed',
        error_message: error.message,
      });
    }
    sendJson(response, 400, {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export function createVideoConfig(payload) {
  const feature = coerceFeature(payload.feature);
  const candidate = payload.candidate;
  const topic = typeof payload.topic === 'string' && payload.topic.trim() ? payload.topic.trim() : '';
  const duration = clampNumber(
    payload.duration,
    loadGeneratorPresets().defaults.durationSeconds,
    10,
    15,
  );

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Missing candidate');
  }

  const {presets, feature: featurePreset} = findFeaturePreset(feature);
  const totalFrames = duration * presets.defaults.fps;
  const sceneDurations = allocateSceneDurations(totalFrames, featurePreset.scenePlan.length);
  const resolvedTopic = topic || featurePreset.defaultTopic;
  const candidateId = slugify(candidate.candidateId || candidate.title || 'candidate');
  const configId = slugify(`${feature}-${candidateId}-${resolvedTopic}`);
  const configPath = `data/videos/generated/${configId}.json`;
  const outputPath = `out/${configId}.mp4`;

  const scenes = featurePreset.scenePlan.map((scenePlan, index) => {
    const scene = candidate.scenes[index];
    if (!scene) {
      throw new Error('Candidate scene count does not match feature scene plan');
    }

    return {
      id: scenePlan.id,
      assetPath: scenePlan.assetPath,
      durationInFrames: sceneDurations[index],
      subtitle: {
        zh: scene.zh,
        en: scene.en,
      },
      note: scene.note,
    };
  });

  const config = {
    id: configId,
    title: `${featurePreset.label} / ${candidate.title}`,
    topic: resolvedTopic,
    fps: presets.defaults.fps,
    width: presets.defaults.width,
    height: presets.defaults.height,
    style: presets.defaults.style,
    inspiration: [
      {
        platform: 'Claude',
        title: candidate.title,
        insight: candidate.angle,
      },
    ],
    scenes,
    cta: {
      zh: '',
      en: '',
    },
    notes: {
      generatedBy: 'video-tool-claude',
      generatedAt: new Date().toISOString(),
      featureKey: feature,
      candidateId,
      hookStyle: candidate.hookStyle,
      score: candidate.score,
      audit: candidate.audit,
      model: process.env.AI_SDK_MODEL || process.env.LITELLM_MODEL || 'claude-sonnet-4-6',
    },
  };

  return {
    feature,
    topic: resolvedTopic,
    candidateId,
    candidateTitle: candidate.title,
    configPath,
    outputPath,
    command: `npm run render -- --config=${configPath} --out=${outputPath}`,
    config,
  };
}

function allocateSceneDurations(totalFrames, sceneCount) {
  if (sceneCount < 1) {
    throw new Error('At least one scene is required');
  }

  const base = Math.floor(totalFrames / sceneCount);
  const remainder = totalFrames % sceneCount;
  return Array.from({length: sceneCount}, (_, index) => base + (index < remainder ? 1 : 0));
}

function writeJsonFile(relativePath, data) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), {recursive: true});
  fs.writeFileSync(absolutePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function runRender(configPath, outputPath) {
  return new Promise((resolve) => {
    const child = spawn(
      'node',
      ['scripts/render-video.mjs', `--config=${configPath}`, `--out=${outputPath}`],
      {
        cwd: root,
      },
    );
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function serveStatic(pathname, response) {
  const decodedPath = decodeURIComponent(pathname);
  const relativePath = decodedPath === '/' ? 'tool/index.html' : decodedPath.slice(1);
  const target = path.resolve(root, relativePath);

  if (!target.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.stat(target, (statError, stats) => {
    if (statError) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    const filePath = stats.isDirectory() ? path.join(target, 'index.html') : target;
    const ext = path.extname(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(ext) ?? 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    fs.createReadStream(filePath).pipe(response);
  });
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function coerceFeature(value) {
  const normalized = typeof value === 'string' ? value : 'research';
  if (normalized !== 'research' && normalized !== 'interviews') {
    throw new Error(`Unknown feature: ${normalized}`);
  }

  return normalized;
}

loadEnvFiles();
