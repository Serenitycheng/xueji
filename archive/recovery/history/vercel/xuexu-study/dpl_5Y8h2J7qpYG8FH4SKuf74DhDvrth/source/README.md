# 学序 · Vercel 版

管理线性代数、概率统计、日语和摄影的个人学习工作台。电脑与手机浏览器共用同一份云端记录。DeepSeek 负责路线方案、任务和简短建议，完成与验证结果分别记录。

## 使用

1. 用本机设置页中创建的个人访问密码登录。
2. 在「偏好与 AI 设置」连接或更新 DeepSeek API Key，月预算默认100元。
3. 在「时间安排」导入CSV课表、映射列名并设置作息；课程开始和结束使用 HH:mm。
4. 在「资料库」导入教材、课件或添加课程链接。单文件最多20MB，原文件保存在私有存储。
5. 设置四科目标、基础与考试日期，生成并选择路线，然后安排每日任务。
6. 完成任务后填写反馈与简短验证；临时有事可调整当天学习额度。

## 运行

需要 Node.js 22.13+。执行 `npm install`，参考 `.env.example` 配置以下服务端变量：

- `DATABASE_URL`：Neon PostgreSQL连接地址。
- `BLOB_READ_WRITE_TOKEN`：Vercel私有Blob存储凭据。
- `STUDY_ENCRYPTION_KEY`：32字节随机密钥的Base64表示。
- `SESSION_SECRET`：至少32字符的随机会话密钥。
- `STUDY_PASSWORD_HASH`：`salt:hash`，salt为随机16字节的hex，hash为Node scrypt(password,salt,64)的hex。

变量不得使用 `NEXT_PUBLIC_` 前缀，不应提交到版本库。API Key使用AES-GCM加密后存储在数据库，不会返回客户端。密码只存储加盐哈希。更换密码哈希会使原登录会话失效。

数据库通过 `db/vercel-schema.ts` 与 `drizzle-vercel/` 管理。先运行 `npm run db:migrate`，再运行 `npm run dev`。生产使用 `npm run build` 与 `npm start`。修改结构后运行 `npm run db:generate` 并审核迁移。

发布前先 `vercel link` 关联正确团队与项目，配置生产环境变量，再执行 `vercel --prod`。Vercel配置使用私有Blob直传，较大的教材不会经过普通函数请求体。学习记录使用版本号检查，避免不同设备互相覆盖。

`node scripts/test.mjs` 检查课表、任务重排、反馈去重与材料引用；`npx tsc --noEmit` 和 `npm run build` 检查类型与构建。

## 当前范围

- 支持PDF、PPTX、DOCX、TXT、Markdown和课程链接。PDF最多提取500页、约80万字符；扫描PDF需要补充文字，不含OCR。课件提取主要文字，不解读图表。
- 视频链接不会自动获取全部视频正文；补充目录或字幕后可更准确地定位。
- 资料内容作为参考数据处理，不能覆盖规划指令。具体页码、视频时间需要可核对的正文依据。
- AI调用费用按返回用量及已知单价估算，超时预留费用上限，实际扣费以DeepSeek账单为准。
- 短测用于辅助判断，不等同于完整学科掌握比例。
- 第一版仅供个人使用，无公开注册；访问密码需妥善保存。忘记密码时在Vercel更新密码哈希。

原Sites版本保留在独立工作目录中；本目录为Vercel迁移版本。
