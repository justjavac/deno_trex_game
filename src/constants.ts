/** 默认宽度 */
export const DEFAULT_WIDTH = 600;

/** 每秒帧数 */
export const FPS = 60;

/** 是否高清设备 */
export const IS_HIDPI = window.devicePixelRatio > 1;

export const DPI_TYPE = window.devicePixelRatio > 1 ? "HDPI" : "LDPI";

export const PIXEL_RATIO = window.devicePixelRatio > 1 ? 2 : 1;

/** 是否 IOS */
export const IS_IOS = /CriOS/.test(window.navigator.userAgent);

/** 是否手机 */
export const IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

/** 资源的 id 前缀 */
export const RESOURCE_POSTFIX = "offline-resources-";
