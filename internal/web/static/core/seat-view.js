// 观战视角：当前屏幕上「谁的私人信息可以明牌」。
// 热座 = 当前待决策座位（轮到谁，谁就坐在屏幕前）；
// 联机 = 我的座位（只有自己能看到自己的手牌，他人一律牌背）。
// 隐藏信息游戏（UNO 手牌、璀璨宝石预留牌、方舟动物园手牌）渲染私人信息前必须先问这里。
let viewerSeat = -1;

// setViewerSeat 设置视角座位；非法值按「无视角」处理（全部隐藏）
export function setViewerSeat(seat) {
  viewerSeat = Number.isInteger(seat) ? seat : -1;
}

// getViewerSeat 读取当前视角座位（-1 = 无视角，私人信息一律不可见）
export function getViewerSeat() {
  return viewerSeat;
}

// isViewerSeat 该座位的私人信息是否允许明牌展示
export function isViewerSeat(seat) {
  return viewerSeat >= 0 && seat === viewerSeat;
}
