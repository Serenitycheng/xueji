# 学迹 · 开发会话交接

更新：2026-10-12（Asia/Shanghai）。本文件保存接续所需的当前摘要，不代替代码、Git 或发布平台的实时状态。

## 1. 先确认事实

- 唯一日常开发仓库：`D:\projects\xueji`；应用目录：`source/`。恢复资料集中在 `archive/recovery/`，不要把历史副本当成待合并开发分支。
- 当前分支为 `main`，HEAD 为 `ebf9005`（删除页面无效注释）；前一个提交为 `31763d7`。本地与 `origin/main` 各有 1 个独有提交；用户拉取 `92fb781`（仅修改根 README）后进入合并，尚未生成合并提交。
- 文案精简涉及的 12 个页面/组件及原有 README、开发规则、交接文档已由用户提交在 `ebf9005`。本轮仅解决 README 冲突并更新本交接，保留远端产品说明和本地交接入口；这两个文档已暂存，等待用户完成合并提交和推送。未改应用代码、学习数据、保存协议或课程内容。
- Git 远端：`https://github.com/Serenitycheng/xueji.git`。常用站点：`https://xuexu-study.vercel.app`。本轮未核实 Vercel 发布，不能把 Git 提交或本地 build 视为线上已更新。

## 2. 定位与架构

- **定位**：个人学习工作台，帮助按目录继续学习、直接记录小节完成情况、打开资料和回看学习记录。基础学习流程不依赖 AI；保持学迹自身视觉，不复制序流布局。
- **功能**：线代、概率统计、日语、摄影、开发、专业学习六方向；另可建手动方向。含资料库、私人 PDF、电脑资料处理队列、学习回看、云端同步/历史/导出、旧记录与计划。
- **前端**：Next.js 16.3.4 App Router、React 19.2.6、TypeScript、Tailwind 4；主要工作台用 hash 导航，统一纸页主题和按页面保存的低饱和颜色（浏览器本地存储）。
- **服务**：Next Route Handlers → 学习命令与版本保护 → Neon PostgreSQL；Drizzle 管理结构/迁移，私有原文件存 Vercel Blob。密码哈希登录、签名会话、服务端加密配置；不提供公开注册。
- **资料/AI**：本机 Node 处理器提取文本、Windows OCR，已有 Codex 整理和 DeepSeek 规划能力。电脑队列与网站分开运行，处理器会连接配置的站点；不要当作普通离线测试启动。
- **兼容基线**：应用版本 `0.6.1`，数据外壳版本 `1`，写入协议 `5`；`31763d7` 未改版本号。状态、历史和保存回执通过事务及版本检查写入；保留旧数据字段和离线草稿/冲突处理。

## 3. 已完成与必须保留的决策

- **最新学习页**：任何目录小节/专业节点都可直接点“完成”，无需先“设为当前”；再次点击取消。所有方向统一一个按钮，完成其他节不改变当前学习位置、下一步或历史记录。
- **页面精简**：顶部只显示当前小节名称；目录详情默认收起，展开后仍有学法与教材/课程。已移除学习页的“自己的补充单元”“材料与笔记入口”“最近记录”“方向状态与更多信息”；数据未删除。手动方向保留简洁目录，方向状态在编辑窗口管理，旧记录修正在“学习回看”。不要按旧文档恢复这些区块。
- **完成兼容**：`Unit.completed` 是可选显式布尔值，`false` 优先于旧完成标志。旧数学四项全部完成才继承完成，部分完成不提升为整节完成；日语旧基本/熟练状态可兼容读为完成。取消新完成不删除旧阶段、掌握证据或能力字段；不把“完成”写成“掌握”。概率旧小分项也不能推定整节完成。
- **页面文案**：已去掉各页面旁白、重复解释、实现细节和未上线功能的说明；操作后果、错误及保存状态保留简短提示。课程教学说明、方向结构、学习流程与数据保持原样。
- **视觉**：全站纸页字体和克制层次；七种低饱和预设及自定义色。页面背景、侧栏与卡片随所选色变化；hash 导航后立即切换对应页面颜色。保持手机可操作，避免新增复杂面板。
- **课程结构**：线代保留 44 节、B站主课程；概率统计按 `1.1` 层级组织（37 节），不回退为 `1.1.1`，补充课程采用宋浩较新版 B站资源。其他方向不跟随概率拆并。
- **日语**：用能力节点表达，但保留 L1/L2 等课程进度和教材映射；已接入 Irodori 线上实际课页。方便后续扩展教材，不堆砌能力标签或重复完成按钮。
- **开发**：三条线为开发流程、AI认知、开发基础；流程线结合真实项目，AI认知分遍推进，Python 是已有基础后的系统梳理与项目练习，不恢复北理 MOOC 零基础路线。节点流程沿用“GPT提纲 → 看教材 → 自己回答 → 项目练习 → 复盘”，模板与资源入口随节点提供。
- **资源与笔记**：优先合适的国内/近年资源，B站重要；保留已定课程和稳定节点 ID，不能因新会话重排路线。指定 Python 教材、原方案与旧路线兼容保留。Obsidian 位于 `D:\document\obsidian vault`，需操作时再核对对应笔记路径，不覆盖课堂原笔记。
- **PDF**：默认直接调 PDF-XChange Editor 的 `pxce:`，其他方式作备用；服务端签发约 5 分钟、仅该文件有效的授权并保留 PDF 页序。浏览器/Windows 的外部应用确认无法由网页完全取消；本地批注不会自动写回云端原件。

## 4. 按任务读取核心文件

以下路径相对仓库根目录；无需一次读完。

- 页面与完成按钮：`source/components/{study-app,learning-workspace,curriculum-route,lesson-completion}.tsx`。
- 主题：`source/app/{globals,paper-theme,curriculum}.css`、`source/components/appearance.tsx`、`source/lib/appearance.ts`。
- 学习状态/完成兼容：`source/lib/learning.ts`；目录结构/映射：`source/lib/curriculum.ts`、`source/lib/curricula/six-directions.json`；开发三线：`source/lib/curricula/development-lines.ts`、`source/lib/development-curriculum.ts`。
- 保存链路：`source/app/api/study/route.ts`、`source/lib/{server,commands,data-protection,client-store,use-cloud-sync,versions}.ts`；认证：`source/lib/session.ts`、`source/app/api/auth/route.ts`。
- PDF：`source/components/pdf-open-button.tsx`、`source/lib/{pdf-open,pdf-open-ticket}.ts`、`source/app/api/pdf-open/route.ts`；处理器：`source/scripts/{study-device,local-extract,codex-analysis}.mjs`。
- 数据库：`source/db/vercel-schema.ts`、`source/drizzle-vercel/`（至 `0005_learning_workspace.sql`）；部署：`source/vercel.json`、`source/scripts/{vercel-build,migrate}.mjs`。
- 验证：`source/tests/`、`source/scripts/test.mjs`、`source/scripts/local-harness.mjs`；专项旧说明：`source/docs/`，按需看，早期界面描述可能已失效。
- 原需求：根目录 `AI与开发学习系统_交付说明.txt`、`source/docs/学序功能重构说明ver1.txt`；附件/数据库恢复快照：`archive/recovery/{attachments,data,docs,history,legacy}/`。快照不是当前云端数据，不能覆盖新记录。

## 5. 本地运行与验证

Node 要求 ≥22.13；当前可用 Node 24.19.0，`source/node_modules` 已存在。本轮将依赖中 1188 个仍指向搬迁前目录的 Junction 修正到现有本地包，未下载依赖或修改锁文件。PATH 有 `node`、无 `npm`，可用下方 Node 命令；常规环境仅在依赖缺失或需重建时使用 `npm ci`。

```powershell
Set-Location 'D:\projects\xueji\source'
# 日常开发（需独立开发环境配置才能真实登录、保存）
npm run dev
# 逻辑回归；没有 npm test 脚本
node scripts/test.mjs
# 发布前构建，npm 会自动执行 prebuild
npm run build
npm start
```

当前环境缺 npm 时，在 `source/` 可直接调用已安装工具：

```powershell
node node_modules/next/dist/bin/next dev
# 若 Turbopack 模式仍报缺包错误，可临时用已验证的 webpack 预览
node node_modules/next/dist/bin/next dev --webpack
# 构建前显式准备 PDF worker
node scripts/prepare-assets.mjs
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start
```

- 若新 PowerShell 连 `node` 都找不到，先定位本机 Node 或通过 Codex 的 workspace dependencies 工具查运行时；本轮路径为 `C:\Users\Tracy\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`。路径可能随客户端升级改变，不写进应用代码。
- 服务端变量名称：`DATABASE_URL`、`BLOB_READ_WRITE_TOKEN`、`STUDY_ENCRYPTION_KEY`、`SESSION_SECRET`、`STUDY_PASSWORD_HASH`。密钥约束见应用 README；本轮 `.env.example` 不存在。已有 `.env.device.local` 只确认存在，未读取值，不假定它是开发数据库配置。
- 初始化**独立开发数据库**时审核迁移后再用 `npm run db:migrate`；不要为纯 UI 预览连接生产库。正常本地 build 不应用迁移。
- 可针对变更运行 `node_modules/.bin/oxlint.cmd <相关文件>`、`node_modules/.bin/tsc.cmd --noEmit`。不要为文档修改修整全库旧 lint。
- 本地 API/事务验证：`node scripts/test-learning-local.mjs`；PDF 接口：`node scripts/test-pdf-open-local.mjs`。两者用隔离 PGlite，通过 `STUDY_PGLITE` 指定模块入口；浏览器脚本可用 `STUDY_PLAYWRIGHT`。两项依赖不在项目 package.json 中；当前已定位到 Codex 自带 Playwright，但 PGlite 的旧链接目标缺失。运行隔离数据库测试前须提供有效的 PGlite 入口，不按目录存在与否判断可用性。
- 浏览器验证使用本地服务、测试凭据和隔离 API；核对所选脚本的端口与 `STUDY_TEST_URL` 支持。不要直接套用旧脚本的 UI 选择器。`scripts/test-protection.mjs` 会读取 `.env.local` 并在对应数据库创建临时 schema，不能当作无网络单测随手运行。
- 资料处理按需运行 `node scripts/study-device.mjs --once`；先核对 `STUDY_SITE_URL`，脚本默认域名与上述常用域名不同。本次未运行处理器。

**验证证据分层**：

- 文案精简验证（2026-10-12）：72 项逻辑测试通过；TypeScript 检查通过；六个现代组件 lint 通过；另六个组件使用同一基础配置与精简前的 `31763d7` 比较，18 项既有 lint 问题无新增。
- 本轮真实本地页面验收通过：桌面 7 个工作台页面与 6 个学习方向；390/320px 的工作台及线代学习页；登录、资料上传与恢复弹窗、完成/取消及刷新保留、当前位置不变、页面配色、保存失败提示。无浏览器异常。使用隔离测试数据和 API，未调用真实数据库、上传服务或学习处理器。
- 历史（2026-10-08 交接记录）：学习逻辑已通过 build、隔离 API/数据库和桌面及 320/390px 浏览器验收；本轮不把该构建记录作为当前构建证据。
- 上一轮本机脚本 `source/work/simple-learning-check.mjs` 与截图目录 `source/work/simple-preview/` 仍在，但 `work/` 被忽略，不随克隆携带，脚本有本机路径/端口；可作定点参考，不能作为唯一可移交测试入口。此次专项检查和两张验收截图位于 `source/work/copy-cleanup/`，同样只作本机辅助。

## 6. 发布方式与边界

采用本地验证 → 经授权 commit/push → Vercel Git 自动部署。项目 Root Directory 为 `source`，生产分支为 `main`；部署后核对 Ready 和对应 commit，再确认线上行为。不要绕过既有 Git 流程发布。

- 同步前看工作区与双方提交；需要同步且可快进时用 `git pull --ff-only origin main`。分叉时先分析，不强推覆盖。
- `vercel.json` 调用 `scripts/vercel-build.mjs`：检查生产变量 → 准备资源 → Next build → **仅 `VERCEL_ENV=production`** 应用待执行的前向迁移。预览和本地构建跳过迁移。
- 涉及迁移时先备份真实数据与附件；不得回滚旧备份覆盖新记录。若迁移已完成而发布失败，修复并继续兼容新版协议的发布，不能直接回到旧写入协议。
- 本轮未检查发布平台、未改配置、未触碰真实学习数据；没有已确认的线上阻塞，也没有本轮发布成功证据。

## 7. 待办、风险与下一步

- **P1｜完善可复用浏览器回归**：`scripts/test-curriculum-browser.mjs` 仍断言旧四阶段按钮等已删除界面，需按当前需求更新；将上一轮临时验收中的关键场景移入受 Git 管理的脚本，移除本机绝对路径。不要为让旧测试通过恢复冗余功能。
- **P1｜完成 Git 同步**：当前合并冲突已解决并暂存；先核对暂存差异，再完成合并提交和普通推送。两边历史都要保留，不强推。
- **P1｜发布验收（需要时）**：代码发布前完成当前构建；推送后核对实际发布提交的 Vercel 状态，在真实用户操作中确认完成状态与 PDF 打开；当前只记录本地证据。不要用测试操作写用户真实学习记录。
- **P2｜文档维护**：`source/docs/PDF打开方式.md` 等早期交付说明仍写“先弹选择窗口”及旧阶段状态；专项继续开发时定点更新，不批量重写历史。本文件当前决策优先。应用版本仍为 0.6.1，后续正式版本记录应与实际发布核对。
- **环境前提**：npm 不在当前 PATH；本地包链接已修复，Playwright 可复用 Codex 自带模块；PGlite 仍需补齐有效入口。Turbopack 本轮仍报 `@tailwindcss/node` 缺包错误，Node 直接导入该包已正常；当前以 `next dev --webpack` 完成预览，不修改应用配置。
- **范围外候选**：旧重构文档的 AI 局部建议、跨工具自动同步没有成为本轮需求；不要自行启动。当前明确要求的学习页简化已实现，无需再设计一遍。
- **下一步建议**：先核对新会话的 Git 状态及用户当前任务；若继续完善工程验收，优先修复可复用浏览器脚本；若准备发布，先核对远端和 Vercel 再验收。

## 8. 新会话启动与流量边界

在 Codex 中选择 `D:\projects\xueji` 作为项目，新建会话后发送：

> 请先读取 AGENTS.md 和 docs/HANDOFF.md，核对 git status、最近提交与相关差异，简要说明实际状态，再继续本次任务：［填写任务］。沿用已有决策，不加载完整旧聊天，不修改无关代码。

长期规则只维护于根 `AGENTS.md`。工具优先本地运行、只返回必要片段，能减少不必要的上下文和主动网络请求，但不能保证传输字节数、计费或用量下降比例；缩短回答也不等于同比减少网络流量。客户端的历史装载、自动压缩、缓存、同步、更新、重试和请求传输不由仓库 Markdown 配置。实际流量需独立测量；本次未修改 Codex 全局设置、代理或网络路由。规则加载范围参考 [OpenAI 官方说明](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。
