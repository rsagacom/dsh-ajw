#!/usr/bin/env bash
# DS安甲网 · DNS 就绪验收脚本
# 用法: bash scripts/verify-dns.sh
# 检查 ds.ajw.cn 解析 -> GitHub Pages 自定义域状态 -> 提示下一步
set -u

DOMAIN="ds.ajw.cn"
PAGES_HOST="rsagacom.github.io"

echo "== 1. DNS 解析检查 =="
CNAME=$(curl -s --max-time 15 "https://cloudflare-dns.com/dns-query?name=${DOMAIN}&type=CNAME" -H "accept: application/dns-json")
if echo "$CNAME" | grep -q '"data"'; then
  echo "✓ CNAME 记录已存在:"
  echo "$CNAME" | grep -o '"data":"[^"]*"' | head -2
else
  echo "✗ ${DOMAIN} 尚无 CNAME 记录（NXDOMAIN）"
  echo "  请在 Cloudflare -> ajw.cn -> DNS 添加:"
  echo "    类型 CNAME | 名称 ds | 目标 ${PAGES_HOST} | 代理: 开启(橙色云) | TTL 自动"
  exit 1
fi

echo ""
echo "== 2. 解析结果探测 =="
RESOLVED=$(curl -s --max-time 20 -o /dev/null -w "%{http_code}" "https://${DOMAIN}/")
echo "https://${DOMAIN}/ -> HTTP ${RESOLVED}"

echo ""
echo "== 3. GitHub Pages 自定义域状态 =="
if command -v gh >/dev/null 2>&1; then
  gh api repos/rsagacom/dsh-ajw/pages 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('cname:', d.get('cname'), '| html_url:', d.get('html_url'))
if d.get('cname') != 'ds.ajw.cn':
    print('自定义域未生效: 需要 DNS 生效后重新触发一次 Pages 部署')
    print('执行: gh workflow run daily-crawl.yml --repo rsagacom/dsh-ajw')
"
else
  echo "gh CLI 不可用, 请手动查看仓库 Settings -> Pages"
fi

echo ""
echo "== 4. 验收清单 =="
echo "  [ ] https://ds.ajw.cn/ 返回 200 且标题为『DS安甲网』"
echo "  [ ] 卡片显示中文简介与一键安装命令"
echo "  [ ] manual.html 手册页可打开"
echo "  [ ] HTTPS 证书正常（Cloudflare Edge 证书）"
