#!/usr/bin/env bash
# 百度站长平台验证文件一键部署到 sz-fangyuan GitHub Pages
# 用法:
#   1. 登录 https://ziyuan.baidu.com → 添加站点 → 选"文件验证" → 下载验证 HTML
#   2. 跑这个脚本: bash deploy_baidu_verify.sh <验证文件名> <验证文件内容或路径>
#      例: bash deploy_baidu_verify.sh baidu_verify_AbCdEf.html "百度站长平台验证" 
#      例: bash deploy_baidu_verify.sh baidu_verify_AbCdEf.html /path/to/baidu_verify_AbCdEf.html

set -euo pipefail

# ---- 配置 ----
REPO="zng8418/sz-fangyuan"
BRANCH="main"
GH_TOKEN="${GH_TOKEN:-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}"  # GitHub PAT (TOOLS.md)
API_BASE="https://api.github.com"

# ---- 入参 ----
if [[ $# -lt 2 ]]; then
    echo "用法: bash $0 <验证文件名> <验证文件内容或路径>"
    echo "  例: bash $0 baidu_verify_AbCdEf.html '<html>...</html>'"
    echo "  例: bash $0 baidu_verify_AbCdEf.html /path/to/baidu_verify_AbCdEf.html"
    exit 1
fi

FILENAME="$1"
CONTENT_INPUT="$2"

# 判断内容是文件路径还是直接内容
if [[ -f "$CONTENT_INPUT" ]]; then
    echo "📂 从文件读取: $CONTENT_INPUT"
    CONTENT=$(cat "$CONTENT_INPUT")
elif [[ -f "$PWD/$CONTENT_INPUT" ]]; then
    echo "📂 从文件读取: $PWD/$CONTENT_INPUT"
    CONTENT=$(cat "$PWD/$CONTENT_INPUT")
else
    echo "📝 直接使用入参内容"
    CONTENT="$CONTENT_INPUT"
fi

# 统计
SIZE=$(echo -n "$CONTENT" | wc -c)
echo "📄 文件名: $FILENAME"
echo "📄 大小:   $SIZE bytes"
echo "📄 前 80 字符: $(echo -n "$CONTENT" | head -c 80)"

# ---- 确认 ----
echo ""
read -rp "确认部署到 $REPO (分支 $BRANCH)? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# ---- 调 GitHub API 创建/更新文件 ----
echo ""
echo "🚀 部署到 GitHub..."

# 1. 先查 sha（如果文件已存在就需要提供）
SHA=$(curl -sS -H "Authorization: token $GH_TOKEN" \
    "$API_BASE/repos/$REPO/contents/$FILENAME" \
    | python3 -c "import json, sys; d=json.load(sys.stdin); print(d.get('sha',''))" 2>/dev/null || echo "")

# 2. base64 编码
CONTENT_B64=$(echo -n "$CONTENT" | base64 -w 0)

# 3. 构造 payload
if [[ -n "$SHA" ]]; then
    PAYLOAD=$(python3 -c "import json; print(json.dumps({
        'message': '✅ Add Baidu site verification: $FILENAME',
        'content': '$CONTENT_B64',
        'sha': '$SHA',
        'branch': '$BRANCH',
    }))")
    echo "📝 文件已存在 ($SHA)，更新"
else
    PAYLOAD=$(python3 -c "import json; print(json.dumps({
        'message': '✅ Add Baidu site verification: $FILENAME',
        'content': '$CONTENT_B64',
        'branch': '$BRANCH',
    }))")
    echo "📝 新建文件"
fi

# 4. 调 API
RESP=$(curl -sS -X PUT \
    -H "Authorization: token $GH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$API_BASE/repos/$REPO/contents/$FILENAME")

# 5. 解析结果
COMMIT_URL=$(echo "$RESP" | python3 -c "import json, sys; d=json.load(sys.stdin); print(d.get('commit', {}).get('html_url', ''))" 2>/dev/null || echo "")
ERROR=$(echo "$RESP" | python3 -c "import json, sys; d=json.load(sys.stdin); print(d.get('message', ''))" 2>/dev/null || echo "")

if [[ -n "$COMMIT_URL" ]]; then
    echo "✅ 部署成功!"
    echo "🔗 Commit: $COMMIT_URL"
    echo "🌐 验证文件 URL: https://zng8418.github.io/sz-fangyuan/$FILENAME"
    echo ""
    echo "📋 下一步:"
    echo "  1. 等待 1-2 分钟 GitHub Pages 部署"
    echo "  2. 访问 https://zng8418.github.io/sz-fangyuan/$FILENAME 确认能访问"
    echo "  3. 回到百度站长平台点'完成验证'"
    echo "  4. 验证通过后 → '链接提交' → 'sitemap' → 填 https://zng8418.github.io/sz-fangyuan/sitemap.xml"
else
    echo "❌ 失败: $ERROR"
    echo "响应: $RESP"
    exit 1
fi