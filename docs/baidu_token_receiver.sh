#!/usr/bin/env bash
# 百度主动推送 token 接收器
# 耿哥拿到 token 后跑这个脚本，自动:
#   1. 配置 GitHub Actions secret (BAIDU_TOKEN + BAIDU_SITE)
#   2. 立即推送所有 10 个 URL 到 data.zz.baidu.com
#   3. 报告推送结果
#
# 用法:
#   bash docs/baidu_token_receiver.sh <site_url> <token>
#   例: bash docs/baidu_token_receiver.sh "https://zng8418.github.io/sz-fangyuan/" "abcd1234yourtoken"
#
# 拿 token 的方法:
#   1. 登录 https://ziyuan.baidu.com
#   2. 添加站点 zng8418.github.io/sz-fangyuan
#   3. 验证站点（HTML 标签 / 文件 / DNS 任一）
#   4. 链接提交 → 主动推送 → 复制 token（"接口调用地址" 里的 token= 后面的字符串）

set -euo pipefail

REPO="zng8418/sz-fangyuan"
API_BASE="https://api.github.com"

if [[ $# -lt 2 ]]; then
    echo "用法: bash $0 <site_url> <token>"
    echo "  例: bash $0 'https://zng8418.github.io/sz-fangyuan/' 'abcd1234xxx'"
    echo ""
    echo "拿 token 步骤:"
    echo "  1. https://ziyuan.baidu.com → 添加站点 → 验证 (HTML 标签最简单)"
    echo "  2. 链接提交 → 主动推送 → 复制 token"
    exit 1
fi

SITE="$1"
TOKEN="$2"

echo "🔧 百度主动推送 token 接收器"
echo "  site:  $SITE"
echo "  token: ${TOKEN:0:8}...${TOKEN: -4} (len=${#TOKEN})"
echo ""

# ---- 1. 配置 GitHub Actions secrets ----
echo "=== 1. 配置 GitHub Action secrets ==="
echo "$SITE" | gh secret set BAIDU_SITE -R "$REPO" 2>&1 && echo "  ✅ BAIDU_SITE"
echo "$TOKEN" | gh secret set BAIDU_TOKEN -R "$REPO" 2>&1 && echo "  ✅ BAIDU_TOKEN"
echo ""

# ---- 2. 立即推送所有 URL ----
echo "=== 2. 立即推送所有 URL 到百度 ==="
URLS="https://zng8418.github.io/sz-fangyuan/
https://zng8418.github.io/sz-fangyuan/宝安石岩元径村统建楼4房120平电梯11楼-2639296461.html
https://zng8418.github.io/sz-fangyuan/石岩元径村统建楼带大绿本可村委过户-2639303615.html
https://zng8418.github.io/sz-fangyuan/宝安石岩小产权统建楼4房120平电梯-2639310160.html
https://zng8418.github.io/sz-fangyuan/宝安石岩小产权统建楼4房120平电梯-2639310187.html
https://zng8418.github.io/sz-fangyuan/双地铁口石岩统建楼4房120平带电梯-2639313373.html
https://zng8418.github.io/sz-fangyuan/双地铁石岩统建楼4房120平带大绿本村委过户-2639320397.html
https://zng8418.github.io/sz-fangyuan/宝安石岩元径村统建楼4房120平电梯11楼-2639321705.html
https://zng8418.github.io/sz-fangyuan/石岩统建楼4房120平仅128万地铁口-2639327404.html
https://zng8418.github.io/sz-fangyuan/双地铁口石岩统建楼4房120平带电梯-2639327713.html
https://zng8418.github.io/sz-fangyuan/双地铁口石岩统建楼4房120平带电梯-2639327717.html"

RESP=$(curl -sS -X POST "http://data.zz.baidu.com/urls?site=$SITE&token=$TOKEN" \
    -H "Content-Type: text/plain" \
    --connect-timeout 8 --max-time 30 \
    -d "$URLS" 2>&1)
echo "百度响应: $RESP"
echo "(正常格式: {\"success\":N,\"remain\":M,\"not_same_site\":[...],\"not_valid\":[...]})"
echo ""

# ---- 3. 触发 GitHub Action 立即跑一次 ----
echo "=== 3. 触发 GitHub Action 立即跑一次 ==="
echo "(auto-submit.yml 也会每天 8/14/20 UTC 自动跑)"
echo "去 https://github.com/$REPO/actions 手动 Run 一次更稳妥"
echo ""

echo "✅ 完成!"
echo "  现在百度每天 0/8/14/20 UTC 自动主动推送"
echo "  1 周后查 site: 命令看收录情况"
