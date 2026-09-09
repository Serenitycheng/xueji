# 学序恢复备份

恢复日期：2026-09-09。原项目：xuexu-study（Vercel）。

## 当前已保存

- data-2026-09-09.zip：业务数据 CSV / JSON、历史记录及列结构。
- study_profiles：1 条；study_history：19 条；study_ai_calls：18 条；study_material_jobs：2 条；study_receipts：22 条。
- study_material_pages：查询时为 0 条；这不代表附件内容丢失，附件需单独检查。

## 待补齐

源码、附件、完整数据库约束与索引仍在恢复中。本次提交是中间备份，不代表完整恢复。

## 数据边界

未包含 API 密钥、密码、活动会话、验证凭据。原云端资源未被修改。恢复时需重新配置数据库与文件存储连接。
