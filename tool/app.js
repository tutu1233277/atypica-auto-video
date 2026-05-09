const state = {
  presets: null,
  feature: "research",
  candidates: [],
  selectedCandidateIndex: -1,
  activeSceneIndex: 0,
  generated: null,
  busy: false,
};

const timeline = document.querySelector("#timeline");
const scriptTitle = document.querySelector("#scriptTitle");
const featureBadge = document.querySelector("#featureBadge");
const previewVideo = document.querySelector("#previewVideo");
const captionPreview = document.querySelector("#captionPreview");
const auditList = document.querySelector("#auditList");
const scoreBadge = document.querySelector("#scoreBadge");
const renderCommand = document.querySelector("#renderCommand");
const jsonPath = document.querySelector("#jsonPath");
const videoPath = document.querySelector("#videoPath");
const activityLog = document.querySelector("#activityLog");
const jobBadge = document.querySelector("#jobBadge");
const copyButton = document.querySelector("#copyCommand");
const generateScriptsButton = document.querySelector("#generateScriptsButton");
const generateJsonButton = document.querySelector("#generateJsonButton");
const renderButton = document.querySelector("#renderButton");
const candidateList = document.querySelector("#candidateList");
const candidateSummary = document.querySelector("#candidateSummary");

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.presets || state.feature === button.dataset.feature) {
      return;
    }

    state.feature = button.dataset.feature;
    state.activeSceneIndex = 0;
    state.candidates = [];
    state.selectedCandidateIndex = -1;
    state.generated = null;
    syncFeatureToggle();
    render();
  });
});

generateScriptsButton.addEventListener("click", async () => {
  await generateCandidates();
});

generateJsonButton.addEventListener("click", async () => {
  await runJob("正在生成 JSON...", "/api/generate-json");
});

renderButton.addEventListener("click", async () => {
  await runJob("正在渲染视频...", "/api/render");
});

copyButton.addEventListener("click", async () => {
  renderCommand.select();
  await navigator.clipboard.writeText(renderCommand.value);
  copyButton.textContent = "已复制";
  window.setTimeout(() => {
    copyButton.textContent = "复制命令";
  }, 1100);
});

async function init() {
  setBusy(true, "加载中");
  appendLog("正在加载脚本生成预设...");

  try {
    const response = await fetch("/api/presets");
    const presets = await response.json();
    state.presets = presets;
    state.feature = presets.features[0]?.key ?? "research";
    syncFeatureToggle();
    render();
    appendLog("脚本生成预设加载完成。");
    jobBadge.textContent = "空闲";
  } catch (error) {
    jobBadge.textContent = "错误";
    appendLog(`预设加载失败：${error.message}`);
  } finally {
    setBusy(false);
  }
}

function currentFeature() {
  return state.presets.features.find((item) => item.key === state.feature);
}

function selectedCandidate() {
  return state.candidates[state.selectedCandidateIndex] ?? null;
}

function selectedScenes() {
  const feature = currentFeature();
  const candidate = selectedCandidate();
  if (!feature || !candidate) {
    return [];
  }

  return feature.scenePlan.map((scenePlan, index) => {
    const candidateScene = candidate.scenes[index];
    return {
      ...scenePlan,
      subtitle: {
        zh: candidateScene?.zh ?? "",
        en: candidateScene?.en ?? "",
      },
      candidateTitle: candidateScene?.title ?? scenePlan.title,
      note: candidateScene?.note ?? scenePlan.note,
    };
  });
}

function syncFeatureToggle() {
  document
    .querySelectorAll(".segment")
    .forEach((item) => item.classList.toggle("active", item.dataset.feature === state.feature));
}

function render() {
  if (!state.presets) {
    return;
  }

  const feature = currentFeature();
  const candidate = selectedCandidate();
  const scenes = selectedScenes();
  const durationSeconds = currentDurationSeconds();

  featureBadge.textContent = feature.label;
  scoreBadge.textContent = candidate ? String(candidate.score) : "--";
  scriptTitle.textContent = candidate ? candidate.title : `${feature.label} / 等待生成脚本`;
  candidateSummary.textContent = candidate
    ? `${state.candidates.length} 个候选脚本，当前查看第 ${state.selectedCandidateIndex + 1} 个，默认 ${durationSeconds}s`
    : `先生成 3 个脚本，再选择 1 个继续出片。当前默认时长 ${durationSeconds}s`;

  renderCandidateList();

  if (!candidate) {
    timeline.innerHTML = `
      <article class="empty-card">
        <p class="empty-title">还没有脚本候选</p>
        <p class="empty-copy">先选择功能，然后点击“生成 3 个脚本”。</p>
      </article>
    `;
    auditList.innerHTML = `
      <li>
        <span class="audit-icon">待选</span>
        <span>脚本生成后，这里会显示基于审查 skill 的通过点。</span>
      </li>
    `;
    renderCommand.value = "先生成脚本并选择一个候选，再生成 JSON 或渲染视频。";
    if (!state.generated) {
      jsonPath.textContent = "尚未生成";
      videoPath.textContent = "尚未渲染";
    }
    clearPreview();
    return;
  }

  timeline.innerHTML = scenes
    .map(
      (scene, index) => `
        <article class="timeline-item ${index === state.activeSceneIndex ? "active" : ""}" data-scene="${index}">
          <div class="timecode">${scene.time}</div>
          <div>
            <p class="scene-title">${escapeHtml(scene.candidateTitle)}</p>
            <p class="line-en">${escapeHtml(scene.subtitle.en).replace(/\n/g, "<br>")}</p>
            <p class="line-zh">${escapeHtml(scene.subtitle.zh).replace(/\n/g, "<br>")}</p>
            <p class="shot-note">${escapeHtml(scene.note)}</p>
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll(".timeline-item").forEach((item) => {
    item.addEventListener("click", () => {
      state.activeSceneIndex = Number(item.dataset.scene);
      setPreview(scenes[state.activeSceneIndex]);
      render();
    });
  });

  auditList.innerHTML = candidate.audit
    .map((item) => `<li><span class="audit-icon">通过</span><span>${escapeHtml(item)}</span></li>`)
    .join("");

  renderCommand.value =
    state.generated?.command ?? "选择这个脚本后，点击“生成 JSON”得到可执行渲染命令。";

  if (!state.generated) {
    jsonPath.textContent = "尚未生成";
    videoPath.textContent = "尚未渲染";
  }

  setPreview(scenes[state.activeSceneIndex] ?? scenes[0]);
}

function renderCandidateList() {
  if (state.candidates.length === 0) {
    candidateList.innerHTML = `
      <article class="empty-card compact">
        <p class="empty-title">未生成候选</p>
        <p class="empty-copy">点击左侧按钮后，这里会出现 3 个脚本方案。</p>
      </article>
    `;
    return;
  }

  candidateList.innerHTML = state.candidates
    .map((candidate, index) => {
      const isActive = index === state.selectedCandidateIndex;
      return `
        <button class="candidate-card ${isActive ? "active" : ""}" data-candidate="${index}" type="button">
          <div class="candidate-card-top">
            <span class="candidate-rank">方案 ${index + 1}</span>
            <span class="candidate-hook">${hookStyleLabel(candidate.hookStyle)}</span>
          </div>
          <p class="candidate-title">${escapeHtml(candidate.title)}</p>
          <p class="candidate-angle">${escapeHtml(candidate.angle)}</p>
          <div class="candidate-meta">
            <span>评分 ${candidate.score}</span>
            <span>${escapeHtml(candidate.candidateId)}</span>
          </div>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".candidate-card").forEach((item) => {
    item.addEventListener("click", () => {
      state.selectedCandidateIndex = Number(item.dataset.candidate);
      state.activeSceneIndex = 0;
      state.generated = null;
      render();
    });
  });
}

function setPreview(scene) {
  if (!scene) {
    clearPreview();
    return;
  }

  previewVideo.src = scene.previewPath;
  captionPreview.innerHTML = escapeHtml(scene.subtitle.en).replace(/\n/g, "<br>");
  previewVideo.play().catch(() => {});
}

function clearPreview() {
  previewVideo.removeAttribute("src");
  previewVideo.load();
  captionPreview.textContent = "脚本生成后会在这里预览当前 scene 的素材和字幕。";
}

async function generateCandidates() {
  setBusy(true, "生成脚本中");
  appendLog("正在基于当前功能和主题生成 3 个脚本...");

  try {
    const response = await fetch("/api/generate-candidates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feature: state.feature,
      }),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(localizeServerMessage(result.error || result.message || "Request failed"));
    }

    state.candidates = result.candidates ?? [];
    state.selectedCandidateIndex = state.candidates.length > 0 ? 0 : -1;
    state.activeSceneIndex = 0;
    state.generated = null;

    appendLog(localizeServerMessage(result.message));
    appendLog(`模型：${result.model}`);
    if (result.baseURL) {
      appendLog(`网关：${result.baseURL}`);
    }
    appendLog(`功能：${featureLabel(result.feature)}`);
    appendLog(`主题：${result.topic}`);
    appendLog(`已生成 ${state.candidates.length} 个候选脚本。`);
    jobBadge.textContent = "脚本已生成";
  } catch (error) {
    jobBadge.textContent = "错误";
    appendLog(`错误：${error.message}`);
  } finally {
    setBusy(false);
    render();
  }
}

async function runJob(label, endpoint) {
  if (!selectedCandidate()) {
    appendLog("请先生成 3 个脚本，并选择其中一个。");
    jobBadge.textContent = "待选择";
    return;
  }

  setBusy(true, label);
  appendLog(label);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload()),
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(localizeServerMessage(result.error || result.message || "Request failed"));
    }

    state.generated = result;
    renderCommand.value = result.command;
    jsonPath.textContent = result.configPath;
    videoPath.textContent = result.render ? result.outputPath : "尚未渲染";
    jobBadge.textContent = endpoint === "/api/render" ? "已渲染" : "JSON 已生成";
    appendLog(localizeServerMessage(result.message));
    appendLog(`配置文件：${result.configPath}`);

    if (result.render) {
      appendLog(`视频文件：${result.outputPath}`);
      if (result.render.stdout.trim()) {
        appendLog(result.render.stdout.trim());
      }
      if (result.render.stderr.trim()) {
        appendLog(result.render.stderr.trim());
      }
    }
  } catch (error) {
    jobBadge.textContent = "错误";
    appendLog(`错误：${error.message}`);
  } finally {
    setBusy(false);
    render();
  }
}

function requestPayload() {
  return {
    feature: state.feature,
    duration: currentDurationSeconds(),
    topic: currentFeature().defaultTopic,
    candidate: selectedCandidate(),
  };
}

function setBusy(isBusy, label = null) {
  state.busy = isBusy;
  generateScriptsButton.disabled = isBusy;
  generateJsonButton.disabled = isBusy || !selectedCandidate();
  renderButton.disabled = isBusy || !selectedCandidate();
  if (label) {
    jobBadge.textContent = label;
  }
}

function appendLog(message) {
  const nextLine = `[${new Date().toLocaleTimeString()}] ${message}`;
  activityLog.value = activityLog.value ? `${activityLog.value}\n${nextLine}` : nextLine;
  activityLog.scrollTop = activityLog.scrollHeight;
}

function featureLabel(featureKey) {
  return state.presets.features.find((item) => item.key === featureKey)?.label ?? featureKey;
}

function currentDurationSeconds() {
  return Number(state.presets?.defaults?.durationSeconds ?? 12);
}

function hookStyleLabel(hookStyle) {
  const labels = {
    secret: "秘密感",
    mistake: "差点犯错",
    panic: "惊慌感",
  };
  return labels[hookStyle] ?? hookStyle;
}

function localizeServerMessage(message) {
  const dictionary = {
    "Script candidates generated": "3 个脚本已生成。",
    "JSON generated": "JSON 生成完成。",
    "Render completed": "视频渲染完成。",
    "Render failed": "视频渲染失败。",
    "Request failed": "请求失败。",
    "Unknown error": "未知错误。",
    "Missing candidate": "缺少已选脚本，请先选一个候选脚本。",
    "Missing AI_SDK_API_KEY": "缺少 AI_SDK_API_KEY。请先在项目根目录 `.env.local` 或当前终端环境里配置它。",
    "Invalid JSON body": "请求体 JSON 格式无效。",
    "Unknown feature: research": "未知功能：research",
    "Unknown feature: interviews": "未知功能：interviews",
  };

  return dictionary[message] ?? message;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

init();
