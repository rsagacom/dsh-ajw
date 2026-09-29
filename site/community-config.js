// DS安甲网 · 社群入口配置
// 首页「机师补给频道」与手册页的频道卡都由这里驱动，无需改动其他代码。
//
// 字段说明：
//   name    频道名称
//   desc    一句话介绍
//   url     频道地址；**留空即显示「筹备中」**，填入完整 URL 即刻上线
//   qr      二维码图片路径（放在 site/assets/img/ 下）；留空则不显示二维码
//   status  未上线时显示的状态文案，默认「筹备中 · 敬请期待」
window.DSH_COMMUNITY = {
  title: '机师补给频道',
  note: '机师交流、装甲评测、新货预告 —— 部分入口筹备中，敬请期待',
  channels: [
    {
      name: '在线社区 BBS',
      desc: '机师论坛：插件讨论、装机分享、问题互助。上线后这里会亮绿灯。',
      url: '',
      status: '筹备中 · 敬请期待',
    },
    {
      name: '微信交流群',
      desc: '扫码加入机师群，第一时间收到每日补给情报。群规只有一条：不发广告。',
      url: '',
      qr: 'assets/img/wechat-qr.png',
      status: '筹备中 · 敬请期待',
    },
    {
      name: 'GitHub Discussions',
      desc: 'DeepSeek Harness 官方仓库的讨论区（已启用）。该仓库 Issue 已关闭，提收录请求只能在这里开帖。',
      url: 'https://github.com/deepseek-ai/deepseek-harness/discussions',
    },
    {
      name: '收录索引 · awesome-deepseek-harness',
      desc: '不只是投稿入口，更是我们的一条数据源：每日巡检直接解析它的 README 取仓库链接，并用章节标题决定分类。当前 526 个收录里有 31 个仅由它独家贡献。',
      url: 'https://github.com/0xsline/awesome-deepseek-harness',
    },
  ],
}
