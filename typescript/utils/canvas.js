/**
 * fixes canvas blurry text on high DPI screens
 * @param {CanvasRenderingContext2D} ctx
 */
const fixCanvasBlur = (ctx) => {
  // ref:
  // https://stackoverflow.com/questions/15661339/how-do-i-fix-blurry-text-in-my-html5-canvas
  // https://web.dev/articles/canvas-hidipi
  const canvas = document.getElementsByName("canvas");

  const ratio = window.devicePixelRatio || 1;
  canvas.width = CANVAS_WIDTH * ratio;
  canvas.height = CANVAS_HEIGHT * ratio;
  ctx.scale(ratio, ratio);
};
