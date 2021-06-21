export default class CollisionBox {
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;

  /**
   * 碰撞盒对象
   * @param x X 坐标
   * @param y Y 坐标
   * @param w 宽度
   * @param h 高度
   */
  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }
}
