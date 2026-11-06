# 百度站长平台验证文件部署

## 方式 A: GitHub Action（推荐）

1. **登录百度站长平台** → [ziyuan.baidu.com](https://ziyuan.baidu.com)
2. **添加站点** → `https://bx.szjacky.com/` → 选"文件验证"
3. **下载验证 HTML 文件**（如 `baidu_verify_AbCdEf.html`）
4. **打开文件**，复制**完整内容**（包括 `<html>` 到 `</html>`）
5. **GitHub Action 触发**：
   - 进入本 repo → Actions → "百度站长平台验证文件部署" → Run workflow
   - 填入：filename（验证文件名）+ content（完整 HTML 内容）
   - 点 Run → 1-2 分钟后 GitHub Pages 自动部署
6. **回到百度站长平台** → 文件可访问 → 点"完成验证"
7. **提交 sitemap** → 链接提交 → sitemap → `https://bx.szjacky.com/sitemap.xml`

## 方式 B: 本地一键脚本（更快）

```bash
# 1. 下载验证文件
# 2. 跑脚本（任一方式）
bash docs/deploy_baidu_verify.sh baidu_verify_AbCdEf.html /path/to/file.html
bash docs/deploy_baidu_verify.sh baidu_verify_AbCdEf.html "$(cat /path/to/file.html)"
```

## 验证通过后

- 自动推送 JS（已埋 `push.zhanzhang.baidu.com/push.js`）会持续推送
- 提交 sitemap → 1-3 天开始收录
- 1 周内 50% 以上页面被收录