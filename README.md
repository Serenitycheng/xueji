# 学迹（原名学序） — 项目与恢复备份

当前应用名为“学迹”，版本 0.6.1。新会话从 [开发交接](docs/HANDOFF.md) 与 [开发规则](AGENTS.md) 开始；运行与 Git 发布流程见 [应用 README](source/README.md)。日常开发目录为 `source/`。

以下保留 2026-09-09 的恢复快照说明，部署、数量与统计均是历史状态。恢复档案现已集中在 `archive/recovery/`；下文的 `data/`、`attachments/`、`docs/`、`history/`、`legacy/`、`recovered/` 与核验脚本路径均应在该目录下查找，不是根目录新建的开发交接文档。

本次恢复基于 2026-09-09 仍可访问的 Vercel 部署、数据服务和原始 Git 文件。目标仓库保持私有：Serenitycheng/xuexu-recovery。

## 当前线上版本

`source/` 是当前生产部署的原始源码和素材，共 **149 个文件**。部署 ID：`dpl_39k1imZJj4juSoCe4pmoY5CXW6VA`。文件均与 Vercel 文件 ID（原内容 SHA-1）逐个核对，同时记录 SHA-256。`docs/vercel-source-manifest.json` 保存完整清单及空目录信息。历史版本单独存放。

## 数据和附件

数据库最新导出位于 `data/cloud-2026-09-09/`。PostgreSQL 使用只读、可重复读事务导出，结构、约束、索引、序列、视图和策略也已保存。加密业务配置保持原密文。

- drizzle.__drizzle_migrations：4 行。
- public.study_ai_calls：18 行。
- public.study_ai_locks：0 行。
- public.study_history：19 行。
- public.study_login_attempts：1 行。
- public.study_material_jobs：2 行。
- public.study_material_pages：0 行。
- public.study_profiles：1 行。
- public.study_receipts：22 行。
- public.study_secrets：1 行。

全部 7 个对象，共 156275428 字节，按原路径保存，逐文件 SHA-256 已验证。

## 历史版本

- xuexu-study：10 个仍保留的部署。

legacy/chatgpt-sites-2026-09-07/ 保存 Sites 历史源码 105 个文件、3 个 Git 提交，以及旧数据库 3 条 study_profiles；其余 3 张旧表为空。

## 文件位置与核验

- `source/`：当前生产版本的全部已上传项目文件。
- `data/cloud-2026-09-09/`：最新业务数据快照和数据库结构。
- `attachments/files/`：附件原路径副本（存在附件时）；`attachments/manifest.json` 记录全量清单和哈希。
- `history/vercel/`：Vercel 仍保留的历史部署源码、素材及各版本文件清单。
- `legacy/`：原始 Git/Sites 历史、可验证 bundle 与源码。
- 原有 ZIP、分卷和 `SHA256SUMS.txt` 原样保留。`recovered/` 是这些早期备份的展开副本，其中源码曾不完整，以 `source/` 为当前版本。
- `VERIFY.py` 校验本次整个仓库；运行 `python VERIFY.py`。`RESTORE.py`（如存在）仅用于旧的初始压缩包。

## 恢复边界与运行配置

本仓库保存上述来源当前实际保留且可读取的内容。已删除的部署、未上传的本机文件、未同步的浏览器本地状态不在这些来源中，无法据此断言它们已恢复。Vercel 历史清单包含失败构建仍保存的源码。

服务密钥、访问令牌、浏览器 Cookie、登录会话未提交。北京项目中误上传的浏览器凭据目录已排除，并在部署清单中记录。环境变量名称和作用域见 `docs/environment-variable-names.json`；重新运行需通过原服务账号重新配置密钥，Vercel 的 sensitive 值不能读取。学序已加密配置保留原密文，解密仍依赖原环境中的加密密钥。

站点未重新部署，业务数据库及原项目内容未改动。数据库和附件为导出时的快照，不包含导出后新写入的业务数据。
