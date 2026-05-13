# Atypica Auto Video - 本地开发环境配置

## 前置要求

- macOS
- Node.js v22+ (`node -v` 检查)
- Git (`git --version` 检查)

## 1. 克隆代码

```bash
cd ~/Documents  # 或你喜欢的目录
git clone https://github.com/tutu1233277/atypica-auto-video.git
cd atypica-auto-video
```

## 2. 安装依赖

```bash
npm install
```

## 3. 配置环境变量

创建 `.env.local` 文件（内容从服务器复制，或找我要）：

```bash
touch .env.local
# 然后用编辑器打开，填入环境变量
```

**需要的环境变量：**
- `AI_SDK_API_KEY` - AI模型API密钥
- `AI_SDK_BASE_URL` - AI模型网关地址
- `AI_SDK_MODEL` - 模型名称
- `COS_SECRET_ID` - 腾讯云COS SecretId
- `COS_SECRET_KEY` - 腾讯云COS SecretKey
- `COS_BUCKET` - COS存储桶名称
- `COS_REGION` - COS地域

## 4. 启动开发服务器

### 方式一：Remotion Studio（推荐用于调试视频）

```bash
npm run studio
```

访问 http://localhost:3000

- 实时预览视频效果
- 可以逐帧查看
- 修改代码后自动刷新

### 方式二：视频生成工具（前端界面）

```bash
npm run tool
```

访问 http://localhost:4180

- 完整的视频生成流程
- 生成脚本 → 选择候选 → 渲染视频

### 方式三：同时启动两者（需要两个终端窗口）

**终端 1 - Studio:**
```bash
npm run studio
```

**终端 2 - Tool Server:**
```bash
npm run tool
```

## 5. 本地渲染测试

```bash
# 使用示例配置渲染
npm run render:example

# 或使用自定义配置
npm run render -- --config=data/videos/competitor-ugc.json --out=out/my-video.mp4
```

## 6. 常用开发命令

| 命令 | 说明 |
|:---|:---|
| `npm run studio` | 启动 Remotion Studio (localhost:3000) |
| `npm run tool` | 启动视频生成工具 (localhost:4180) |
| `npm run render` | 渲染视频 |
| `npm run render:example` | 使用示例配置渲染 |

## 7. 项目结构

```
atypica-auto-video/
├── src/                    # Remotion 视频组件
│   ├── Root.tsx           # 视频根组件（定义Composition）
│   ├── AtypicaAutoVideo.tsx  # 主视频组件
│   └── components/        # 子组件（SceneVideo, Caption等）
├── tool/                   # 前端工具界面
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── scripts/               # 服务端脚本
│   ├── video-tool-server.mjs   # HTTP服务器
│   ├── render-video.mjs        # 视频渲染
│   └── cos-client.mjs          # COS上传
├── data/                  # 数据文件
│   ├── videos/            # 视频配置JSON
│   └── tool/              # 预设配置
├── public/                # 静态资源（视频素材）
│   ├── hook/              # Hook视频
│   └── source/            # 场景视频
└── out/                   # 渲染输出目录
```

## 8. 开发工作流

### 修改视频效果

1. 修改 `src/` 下的组件代码
2. 在 Studio (localhost:3000) 中实时查看效果
3. 满意后运行 `npm run render` 生成最终视频

### 修改前端界面

1. 修改 `tool/app.js` 或 `tool/styles.css`
2. 刷新浏览器 (localhost:4180) 即可看到变化

### 修改服务端逻辑

1. 修改 `scripts/` 下的脚本
2. 重启 `npm run tool`

## 9. 常见问题

### Q: 本地没有视频素材？
A: 素材使用腾讯云COS的URL，本地不需要下载。如果需要本地素材，运行：
```bash
# 从服务器同步素材到本地（需要SSH到服务器）
rsync -avz ubuntu@43.160.203.183:/home/ubuntu/atypica-auto-video/public/ ./public/
```

### Q: 数据库连接失败？
A: 本地开发时，数据库配置指向远程服务器。如果不需要数据库功能（查看历史任务），可以忽略。

### Q: 渲染视频时报错？
A: 确保已安装 Chrome/Chromium：
```bash
# macOS
brew install --cask google-chrome

# 或使用 Remotion 自带浏览器
npx remotion browser ensure
```

## 10. 快速开始（一键复制）

```bash
# 1. 克隆
git clone https://github.com/tutu1233277/atypica-auto-video.git
cd atypica-auto-video

# 2. 安装依赖
npm install

# 3. 创建 .env.local 文件（找我要内容）

# 4. 启动 Studio
npm run studio

# 5. 浏览器访问 http://localhost:3000
```
