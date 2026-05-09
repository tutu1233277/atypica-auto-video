# Atypica 自动化生视频

这个工程基于 `Remotion`，目标是把 `hook/` 和 `未命名文件夹/` 里的现有素材做成可编辑、可批量生成的短视频。

## 现在已经能做什么

- 从 `data/videos/*.json` 读取分镜配置
- 自动排列本地素材并叠加中英双语字幕
- 用 `scripts/generate-script.mjs` 根据本地知识库生成一条脚本配置
- 在 Remotion Studio 里继续手动微调字幕、时长、镜头顺序
- 已排除街头采访、街拍、追路人这类高拍摄成本参考

## 常用命令

```bash
npm run studio
npm run render:example
npm run research:ugc -- --query="viral ai tools ugc"
npm run generate-script -- --topic=竞品分析
npm run render -- --config=data/videos/竞品分析.json --out=out/竞品分析.mp4
npm run generate:x-post
npm run post:x
npm run launch:x
```

## 目录说明

- `data/videos/`: 成片配置。改这里最快。
- `data/research/`: TikTok / IG 研究结果缓存。
- `src/`: Remotion 组件。改这里可以调整样式、字幕位置、转场。
- `scripts/generate-script.mjs`: 脚本生成器第一版，当前基于本地 Markdown 参考内容做启发式生成。
- `scripts/research-ugc.mjs`: 自动研究层。优先走 Apify，没配置时 fallback 到本地 Markdown。
- `scripts/generate-x-post.mjs`: 基于 Atypica 卖点和 X launch 参考文案，自动生成多版英文发帖文案。
- `scripts/post-to-x.mjs`: 默认 dry run 预览；带上 X 凭证后可真正发帖。
- `data/research/x-launch-examples.json`: 当前整理好的 X launch 文案参考。

## 如何修改视频

1. 改 `data/videos/*.json` 里的 `subtitle`、`durationInFrames`、`assetPath`。
2. 运行 `npm run studio`，在 Remotion 预览。
3. 如果要改整体视觉风格，改 `src/components/BilingualCaption.tsx` 和 `src/AtypicaAutoVideo.tsx`。

## 关于 TikTok / IG 自动搜索

现在已经接上了“研究来源”接口：

- `npm run research:ugc` 会生成 `data/research/*.json` 和 Markdown 摘要。
- 如果存在 `config/research-providers.json` 且配置了 `Apify taskId/actorId + APIFY_TOKEN`，会真实请求 TikTok / IG 数据。
- 如果没配好，会 fallback 到 `tiktok ig视频链接.md`，但现在会把失败原因写进终端和输出 JSON 的 `diagnostics` 字段。

### Apify 接法

1. 复制 `config/research-providers.example.json` 为 `config/research-providers.json`
2. 每个平台二选一填写：
   - `taskId`: 你已经在 Apify 里建好了 task
   - `actorId`: 你想直接跑某个 actor
3. 在项目根目录放 `.env.local`：

```bash
APIFY_TOKEN=your_token_here
```

4. 运行：

```bash
npm run research:ugc -- --query="viral ai tools ugc"
npm run generate-script -- --topic=竞品分析 --research=data/research/ai-ugc-trends.json
```

这个实现基于 Apify 官方同步 task/dataset API 形式，不把具体 scraper 写死在仓库里。这样你换 actor / task 不用改代码，只改配置。

## 关于 X 自动发帖

现在已经补上了一条可落地的 X 发帖链路：

1. 参考文案保存在 `data/research/x-launch-examples.json`
2. 运行 `npm run generate:x-post` 生成多版 Atypica launch 文案
3. 运行 `npm run post:x` 先预览推荐文案
4. 确认没问题后再加 `-- --publish=true` 真发

### X 凭证

先复制 `config/x-account.example.json` 为 `config/x-account.json`，再填入你自己的：

```json
{
  "appKey": "your_x_api_key",
  "appSecret": "your_x_api_secret",
  "accessToken": "your_user_access_token",
  "accessSecret": "your_user_access_token_secret"
}
```

也可以不用文件，直接放环境变量：

```bash
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
```

### 一次跑完整流程

```bash
npm run launch:x
npm run post:x -- --variant=contrast-launch
npm run post:x -- --variant=contrast-launch --publish=true
```

注意：`post:x` 默认不会真的发，只有显式传 `--publish=true` 才会请求 X API。

## 你关心的那个问题

可以修改。`Remotion` 只是把视频逻辑代码化，不会锁死成片。你后续既可以直接改 JSON，也可以改 React 组件样式和时长。
