const state = {
  presets: null,
  section: "generate",
  feature: null,
  hasChosenFeature: false,
  candidates: [],
  focusedCandidateIndex: 0,
  selectedCandidateIndex: -1,
  generated: null,
  assets: [],
  selectedAssetId: "",
  customHookAssetPath: "",
  busy: false,
  pendingAction: null,
  lastError: "",
};

const navRail = document.querySelector(".nav-rail");
const chatStream = document.querySelector("#chatStream");
const previewVideo = document.querySelector("#previewVideo");
const stageOverlay = document.querySelector("#stageOverlay");
const scriptTitle = document.querySelector("#scriptTitle");
const stageMeta = document.querySelector("#stageMeta");
const statusText = document.querySelector("#statusText");
const composerZone = document.querySelector("#composerZone");
const hookUploadInput = document.querySelector("#hookUploadInput");

navRail.addEventListener("click", (event) => {
  const sectionButton = event.target.closest("[data-section]");
  if (!sectionButton || state.busy) {
    return;
  }

  handleSectionChange(sectionButton.dataset.section);
});

chatStream.addEventListener("click", (event) => {
  const featureButton = event.target.closest("[data-feature]");
  if (featureButton) {
    handleFeatureChoice(featureButton.dataset.feature);
    return;
  }

  const navButton = event.target.closest("[data-candidate-nav]");
  if (navButton) {
    shiftCandidate(navButton.dataset.candidateNav);
    return;
  }

  const assetPreviewButton = event.target.closest("[data-asset-preview]");
  if (assetPreviewButton) {
    handleAssetPreview(assetPreviewButton.dataset.assetPreview);
    return;
  }

  const assetHookButton = event.target.closest("[data-asset-hook]");
  if (assetHookButton) {
    handleAssetAsHook(assetHookButton.dataset.assetHook);
  }
});

composerZone.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton || state.busy) {
    return;
  }

  const {action} = actionButton.dataset;
  if (action === "refresh-scripts") {
    if (state.hasChosenFeature) {
      generateCandidates();
    }
    return;
  }

  if (action === "render-video") {
    renderVideo();
    return;
  }

  if (action === "reload-assets") {
    loadAssets();
    return;
  }

  if (action === "upload-hook") {
    hookUploadInput.click();
    return;
  }

  if (action === "go-generate") {
    handleSectionChange("generate");
  }
});

hookUploadInput.addEventListener("change", async () => {
  const [file] = hookUploadInput.files ?? [];
  if (!file) {
    return;
  }

  try {
    await uploadHook(file);
  } finally {
    hookUploadInput.value = "";
  }
});

async function init() {
  setBusy(true, "加载中");

  try {
    const response = await fetchWithTimeout("/api/presets", {}, 10000);
    state.presets = await response.json();
    state.feature = state.presets.features[0]?.key ?? "research";
    await loadAssets({quiet: true});
  } catch (error) {
    state.lastError = `预设加载失败：${error.message}`;
  } finally {
    setBusy(false);
    render();
  }
}

function currentFeature() {
  return state.presets?.features.find((item) => item.key === state.feature) ?? null;
}

function selectedCandidate() {
  return state.candidates[state.selectedCandidateIndex] ?? null;
}

function focusedCandidate() {
  return state.candidates[state.focusedCandidateIndex] ?? null;
}

function selectedAsset() {
  return state.assets.find((asset) => asset.id === state.selectedAssetId) ?? state.assets[0] ?? null;
}

function selectedHookAsset() {
  return state.assets.find((asset) => asset.assetPath === state.customHookAssetPath) ?? null;
}

function defaultHookAsset() {
  return state.assets.find((asset) => asset.category === "hook") ?? null;
}

function activeHookAsset() {
  return selectedHookAsset() ?? defaultHookAsset();
}

function currentScenes() {
  const feature = currentFeature();
  const candidate = focusedCandidate();
  const hookAsset = activeHookAsset();
  if (!feature || !candidate) {
    return [];
  }

  return feature.scenePlan.map((scenePlan, index) => {
    const candidateScene = candidate.scenes[index];
    const previewPath =
      index === 0 && hookAsset ? hookAsset.previewPath : scenePlan.previewPath;

    return {
      time: scenePlan.time,
      title: candidateScene?.title ?? scenePlan.title,
      previewPath,
      zh: candidateScene?.zh ?? "",
      en: candidateScene?.en ?? "",
      note: normalizeSceneNote(candidateScene?.note ?? scenePlan.note),
    };
  });
}

function normalizeSceneNote(note) {
  const value = String(note ?? "").trim();
  return value === "Match subtitle pacing to footage." ? "" : value;
}

async function handleSectionChange(section) {
  state.section = section === "materials" ? "materials" : "generate";
  state.lastError = "";

  if (state.section === "materials" && state.assets.length === 0) {
    await loadAssets();
    return;
  }

  render();
}

async function handleFeatureChoice(featureKey) {
  if (!state.presets || state.busy) {
    return;
  }

  state.feature = featureKey;
  state.hasChosenFeature = true;
  state.candidates = [];
  state.focusedCandidateIndex = 0;
  state.selectedCandidateIndex = -1;
  state.generated = null;
  state.lastError = "";
  render();
  await generateCandidates();
}

function shiftCandidate(direction) {
  if (state.candidates.length === 0) {
    return;
  }

  if (direction === "prev") {
    state.focusedCandidateIndex =
      (state.focusedCandidateIndex - 1 + state.candidates.length) % state.candidates.length;
  } else {
    state.focusedCandidateIndex = (state.focusedCandidateIndex + 1) % state.candidates.length;
  }

  state.selectedCandidateIndex = state.focusedCandidateIndex;
  state.generated = null;
  render();
}

function handleAssetPreview(assetId) {
  state.selectedAssetId = assetId;
  render();
}

function handleAssetAsHook(assetId) {
  const asset = state.assets.find((item) => item.id === assetId);
  if (!asset || asset.category !== "hook") {
    return;
  }

  state.customHookAssetPath = asset.assetPath;
  state.selectedAssetId = asset.id;
  state.generated = null;
  render();
}

async function generateCandidates() {
  state.lastError = "";
  state.generated = null;
  setBusy(true, "正在生成候选脚本...", "scripts");
  render();

  try {
    const response = await fetchWithTimeout(
      "/api/generate-candidates",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature: state.feature,
        }),
      },
      120000,
    );

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(localizeServerMessage(result.error || result.message || "Request failed"));
    }

    state.candidates = result.candidates ?? [];
    state.focusedCandidateIndex = 0;
    state.selectedCandidateIndex = state.candidates.length > 0 ? 0 : -1;
  } catch (error) {
    state.lastError = error.name === "AbortError" ? "生成脚本超时，请稍后重试。" : error.message;
  } finally {
    setBusy(false);
    render();
  }
}

async function renderVideo() {
  if (!state.hasChosenFeature || state.candidates.length === 0 || state.busy) {
    return;
  }

  state.lastError = "";
  state.selectedCandidateIndex = state.focusedCandidateIndex;
  setBusy(true, "正在渲染视频...", "render");
  render();

  try {
    const response = await fetchWithTimeout(
      "/api/render",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload()),
      },
      300000,
    );

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(localizeServerMessage(result.error || result.message || "Request failed"));
    }

    state.generated = result;
  } catch (error) {
    state.lastError = error.name === "AbortError" ? "渲染超时，请稍后重试。" : error.message;
  } finally {
    setBusy(false);
    render();
  }
}

async function loadAssets({quiet = false} = {}) {
  if (!quiet) {
    setBusy(true, "正在加载素材库...", "assets");
    render();
  }

  try {
    const response = await fetchWithTimeout("/api/assets", {}, 15000);
    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(localizeServerMessage(result.error || result.message || "Request failed"));
    }

    state.assets = result.assets ?? [];
    if (!state.selectedAssetId && state.assets.length > 0) {
      state.selectedAssetId = state.assets[0].id;
    }
  } catch (error) {
    state.lastError = error.name === "AbortError" ? "加载素材超时，请稍后重试。" : error.message;
  } finally {
    if (!quiet) {
      setBusy(false);
      render();
    }
  }
}

async function uploadHook(file) {
  if (!isSupportedHookFile(file)) {
    state.lastError = "只支持上传 mp4、mov、webm 格式的 Hook 视频。";
    render();
    return;
  }

  state.lastError = "";
  setBusy(true, "正在上传 Hook...", "upload");
  render();

  try {
    const contentBase64 = await fileToBase64(file);
    const response = await fetchWithTimeout(
      "/api/upload-hook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          contentBase64,
        }),
      },
      120000,
    );

    const result = await response.json();
    if (!response.ok || !result.ok) {
      throw new Error(localizeServerMessage(result.error || result.message || "Request failed"));
    }

    state.assets = [result.asset, ...state.assets.filter((asset) => asset.id !== result.asset.id)];
    state.selectedAssetId = result.asset.id;
    state.customHookAssetPath = result.asset.assetPath;
    state.generated = null;
    updateStatus(`已上传并设为当前 Hook：${result.asset.name}`);
  } catch (error) {
    state.lastError = error.name === "AbortError" ? "上传 Hook 超时，请稍后重试。" : error.message;
  } finally {
    setBusy(false);
    render();
  }
}

function isSupportedHookFile(file) {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  return [".mp4", ".mov", ".webm"].includes(ext);
}

function requestPayload() {
  const hookAsset = activeHookAsset();
  return {
    feature: state.feature,
    duration: Number(state.presets?.defaults?.durationSeconds ?? 12),
    topic: currentFeature()?.defaultTopic,
    candidate: selectedCandidate(),
    customHookAssetPath: hookAsset?.assetPath ?? "",
  };
}

function render() {
  if (!state.presets) {
    renderBooting();
    return;
  }

  renderNavRail();

  if (state.section === "materials") {
    renderMaterialsWorkspace();
    return;
  }

  renderGenerateWorkspace();
}

function renderNavRail() {
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === state.section);
  });
}

function renderGenerateWorkspace() {
  const feature = currentFeature();
  const candidate = focusedCandidate();
  const scenes = currentScenes();
  const stageState = currentStageState();
  const activeHook = activeHookAsset();

  scriptTitle.textContent = candidate ? candidate.title : activeHook ? `当前 Hook：${activeHook.name}` : "等待渲染视频";
  stageMeta.textContent = stageState === "final" ? "最终成片" : stageState === "rendering" ? "渲染中" : activeHook ? "自定义 Hook 已启用" : "等待脚本";

  updateStatus(buildGenerateStatusText(feature, candidate, stageState, activeHook));
  renderGenerateConversation(feature, candidate, scenes, activeHook);
  renderGenerateComposer(feature, candidate, stageState, activeHook);
  setComposerStats({
    mode: feature?.label ?? "--",
    history: `${state.candidates.length} 个候选`,
    output: activeHook ? "Hook 已设" : stageState === "final" ? "已出片" : stageState === "rendering" ? "渲染中" : "未渲染",
  });
  renderGenerateStage(stageState, scenes, activeHook);
}

function renderMaterialsWorkspace() {
  const asset = selectedAsset();
  const hook = activeHookAsset();

  scriptTitle.textContent = asset ? asset.name : "等待预览素材";
  stageMeta.textContent = asset ? (asset.category === "hook" ? "Hook 素材" : "Source 素材") : "等待素材";

  updateStatus(buildMaterialsStatusText(asset, hook));
  renderMaterialsConversation(asset, hook);
  renderMaterialsComposer(hook);
  setComposerStats({
    mode: "素材",
    history: `${state.assets.length} 条素材`,
    output: hook ? "当前 Hook 已设" : "未设 Hook",
  });
  renderMaterialsStage(asset);
}

function renderBooting() {
  composerZone.innerHTML = "";

  if (state.lastError) {
    chatStream.innerHTML = `
      <div class="chat-thread">
        <article class="message-row assistant">
          <div class="message-card error-message">
            <span class="message-role">System</span>
            <p class="message-title">加载失败</p>
            <p class="message-copy">${escapeHtml(state.lastError)}</p>
          </div>
        </article>
      </div>
    `;
    return;
  }

  chatStream.innerHTML = `
    <div class="chat-thread">
      <article class="message-row assistant">
        <div class="message-card">
          <span class="message-role">System</span>
          <p class="message-title">正在准备视频工作台。</p>
          <div class="loading-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderGenerateConversation(feature, candidate, scenes, activeHook) {
  const blocks = [];

  blocks.push(`
    <article class="message-row assistant">
      <div class="message-card">
        <span class="message-role">System</span>
        <p class="message-title">请选择这次要生成的能力方向。</p>
        <div class="feature-picker" role="tablist" aria-label="功能类型">
          ${renderFeatureButtons()}
        </div>
      </div>
    </article>
  `);

  if (activeHook) {
    blocks.push(`
      <article class="message-row user">
        <div class="message-card">
          <span class="message-role">You</span>
          <p class="message-title">当前使用自定义 Hook：${escapeHtml(activeHook.name)}</p>
        </div>
      </article>
    `);
  }

  if (state.hasChosenFeature) {
    blocks.push(`
      <article class="message-row user">
        <div class="message-card">
          <span class="message-role">You</span>
          <p class="message-title">这次做 ${escapeHtml(feature?.label ?? state.feature)}</p>
        </div>
      </article>
    `);
  }

  if (state.busy && state.pendingAction === "scripts") {
    blocks.push(renderLoadingMessage("正在生成 3 个候选脚本", "稍等一下，我正在整理这次的视频脚本方案。"));
  }

  if (state.candidates.length > 0 && candidate) {
    blocks.push(`
      <article class="message-row assistant">
        <div class="message-card">
          <span class="message-role">Atypica</span>
          <p class="message-title">候选脚本 ${state.focusedCandidateIndex + 1} / ${state.candidates.length}</p>
          <div class="candidate-switcher">
            <button type="button" class="switch-arrow" data-candidate-nav="prev">← 上一个</button>
            <div class="candidate-meta-strip">
              <span>${hookStyleLabel(candidate.hookStyle)}</span>
              <span>评分 ${candidate.score}</span>
              <span>${escapeHtml(candidate.title)}</span>
            </div>
            <button type="button" class="switch-arrow" data-candidate-nav="next">下一个 →</button>
          </div>
          <div class="script-summary">
            <p class="summary-heading">角度</p>
            <p class="summary-copy">${escapeHtml(candidate.angle)}</p>
          </div>
          <div class="script-table-wrap">
            <table class="script-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>Scene</th>
                  <th>EN</th>
                  <th>ZH</th>
                </tr>
              </thead>
              <tbody>
                ${scenes
                  .map(
                    (scene) => `
                      <tr>
                        <td data-label="时间">${escapeHtml(scene.time)}</td>
                        <td data-label="Scene">${escapeHtml(scene.title)}</td>
                        <td data-label="EN">${escapeHtml(scene.en).replace(/\n/g, "<br>")}</td>
                        <td data-label="ZH">${escapeHtml(scene.zh).replace(/\n/g, "<br>")}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
          ${renderAuditBlock(candidate.audit)}
        </div>
      </article>
    `);
  }

  if (state.busy && state.pendingAction === "render") {
    blocks.push(renderLoadingMessage("正在渲染视频", "右侧已经进入视频舞台，渲染完成后会直接切换成最终成片。"));
  }

  if (state.generated?.render) {
    blocks.push(`
      <article class="message-row assistant">
        <div class="message-card success-message">
          <span class="message-role">Atypica</span>
          <p class="message-title">视频已经生成完成。</p>
          <p class="message-copy">右侧现在显示的是最终视频，你可以继续切换脚本再重新渲染。</p>
        </div>
      </article>
    `);
  }

  if (state.lastError) {
    blocks.push(renderErrorMessage());
  }

  chatStream.innerHTML = `<div class="chat-thread">${blocks.join("")}</div>`;
  requestAnimationFrame(() => {
    chatStream.scrollTop = chatStream.scrollHeight;
  });
}

function renderMaterialsConversation(asset, hook) {
  const hooks = state.assets.filter((item) => item.category === "hook");
  const sources = state.assets.filter((item) => item.category === "source");
  const blocks = [];

  blocks.push(`
    <article class="message-row assistant">
      <div class="message-card">
        <span class="message-role">Atypica</span>
        <p class="message-title">这里是当前的视频素材库。</p>
        <p class="message-copy">你可以先浏览现有 Hook 和 Source 片段，也可以上传你自己的形象 Hook，然后回到“生成”直接出片。</p>
      </div>
    </article>
  `);

  if (hook) {
    blocks.push(`
      <article class="message-row user">
        <div class="message-card">
          <span class="message-role">You</span>
          <p class="message-title">当前 Hook 已锁定为 ${escapeHtml(hook.name)}</p>
        </div>
      </article>
    `);
  }

  if (state.busy && state.pendingAction === "assets") {
    blocks.push(renderLoadingMessage("正在加载素材", "我正在整理 Hook 和 Source 素材列表。"));
  }

  if (state.busy && state.pendingAction === "upload") {
    blocks.push(renderLoadingMessage("正在上传 Hook", "上传完成后会自动加入素材库，并设为当前 Hook。"));
  }

  blocks.push(renderAssetSection("Hook 素材", "可直接设为开场 Hook。", hooks, asset));
  blocks.push(renderAssetSection("Source 素材", "用于中段证明、结论和补充画面。", sources, asset));

  if (state.lastError) {
    blocks.push(renderErrorMessage());
  }

  chatStream.innerHTML = `<div class="chat-thread">${blocks.join("")}</div>`;
}

function renderAssetSection(title, copy, assets, activeAsset) {
  return `
    <article class="message-row assistant">
      <div class="message-card">
        <span class="message-role">Library</span>
        <p class="message-title">${escapeHtml(title)}</p>
        <p class="message-copy">${escapeHtml(copy)}</p>
        <div class="asset-grid">
          ${
            assets.length > 0
              ? assets.map((asset) => renderAssetCard(asset, activeAsset)).join("")
              : `<div class="asset-empty">当前还没有这类素材。</div>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderAssetCard(asset, activeAsset) {
  const isActive = activeAsset?.id === asset.id;
  const isCurrentHook = state.customHookAssetPath === asset.assetPath;

  return `
    <article class="asset-card ${isActive ? "active" : ""}">
      <video class="asset-thumb" src="${escapeHtml(asset.previewPath)}" muted playsinline preload="metadata"></video>
      <div class="asset-copy">
        <div class="asset-meta">
          <span class="asset-tag">${asset.category === "hook" ? "Hook" : "Source"}</span>
          ${asset.isCustom ? `<span class="asset-tag strong">自定义</span>` : ""}
          ${isCurrentHook ? `<span class="asset-tag strong">当前 Hook</span>` : ""}
        </div>
        <p class="asset-name">${escapeHtml(asset.name)}</p>
        <p class="asset-desc">${formatBytes(asset.sizeBytes)} · ${formatDate(asset.updatedAt)}</p>
      </div>
      <div class="asset-actions">
        <button type="button" class="ghost-action small" data-asset-preview="${escapeHtml(asset.id)}">预览</button>
        ${
          asset.category === "hook"
            ? `<button type="button" class="ghost-action small ${isCurrentHook ? "is-selected" : ""}" data-asset-hook="${escapeHtml(asset.id)}">${isCurrentHook ? "已设为 Hook" : "设为 Hook"}</button>`
            : ""
        }
      </div>
    </article>
  `;
}

function renderGenerateComposer(feature, candidate, stageState, activeHook) {
  composerZone.innerHTML = `
    <div class="composer-card">
      <div class="composer-footer">
        <p class="composer-hint">${escapeHtml(buildComposerHint(feature, candidate, stageState, activeHook))}</p>
        <div class="composer-metrics">
          <span>${escapeHtml(feature?.label ?? "--")}</span>
          <span>${state.candidates.length} 个候选</span>
          <span>${activeHook ? `Hook: ${escapeHtml(shorten(activeHook.name, 18))}` : "默认 Hook"}</span>
        </div>
        <div class="composer-actions">
          <button class="ghost-action" type="button" data-action="refresh-scripts" ${state.busy || !state.hasChosenFeature ? "disabled" : ""}>
            重新生成
          </button>
        </div>
      </div>
      <button class="primary-action" type="button" data-action="render-video" ${state.busy || !candidate ? "disabled" : ""}>
        生成视频
      </button>
    </div>
  `;
}

function renderMaterialsComposer(hook) {
  composerZone.innerHTML = `
    <div class="composer-card">
      <div class="composer-footer">
        <p class="composer-hint">上传你自己的形象 Hook，上传后会自动加入素材库，并可直接带回“生成”页使用。</p>
        <div class="composer-metrics">
          <span>${state.assets.length} 条素材</span>
          <span>${hook ? `当前 Hook: ${escapeHtml(shorten(hook.name, 18))}` : "当前未设 Hook"}</span>
        </div>
        <div class="composer-actions">
          <button class="ghost-action" type="button" data-action="reload-assets" ${state.busy ? "disabled" : ""}>
            刷新素材
          </button>
          <button class="ghost-action" type="button" data-action="upload-hook" ${state.busy ? "disabled" : ""}>
            上传 Hook
          </button>
        </div>
      </div>
      <button class="primary-action" type="button" data-action="go-generate" ${state.busy ? "disabled" : ""}>
        去生成视频
      </button>
    </div>
  `;
}

function setComposerStats({mode, history, output}) {
  const modeStat = composerZone.querySelector("#modeStat");
  const historyStat = composerZone.querySelector("#historyStat");
  const outputStat = composerZone.querySelector("#outputStat");

  if (modeStat) {
    modeStat.textContent = mode;
  }

  if (historyStat) {
    historyStat.textContent = history;
  }

  if (outputStat) {
    outputStat.textContent = output;
  }
}

function renderFeatureButtons() {
  return (state.presets?.features ?? [])
    .map(
      (feature) => `
        <button
          type="button"
          class="${feature.key === state.feature && state.hasChosenFeature ? "active" : ""}"
          data-feature="${feature.key}"
          ${state.busy ? "disabled" : ""}
        >
          ${escapeHtml(feature.label)}
        </button>
      `,
    )
    .join("");
}

function renderAuditBlock(audit = []) {
  if (audit.length === 0) {
    return "";
  }

  return `
    <div class="script-audit">
      <p class="summary-heading">审查结论</p>
      <ul class="audit-inline">
        ${audit.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderErrorMessage() {
  return `
    <article class="message-row assistant">
      <div class="message-card error-message">
        <span class="message-role">Atypica</span>
        <p class="message-title">当前步骤失败</p>
        <p class="message-copy">${escapeHtml(state.lastError)}</p>
      </div>
    </article>
  `;
}

function renderLoadingMessage(title, copy) {
  return `
    <article class="message-row assistant">
      <div class="message-card">
        <span class="message-role">Atypica</span>
        <p class="message-title">${escapeHtml(title)}</p>
        <p class="message-copy">${escapeHtml(copy)}</p>
        <div class="loading-dots" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </article>
  `;
}

function currentStageState() {
  if (state.section === "materials") {
    return selectedAsset() ? "asset" : "idle";
  }
  if (state.busy && state.pendingAction === "render") {
    return "rendering";
  }
  if (state.generated?.render) {
    return "final";
  }
  if (focusedCandidate()) {
    return "preview";
  }
  return "idle";
}

function renderGenerateStage(stageState, scenes) {
  if (stageState === "idle") {
    clearPreview();
    setStageOverlay("等待脚本", "左边先选 AI Research 或 AI Interview，然后会自动生成候选脚本。");
    return;
  }

  if (stageState === "final" && state.generated?.outputPath) {
    setStageOverlay(null, null);
    setRenderedPreview(state.generated.outputPath);
    return;
  }

  const scene = scenes[0] ?? null;
  if (scene) {
    setPreview(scene.previewPath);
  }

  if (stageState === "rendering") {
    setStageOverlay("正在渲染视频", "保持当前窗口打开，渲染完成后这里会自动切成最终视频。");
  } else {
    setStageOverlay(null, null);
  }
}

function renderMaterialsStage(asset) {
  if (!asset) {
    clearPreview();
    setStageOverlay("等待素材", "左边先浏览素材库，点“预览”就会在这里播放片段。");
    return;
  }

  setPreview(asset.previewPath);
  if (state.busy && state.pendingAction === "upload") {
    setStageOverlay("正在上传 Hook", "上传完成后这里会保持当前素材，并自动把新 Hook 加入素材库。");
  } else {
    setStageOverlay(null, null);
  }
}

function setPreview(src) {
  if (!src) {
    clearPreview();
    return;
  }

  if (previewVideo.dataset.src !== src) {
    previewVideo.src = src;
    previewVideo.dataset.src = src;
  }

  previewVideo.loop = true;
  previewVideo.controls = true;
  previewVideo.play().catch(() => {});
}

function setRenderedPreview(outputPath) {
  const src = toBrowserPath(outputPath);
  if (previewVideo.dataset.src !== src) {
    previewVideo.src = src;
    previewVideo.dataset.src = src;
  }

  previewVideo.loop = true;
  previewVideo.controls = true;
  previewVideo.currentTime = 0;
  previewVideo.play().catch(() => {});
}

function clearPreview() {
  previewVideo.removeAttribute("src");
  previewVideo.removeAttribute("data-src");
  previewVideo.load();
}

function setStageOverlay(title, copy) {
  if (!title) {
    stageOverlay.classList.remove("visible");
    stageOverlay.innerHTML = "";
    return;
  }

  stageOverlay.classList.add("visible");
  stageOverlay.innerHTML = `
    <div class="stage-overlay-card">
      <p class="stage-overlay-title">${escapeHtml(title)}</p>
      <p class="stage-overlay-copy">${escapeHtml(copy)}</p>
      <div class="loading-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
}

function setBusy(isBusy, label = null, pendingAction = null) {
  state.busy = isBusy;
  state.pendingAction = isBusy ? pendingAction : null;

  if (isBusy) {
    document.body.classList.add("is-busy");
  } else {
    document.body.classList.remove("is-busy");
  }

  if (label) {
    updateStatus(label);
  }
}

function updateStatus(message) {
  statusText.textContent = message;
}

function buildGenerateStatusText(feature, candidate, stageState, activeHook) {
  if (state.lastError) {
    return "当前步骤失败，请在左侧查看错误消息。";
  }
  if (!state.hasChosenFeature) {
    return "先选择 AI Research 或 AI Interview。";
  }
  if (stageState === "rendering") {
    return "正在渲染视频，右侧会自动更新成片。";
  }
  if (stageState === "final") {
    return "成片已经生成，右侧显示最终视频。";
  }
  if (activeHook) {
    return `当前已启用自定义 Hook：${shorten(activeHook.name, 20)}。`;
  }
  if (candidate) {
    return `当前浏览脚本 ${state.focusedCandidateIndex + 1} / ${state.candidates.length}。`;
  }
  return `当前模式：${feature?.label ?? "--"}。`;
}

function buildMaterialsStatusText(asset, hook) {
  if (state.lastError) {
    return "素材操作失败，请查看左侧提示。";
  }
  if (state.busy && state.pendingAction === "upload") {
    return "正在上传你的 Hook 素材。";
  }
  if (hook) {
    return `当前 Hook 已锁定：${shorten(hook.name, 24)}。`;
  }
  if (asset) {
    return `正在浏览素材：${shorten(asset.name, 24)}。`;
  }
  return "先上传 Hook 或选择一个现有素材。";
}

function buildComposerHint(feature, candidate, stageState, activeHook) {
  if (!state.hasChosenFeature) {
    return "先选择模式。";
  }
  if (state.busy && state.pendingAction === "scripts") {
    return "脚本生成中...";
  }
  if (stageState === "rendering") {
    return "正在渲染当前脚本。";
  }
  if (stageState === "final") {
    return "可以切换脚本并再次渲染。";
  }
  if (activeHook) {
    return `当前会用 ${shorten(activeHook.name, 18)} 作为开场 Hook。`;
  }
  if (candidate) {
    return `当前是 ${feature?.label ?? "--"}，切换左右箭头查看别的脚本。`;
  }
  return "正在准备脚本。";
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
    "Request failed": "请求失败。",
    "Unknown error": "未知错误。",
    "Missing candidate": "缺少脚本候选，请重新生成。",
    "Missing AI_SDK_API_KEY": "缺少 AI_SDK_API_KEY，请先配置环境变量。",
    "Missing upload content": "上传内容为空，请重新选择文件。",
    "Uploaded file was empty": "上传文件为空，请重新选择。",
    "Uploaded hook is too large": "上传 Hook 过大，请压缩后再试。",
    "Unsupported hook file type": "只支持上传 mp4、mov、webm 格式的 Hook 视频。",
  };
  return dictionary[message] ?? message;
}

function toBrowserPath(filePath) {
  return `/${String(filePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    return response;
  } catch (error) {
    window.clearTimeout(timeoutId);
    throw error;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("读取上传文件失败。"));
    reader.readAsDataURL(file);
  });
}

function formatBytes(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function shorten(value, limit) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

init();
