# webgpu

## docs
https://gpuweb.github.io/gpuweb/

## changelog format

i saw that my documenting progress is not going super well, so I decided to keep the changelog of what I was doing with potentially some notes on topics i learn

### 21.01.2026

- started going over [game of life tutorial](https://codelabs.developers.google.com/your-first-webgpu-app)

notes:
- all drawing operations are done within a *render pass*. each render pass begins with `beginRenderPass()` call -> define which textures should receive drawing commands.
- canvas context provides textures for code to draw into, and used format can impact how efficiently images are shown on the canvas
- not using preferred device's format may result in extra memory copies before the image can be displayed as part of the page (use `getPreferredCanvasFormat` to avoid that)
- canvas needs to be associated with the device like
```js
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device: device,
  format: canvasFormat,
});
```
