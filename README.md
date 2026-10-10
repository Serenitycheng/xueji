# 学迹

学迹（原名学序）是个人学习工作台：记录学到哪里、卡在哪里，以及下一步做什么。当前应用版本为 0.6.1；更名沿用已有账号、路线、记录与草稿。

## 现有能力与边界

- 六个学习方向的分层路线、具体小节、教材与课程位置；记录停点、卡点、学习结果和下一步。
- 资料、网页、本地路径与笔记索引；学习回看、方向暂停与归档。基础学习流程无需 AI。
- 云端版本、内容历史、保存回执和冲突保护；未提交的学习记录可保留为本机草稿。
- PDF、PPTX、DOCX、TXT、Markdown 与课程链接导入。资料处理需电脑处理器；扫描件 OCR、公式和复杂图表仍需核对原件。视频链接不会自动取得全部正文。
- 旧课表、任务与计划保留在旧记录中；当前学习工作台不自动生成全日排程。复制行动到序流只复制摘要，不自动创建外部任务。
- 仅供个人使用，无公开注册。尚无完全离线启动的 PWA；本机草稿不等于云端保存成功。AI 局部建议与跨工具自动同步不属于当前已启用能力。

## 技术栈与运行

Next.js 16、React 19、TypeScript；Neon PostgreSQL、Drizzle、Vercel 私有 Blob，服务端使用签名会话与加密配置。

需要 Node.js 22.13+ 与 npm。应用在 `source/`，从仓库根目录执行：

```powershell
cd source
npm ci
# 先配置自己的开发数据库与环境变量，再应用迁移
npm run db:migrate
npm run dev
```

默认访问 `http://localhost:3000`。验证与生产运行：

```powershell
node scripts/test.mjs
node scripts/test-learning-local.mjs
npx tsc --noEmit
npm run lint
npm run build
npm start
```

迁移只能在已确认的目标数据库执行。不要将恢复快照回灌到现有学习库。

## 环境变量与部署

在 `source/.env.local` 或 Vercel 配置以下服务端变量：

- `DATABASE_URL`：PostgreSQL 连接。
- `BLOB_READ_WRITE_TOKEN`：私有原文件存储。
- `STUDY_ENCRYPTION_KEY`：32 字节随机密钥的 Base64 表示。
- `SESSION_SECRET`：至少 32 字符的会话密钥。
- `STUDY_PASSWORD_HASH`：`salt:hash` 格式的 scrypt 密码哈希。

可选电脑处理器使用 `STUDY_SITE_URL`、`STUDY_HTTPS_PROXY`；使用前核对目标站点。AI 连接由应用加密保存，不需要把 API Key 写进 README。

已有 Vercel 项目名为 `xuexu-study`。Git 部署使用 `main`，Root Directory 为 `source`；`source/vercel.json` 的 `node scripts/vercel-build.mjs` 先准备资源、构建，仅正式环境执行待应用的前向迁移。部署前备份真实数据与附件，部署后核对提交及结果；预览与本地构建不自动迁移数据库。

详见[应用说明](source/README.md)、[资料处理与学习流程](source/docs/learning-flow-030.md)和[学习路线说明](source/docs/六方向学习路线接入说明.md)。`archive/recovery/` 保存历史源码、数据库与附件，包含私有内容；这些快照不代表当前线上数据，公开前需要单独审查。
