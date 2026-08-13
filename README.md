# DS安甲网 · ds.ajw.cn

> **为你的 DeepSeek Harness 机器人 安装上所需功能的装甲吧** —— 每日聚合 GitHub 上 DeepSeek Harness / DSH 生态的开源项目：插件、主题皮肤、工具、Skill 与 Awesome 列表，一站式逛超市。

![stack](https://img.shields.io/badge/stack-Node.js%20%2B%20%E9%9D%99%E6%80%81%E7%AB%99-blue) ![updates](https://img.shields.io/badge/%E6%9B%B4%E6%96%B0-%E6%AF%8F%E6%97%A5%2010%3A30%20(UTC%2B8)-green)

## 特性

- **每日自动抓取**：围绕 `deepseek-harness`、`topic:dsh-plugin`、`dsh plugin`、`deepseek skill` 等关键词调用 GitHub 官方搜索 API，融合 [awesome-deepseek-harness](https://github.com/0xsline/awesome-deepseek-harness) 等精选列表
- **外文介绍自动翻译**：所有非中文项目简介自动译为简体中文（Google 免费翻译接口为主、MyMemory 兜底、本地缓存译文入库），页面悬停可查看原文
- **智能过滤与评分**：相关度评分 + 去重 + 去 fork/归档，剔除同名噪音项目（如名为 dsh 的其他工具）
- **需求导向中文分类**（机甲式命名）：原厂核心 / 编队协作 / 驾驶舱与涂装 / 记忆与检索 / 操控与装填 / 感知与遥控 / 动力与感知核心 / 工程与检修 / 通讯与广播 / 个性化改装 / 机体与座舱 / 兵工厂车间 / 通用工具架 / 装甲图鉴 / 外挂武器库 —— 每类附专业介绍与检索词
- **一键安装命令**：每张卡片附可复制的组装指令（`dsh plugin add "github:owner/repo"` / `git clone` / `npx`），一键复制粘贴给 Agent 即可安装
- **新手机师手册**（`manual.html`）：依据官方项目介绍编写的通俗入门手册，维修手册风格 UI，含基础概念、官方安装、装甲装配与货架导览
- **社群入口**：BBS 与微信群二维码两个频道占位，改 `site/community-config.js` 即可上线
- **每日新增角标**：对比 30 天历史快照，标记「新增」项目
- **零构建前端**：纯原生 HTML/CSS/JS 机甲机库主题（前线任务 SFC 风格：铆钉面板 / CRT 扫描线 / HUD 读数），响应式 + 无障碍（焦点环 / 减少动态效果 / 键盘导航），任何静态服务器可托管
- **Cloudflare 友好**：域名由 Cloudflare 管理时，抓取完成后自动调用 purge_cache 清理边缘缓存

## 目录结构

```
dsh-ajw/
├── crawler/
│   ├── fetch.mjs          # 每日抓取器（Node 18+，零依赖）
│   ├── config.mjs         # 关键词 / 精选种子 / 分类与评分规则
│   ├── translate.mjs      # 外文介绍自动翻译（品牌词保护 + 缓存入库）
│   └── package.json
├── site/                  # 站点根目录（部署的最小单元）
│   ├── index.html         # 机库首页（检索 / 筛选 / 复制安装命令 / 社群入口）
│   ├── manual.html        # 新手机师手册（维修手册 UI）
│   ├── community-config.js# 社群入口配置（BBS 地址 / 微信群二维码）
│   ├── assets/css/style.css   # 机库主题
│   ├── assets/css/manual.css  # 手册样式
│   ├── assets/js/app.js       # 首页逻辑
│   ├── assets/js/manual.js    # 手册逻辑（货架导览）
│   ├── data/              # 生成的数据（勿手改）
│   │   ├── projects.json        # 规范化 JSON
│   │   ├── projects.data.js     # 前端加载的 JS 包装
│   │   └── history/             # 最近 30 天快照
│   └── CNAME              # ds.ajw.cn
├── deploy/
│   ├── nginx-ds.ajw.cn.conf    # 源站 nginx 配置（Cloudflare 感知）
│   └── ds-ajw.cron             # 服务器 crontab 示例
└── .github/workflows/daily-crawl.yml  # GitHub Actions 每日抓取
```

## 社群入口上线

编辑 `site/community-config.js`：

```js
window.DSH_COMMUNITY = {
  bbs: { name: '在线社区 BBS', url: 'https://bbs.example.com', ... },   // 填入 URL 即点亮「进入论坛」
  wechat: { name: '微信交流群', qr: 'assets/img/wechat-qr.png', ... }, // 把二维码图片放入 site/assets/img/ 即自动点亮
}
```

## 快速开始

```bash
# 1. 首次抓取（可选 GITHUB_TOKEN 提高限额）
cd crawler && node fetch.mjs

# 2. 本地预览
python3 -m http.server 8080 --directory ../site
# 打开 http://localhost:8080
```

抓取器零依赖（仅用 Node 内置 `fetch`），未认证限额：搜索 10 次/分钟、核心 60 次/小时，脚本已内置限速；配置 `GITHUB_TOKEN` 后限额大幅提高、抓取更快更全。

## 每日自动抓取（二选一）

### 方案 A：GitHub Actions（推荐）

将仓库推送到 GitHub 后，`.github/workflows/daily-crawl.yml` 每天 UTC 02:30（北京 10:30）自动运行：抓取 → 提交数据 → 部署 Pages。首次使用需在仓库 Settings → Pages 中把 Source 设为 **GitHub Actions**；如需 Cloudflare 清理缓存，在 Settings → Secrets and variables → Actions 添加 `CF_API_TOKEN`、`CF_ZONE_ID`。

### 方案 B：源站 crontab

把 `deploy/ds-ajw.cron` 内容合入服务器 crontab（`crontab -e`），按需配置 `GITHUB_TOKEN` / `CF_API_TOKEN` / `CF_ZONE_ID` 环境变量。

## 部署到 ds.ajw.cn（Cloudflare 管理域名）

前提：`ajw.cn` 已托管到 Cloudflare；有一台源站服务器（或使用 GitHub Pages 作为源站）。

**方案 1：源站服务器 + Cloudflare 代理（推荐）**

1. **源站 nginx**：安装 `deploy/nginx-ds.ajw.cn.conf`，将 `root` 指向本仓库 `site/` 目录，`nginx -t && systemctl reload nginx`。
2. **Cloudflare 源站证书**：面板 SSL/TLS → Origin Server → Create Certificate（15 年），下载后放到配置中 `ssl_certificate` 路径。
3. **Cloudflare DNS**：添加记录
   - 类型 `A`，名称 `dsh`，内容 `源站IP`，**代理开启（橙色云）**。
4. **SSL/TLS 模式**：设为 **Full (strict)**。
5. **缓存**：`/data/` 目录 nginx 已设 `max-age=3600`；配合抓取器的 `CF_API_TOKEN`（需 Zone → Cache Purge 权限）每次更新后即时清缓存。
6. 验证：`curl -I https://ds.ajw.cn/` 应返回 `200` 且带 `CF-Ray` 头。

**方案 2：GitHub Pages + Cloudflare**

Pages 部署后，在 Cloudflare DNS 添加 `CNAME` 记录：名称 `dsh`，内容 `<user>.github.io`，代理开启（橙云）即可；`site/CNAME` 已内置。若 Pages 与 Cloudflare 同时校验 CNAME，可先在 Pages 面板关闭自定义域强制校验。

## 数据说明

- **来源**：GitHub Search API（9 组关键词 × 最多 200 条/组）+ 精选种子 + awesome 列表 README 解析（未认证模式最多补拉 12 个仓库）
- **收录规则**：剔除 fork、已归档、星数 < 1；保留相关度 ≥ 5 的项目；精选列表成员直接收录
- **分类**：规则匹配见 `crawler/config.mjs` 的 `CATEGORY_RULES`，官方组织（deepseek-ai / dsh-external）标「官方」
- **历史**：`site/data/history/` 保留最近 30 天，前端据此标记「新增」

## 发现好项目？

- 想让你的 DSH 插件上架：直接开 Issue / PR，把仓库加入 `crawler/config.mjs` 的 `CURATED` 即可
- 调整关键词 / 分类规则：编辑 `crawler/config.mjs` 后重新运行抓取

## 免责声明

本站为社区聚合项目，与 DeepSeek 官方无关；项目元数据来自 GitHub 公开 API，版权归各项目作者所有。
