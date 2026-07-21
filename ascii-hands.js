(() => {
const canvas = document.querySelector('#ascii-canvas');
const container = document.querySelector('.ascii-art');
const fallback = document.querySelector('.ascii-fallback');

const context = canvas.getContext('2d');
const sampleCanvas = document.createElement('canvas');
const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
const leftCanvas = document.createElement('canvas');
const leftContext = leftCanvas.getContext('2d');
const rightCanvas = document.createElement('canvas');
const rightContext = rightCanvas.getContext('2d');

const source = new Image();
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const CHARACTER_RAMP = ' .`^\",:;Il!i~+_-?][}{1)(|\\/*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
const GLITCH_GLYPHS = '0123456789abcdef+-=<>/\\[]{}()$#%&@*^~';
const pointer = { active: false, x: 0, y: 0 };
window.asciiIntro = { progress: 0 };

let devicePixelRatio = 1;
let width = 0;
let height = 0;
let columns = 0;
let rows = 0;
let cellWidth = 0;
let cellHeight = 0;
let fontSize = 0;
let samples = [];
let frameId = 0;

function luminance(red, green, blue) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function glyphFor(value) {
  return CHARACTER_RAMP[Math.round(value * (CHARACTER_RAMP.length - 1))];
}

function glyphAt(column, row, time) {
  const index = Math.abs((column + 11) * 73856093 ^ (row + 17) * 19349663 ^ Math.floor(time / 30));
  return GLITCH_GLYPHS[index % GLITCH_GLYPHS.length];
}

function configureCanvas(target, targetContext) {
  target.width = Math.round(width * devicePixelRatio);
  target.height = Math.round(height * devicePixelRatio);
  targetContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  targetContext.textAlign = 'center';
  targetContext.textBaseline = 'middle';
  targetContext.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
}

function rebuildGrid() {
  if (!source.naturalWidth) return;
  const bounds = container.getBoundingClientRect();
  width = Math.max(1, bounds.width);
  height = Math.max(1, bounds.height);
  devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  columns = Math.max(96, Math.min(220, Math.floor(width / 6.5)));
  cellWidth = width / columns;
  cellHeight = cellWidth * 1.48;
  rows = Math.ceil(height / cellHeight);
  fontSize = Math.max(5.5, cellWidth * 1.02);

  configureCanvas(canvas, context);
  configureCanvas(leftCanvas, leftContext);
  configureCanvas(rightCanvas, rightContext);
  sampleCanvas.width = columns;
  sampleCanvas.height = rows;
  // Preserve the source image's alpha channel. Filling this canvas first would
  // turn transparent pixels into opaque black and render them as background glyphs.
  sampleContext.clearRect(0, 0, columns, rows);
  sampleContext.drawImage(source, 0, 0, columns, rows);

  const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
  samples = new Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = (row * columns + column) * 4;
      const alpha = pixels[index + 3] / 255;
      const lightness = luminance(pixels[index], pixels[index + 1], pixels[index + 2]) / 255;
      // The source has a transparent background and a very dark robotic hand.
      // Alpha preserves that silhouette while gamma-corrected lightness keeps its detail readable.
      samples[row * columns + column] = alpha * Math.max(0.13, Math.pow(lightness, 0.62));
    }
  }
  drawBaseLayer();
  render();
}

function drawBaseLayer() {
  leftContext.clearRect(0, 0, width, height);
  rightContext.clearRect(0, 0, width, height);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const brightness = samples[row * columns + column];
      if (brightness < 0.06) continue;
      const alpha = Math.min(0.96, 0.32 + brightness * 0.76);
      
      if (column < columns / 2) {
        leftContext.fillStyle = `rgb(232 232 227 / ${alpha})`;
        leftContext.fillText(glyphFor(brightness), (column + 0.5) * cellWidth, (row + 0.5) * cellHeight);
      } else {
        rightContext.fillStyle = `rgb(232 232 227 / ${alpha})`;
        rightContext.fillText(glyphFor(brightness), (column + 0.5) * cellWidth, (row + 0.5) * cellHeight);
      }
    }
  }
}

function drawPointerEffect(time) {
  if (!pointer.active) return;
  const radius = Math.max(90, Math.min(width, height) * 0.24);
  const minColumn = Math.max(0, Math.floor((pointer.x - radius) / cellWidth));
  const maxColumn = Math.min(columns - 1, Math.ceil((pointer.x + radius) / cellWidth));
  const minRow = Math.max(0, Math.floor((pointer.y - radius) / cellHeight));
  const maxRow = Math.min(rows - 1, Math.ceil((pointer.y + radius) / cellHeight));

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const brightness = samples[row * columns + column];
      if (brightness < 0.07) continue;
      const x = (column + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;
      const distance = Math.hypot(x - pointer.x, y - pointer.y);
      if (distance > radius) continue;
      const strength = (1 - distance / radius) ** 2;
      const alpha = Math.min(1, (0.36 + brightness * 0.9) * strength);
      context.fillStyle = `rgb(232 232 227 / ${alpha})`;
      context.fillText(glyphAt(column, row, time), x, y);
    }
  }
}

function render(time = 0) {
  context.clearRect(0, 0, width, height);

  const progress = window.asciiIntro ? window.asciiIntro.progress : 1;
  const offset = (1 - progress) * (width * 0.5);

  if (progress < 1) {
    context.globalAlpha = Math.max(0, progress * 1.5 - 0.5);
  }
  
  context.drawImage(leftCanvas, -offset, 0, width, height);
  context.drawImage(rightCanvas, offset, 0, width, height);
  
  context.globalAlpha = 1;

  drawPointerEffect(time);
  frameId = (pointer.active || progress < 1) && !prefersReducedMotion.matches ? requestAnimationFrame(render) : 0;
}

function requestRender() {
  if (!frameId) frameId = requestAnimationFrame(render);
}

function updatePointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = event.clientX - bounds.left;
  pointer.y = event.clientY - bounds.top;
  pointer.active = true;
  requestRender();
}

function stopPointer() {
  pointer.active = false;
  requestRender();
}

canvas.addEventListener('pointerenter', updatePointer);
canvas.addEventListener('pointermove', updatePointer);
canvas.addEventListener('pointerleave', stopPointer);

document.addEventListener('ascii-intro-update', requestRender);
canvas.addEventListener('focus', () => { pointer.active = true; pointer.x = width / 2; pointer.y = height / 2; requestRender(); });
canvas.addEventListener('blur', () => { pointer.active = false; requestRender(); });
prefersReducedMotion.addEventListener('change', () => { if (frameId) cancelAnimationFrame(frameId); frameId = 0; render(); });
new ResizeObserver(rebuildGrid).observe(container);

source.addEventListener('load', () => { container.dataset.ready = 'true'; fallback.hidden = true; rebuildGrid(); });
source.addEventListener('error', () => { container.dataset.ready = 'false'; });
source.src = './assets/hands-source.png';
})();
