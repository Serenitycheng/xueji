# PDF 资料打开方式

状态：本地实现，尚未发布。

- 学习路线中的“打开教材 / 打开方案原件”、资料库的 PDF 原件和学习方向的 PDF 附件引用使用同一选择窗口。
- 每次打开默认选择 **PDF-XChange Editor**；也可以选择浏览器新标签页，或下载后在 Windows 中选择其他应用。
- 路线提供的 PDF 页序通过官方 pxce 协议传递，浏览器模式继续使用 #page=N；下载后需要手动跳页。
- 本机需要 PDF-XChange Editor 10.4 或更新版本及正常的 pxce 协议注册。浏览器可能要求确认启动应用；取消后仍可选择其他方式。
- 阅读器中的批注或编辑请另存为本地文件，不会自动覆盖云端原件。手机可使用浏览器或下载。

## 私有资料与兼容

登录后由 POST /api/pdf-open 为当前 PDF 生成 5 分钟打开授权。授权仅允许读取该原件，不能读取提取正文、其他资料或作为登录凭据；更换访问密码后旧授权失效。阅读器不接收浏览器会话 Cookie。原附件接口仍检查资料归属，文件不改成公开 Blob。

选择打开方式不写学习状态，不修改路线位置、下一步或掌握判断，无数据库迁移和写入协议变更。非 PDF 文件、网页和 Obsidian 链接沿用原流程。

## 验证

- node scripts/test.mjs：含单文件授权、过期、篡改、跨资料访问和会话隔离检查。
- node scripts/test-pdf-open-local.mjs：实际 API 与隔离 PGlite，验证鉴权、下载原始字节、开发方案及学习状态不变。
- node scripts/test-curriculum-browser.mjs：真实页面与隔离接口，验证默认选项、页码、下载名称、失败重试及桌面/390px 手机布局。
- 测试依赖入口沿用 STUDY_PGLITE、STUDY_PLAYWRIGHT；不要使用生产数据做验收。
- 本机 PDF-XChange Editor 11 已通过 pxce 调用成功从本地测试服务读取 PDF；已传递第 2 页参数，未通过原生界面视觉核验最终页码。线上真实教材需发布后再核验。

官方参考：[pxce 协议说明](https://forum.pdf-xchange.com/viewtopic.php?t=42687)、[10.4 的 PDF 打开参数支持](https://www.pdf-xchange.com/product/pdf-xchange-editor/history?build=10.4.1.389%7C10.4.0.388)。
