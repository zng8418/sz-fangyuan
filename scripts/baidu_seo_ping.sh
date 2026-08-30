#!/usr/bin/env bash
# 百度 SEO 自动 ping 器 (本地 cron 兜底)
# 用法:
#   1. 直接跑: bash baixu_seo_ping.sh
#   2. cron 定时: 0 8,14,20 * * * cd /home/szjacky/.openclaw/workspace/baixing-auto && bash scripts/baidu_seo_ping.sh >> /var/log/baidu-ping.log 2>&1
#
# 推送渠道 (按可行性):
#   - IndexNow: 无需 token, HTTP 202 → 必应/Yandex/DuckDuckGo 立刻抓
#   - Yandex: 无需 token, HTTP 200 OK
#   - 百度 ping RPC2: 接口在, 但 500 错误
#   - 百度主动推送: 需 token (等耿哥从 ziyuan.baidu.com 拿)

set -uo pipefail

SITE="https://bx.szjacky.com/"
SITEMAP="https://bx.szjacky.com/sitemap.xml"
INDEXNOW_KEY="4f5a36…8c35"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"

# 准备 URL 列表 (从 sitemap 抓)
URLS=$(curl -sS --connect-timeout 5 --max-time 10 "$SITEMAP" 2>/dev/null \
    | grep -oE '<loc>[^<]+</loc>' \
    | sed 's|<loc>||g; s|</loc>||g' \
    | head -20)
if [[ -z "$URLS" ]]; then
    URLS="$SITE"
fi
URL_COUNT=$(echo "$URLS" | wc -l)

echo "$LOG_PREFIX ===== 百度 SEO ping 启动 ($URL_COUNT URL) ====="

# ---- 1. IndexNow ----
echo "$LOG_PREFIX [1/4] IndexNow (Bing/Yandex/DuckDuckGo)..."
PAYLOAD=$(python3 -c "
import json
urls = '''$URLS'''.strip().split('\n')
urls = [u for u in urls if u]
print(json.dumps({
    'host': 'bx.szjacky.com',
    'key': '$INDEXNOW_KEY',
    'keyLocation': f'https://bx.szjacky.com/$INDEXNOW_KEY.txt',
    'urlList': urls
}, ensure_ascii=False))
")
RESP=$(curl -sS -i -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json; charset=utf-8" \
    --connect-timeout 8 --max-time 15 \
    -d "$PAYLOAD" 2>&1 | head -3)
if echo "$RESP" | grep -q "HTTP/.* 202\|HTTP/.* 200"; then
    echo "$LOG_PREFIX   ✅ IndexNow: $(echo "$RESP" | head -1)"
else
    echo "$LOG_PREFIX   ❌ IndexNow: $(echo "$RESP" | head -1)"
fi

# ---- 2. Yandex ----
echo "$LOG_PREFIX [2/4] Yandex..."
RESP=$(curl -sS -i -X POST "http://webmaster.yandex.com/ping" \
    --connect-timeout 8 --max-time 12 \
    -d "sitemap=$SITEMAP" 2>&1 | head -3)
if echo "$RESP" | grep -q "HTTP/.* 200"; then
    echo "$LOG_PREFIX   ✅ Yandex: $(echo "$RESP" | head -1)"
else
    echo "$LOG_PREFIX   ❌ Yandex: $(echo "$RESP" | head -1)"
fi

# ---- 3. 百度 ping RPC2 (xml-rpc) ----
echo "$LOG_PREFIX [3/4] 百度 ping RPC2..."
RESP=$(curl -sS -i -X POST "http://ping.baidu.com/ping/RPC2" \
    -H "Content-Type: text/xml" \
    -H "User-Agent: Mozilla/5.0" \
    --connect-timeout 8 --max-time 12 \
    -d '<?xml version="1.0" encoding="UTF-8"?><methodCall><methodName>weblogUpdates.ping</methodName><params><param><value>https://bx.szjacky.com/</value></param></params></methodCall>' 2>&1 | head -3)
echo "$LOG_PREFIX   百度 ping: $(echo "$RESP" | head -1)"

# ---- 4. 百度主动推送 (有 token 才有, 否则跳过) ----
echo "$LOG_PREFIX [4/4] 百度主动推送..."
BAIDU_TOKEN_FILE="$HOME/.openclaw/secrets/baidu-seo-token"
if [[ -f "$BAIDU_TOKEN_FILE" ]]; then
    BAIDU_TOKEN=$(cat "$BAIDU_TOKEN_FILE")
    BAIDU_SITE="$SITE"
    RESP=$(curl -sS -X POST "http://data.zz.baidu.com/urls?site=$BAIDU_SITE&token=***" \
        --connect-timeout 8 --max-time 30 \
        -d "$URLS" 2>&1)
    echo "$LOG_PREFIX   百度主动推送响应: $RESP"
else
    echo "$LOG_PREFIX   ⏭️  跳过 (无 token 文件, 等耿哥配置)"
fi

echo "$LOG_PREFIX ===== 完成 ====="
echo ""