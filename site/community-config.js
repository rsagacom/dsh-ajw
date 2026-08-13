// DS安甲网 · 社群入口配置
// 后续上线 BBS 或微信群时, 只需改这里（无需动其他代码）:
//   bbs: 在线社区地址; wechat.qr: 微信群二维码图片路径（放入 site/assets/img/ 下）
window.DSH_COMMUNITY = {
  title: '社群与补给频道',
  note: '机师交流、装甲评测、新货预告 —— 入口筹备中，敬请期待',
  bbs: {
    name: '在线社区 BBS',
    desc: '机师论坛：插件讨论、装机分享、问题互助',
    url: '',                       // 留空 = 显示「筹备中」; 填入完整 URL 即上线
    status: '筹备中 · 敬请期待',
  },
  wechat: {
    name: '微信交流群',
    desc: '扫码加入机师群，第一时间收到每日补给情报',
    qr: 'assets/img/wechat-qr.png', // 留空或图片不存在 = 显示占位框
    status: '筹备中 · 敬请期待',
  },
}
