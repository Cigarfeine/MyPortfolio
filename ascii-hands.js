(() => {
const canvas = document.querySelector('#ascii-canvas');
const container = document.querySelector('.ascii-art');
const fallback = document.querySelector('.ascii-fallback');

if (!canvas || !container) return;

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

// Smooth tactical pointer state with spring physics
let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;
let intensity = 0;
let targetIntensity = 0;

function luminance(red, green, blue) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function glyphFor(value) {
  const idx = Math.max(0, Math.min(CHARACTER_RAMP.length - 1, Math.round(value * (CHARACTER_RAMP.length - 1))));
  return CHARACTER_RAMP[idx];
}

function configureCanvas(target, targetContext) {
  target.width = Math.round(width * devicePixelRatio);
  target.height = Math.round(height * devicePixelRatio);
  targetContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  targetContext.textAlign = 'center';
  targetContext.textBaseline = 'middle';
  targetContext.font = `${fontSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
}

function rebuildGrid() {
  if (!source.naturalWidth) return;
  const bounds = container.getBoundingClientRect();
  width = Math.max(1, bounds.width);
  height = Math.max(1, bounds.height);
  devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const minColumns = width < 500 ? 40 : width < 900 ? 64 : 96;
  columns = Math.max(minColumns, Math.min(220, Math.floor(width / 6.5)));
  cellWidth = width / columns;
  cellHeight = cellWidth * 1.48;
  rows = Math.ceil(height / cellHeight);
  fontSize = Math.max(5.5, cellWidth * 1.02);

  if (currentX === 0 && currentY === 0) {
    currentX = width / 2;
    currentY = height / 2;
    targetX = width / 2;
    targetY = height / 2;
  }

  configureCanvas(canvas, context);
  configureCanvas(leftCanvas, leftContext);
  configureCanvas(rightCanvas, rightContext);
  sampleCanvas.width = columns;
  sampleCanvas.height = rows;
  sampleContext.clearRect(0, 0, columns, rows);
  sampleContext.drawImage(source, 0, 0, columns, rows);

  const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
  samples = new Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = (row * columns + column) * 4;
      const alpha = pixels[index + 3] / 255;
      const lightness = luminance(pixels[index], pixels[index + 1], pixels[index + 2]) / 255;
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

const MATRIX_GLYPHS = [
  '0', '1', '2', '3', '4', '5', '7', '8', '9',
  'X', 'Z', 'Y', 'K', 'M', 'W', 'N', 'R', 'T', 'V', 'A', 'E', 'H',
  'x', 'z', 'k', 'v', 'y', 'w',
  '+', '-', '*', '/', '=', '<', '>', ':', ';', '~', '^', '|', '_', '%', '&', '$', '#', '?', '!', '[', ']', '{', '}'
];

function drawPointerEffect(time) {
  if (intensity <= 0.005) return;

  const radius = Math.max(80, Math.min(width, height) * 0.16);
  const minColumn = Math.max(0, Math.floor((currentX - radius) / cellWidth));
  const maxColumn = Math.min(columns - 1, Math.ceil((currentX + radius) / cellWidth));
  const minRow = Math.max(0, Math.floor((currentY - radius) / cellHeight));
  const maxRow = Math.min(rows - 1, Math.ceil((currentY + radius) / cellHeight));

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const brightness = samples[row * columns + column];
      if (brightness < 0.06) continue;

      const x = (column + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;
      const dx = x - currentX;
      const dy = y - currentY;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;

      const norm = dist / radius; // 0 at cursor center, 1 at perimeter
      const falloff = Math.cos(norm * (Math.PI * 0.5));
      const strength = falloff * intensity;
      if (strength <= 0.015) continue;

      // Matrix rain vertical cadence: subtle downward streaming offset per column
      const speed = 0.007 + ((column * 7) % 5) * 0.0018;
      const cascade = Math.floor(time * speed + column * 1.3);

      // Stagger mutation cycle intervals per cell (65ms - 125ms) so changes feel organic, not seizure-like
      const cadence = 65 + ((column * 19 + row * 31) % 60);
      const tick = Math.floor(time / cadence);

      // Deterministic pseudo-random seed for Matrix glyph
      const seed = Math.abs((column * 73856093) ^ ((row - cascade) * 19349663) ^ (tick * 83492791));
      const matrixGlyph = MATRIX_GLYPHS[seed % MATRIX_GLYPHS.length];

      // Organic edge decode: closer to cursor = full matrix stream, outer edges decode back to original hand
      const mutateProb = Math.min(1.0, strength * 1.45);
      const cellNoise = ((column * 37 + row * 59 + tick * 17) % 100) / 100;
      const isMatrix = cellNoise < mutateProb;

      const displayGlyph = isMatrix ? matrixGlyph : glyphFor(brightness);

      // Calibrated natural intensity: exactly preserves the hand's silhouette density
      const baseAlpha = Math.min(0.96, 0.32 + brightness * 0.76);
      
      // Subtle lead drop shimmer (~3% chance on active matrix cells)
      const isLeadSpark = isMatrix && ((seed % 31) === 0);
      const color = isLeadSpark
        ? `rgb(255 255 255 / ${Math.min(1.0, baseAlpha + 0.15)})`
        : `rgb(232 232 227 / ${baseAlpha})`;

      // Erase base cell cleanly to prevent character double-stamping / blur
      context.clearRect(
        Math.floor(column * cellWidth),
        Math.floor(row * cellHeight),
        Math.ceil(cellWidth),
        Math.ceil(cellHeight)
      );

      context.fillStyle = color;
      context.fillText(displayGlyph, x, y);
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

  // Smooth spring lerp physics
  currentX += (targetX - currentX) * 0.16;
  currentY += (targetY - currentY) * 0.16;
  intensity += (targetIntensity - intensity) * 0.12;

  // Draw enhanced pointer effect once intro has assembled
  if (progress >= 0.95 && intensity > 0.005) {
    drawPointerEffect(time);
  }

  const isDecaying = intensity > 0.005 || Math.hypot(targetX - currentX, targetY - currentY) > 0.5;
  const needsMoreFrames = (isDecaying || progress < 1) && !prefersReducedMotion.matches;

  if (needsMoreFrames) {
    frameId = requestAnimationFrame(render);
  } else {
    frameId = 0;
    if (progress >= 1 && intensity <= 0.005 && intensity !== 0) {
      intensity = 0;
      context.clearRect(0, 0, width, height);
      context.drawImage(leftCanvas, 0, 0, width, height);
      context.drawImage(rightCanvas, 0, 0, width, height);
    }
  }
}

function requestRender() {
  if (!frameId) frameId = requestAnimationFrame(render);
}

function updatePointerPosition(clientX, clientY) {
  const bounds = canvas.getBoundingClientRect();
  if (bounds.width === 0 || bounds.height === 0) return;

  targetX = clientX - bounds.left;
  targetY = clientY - bounds.top;

  const isInHero = (
    clientX >= bounds.left &&
    clientX <= bounds.right &&
    clientY >= bounds.top &&
    clientY <= bounds.bottom &&
    window.scrollY < (bounds.height || window.innerHeight)
  );

  if (isInHero) {
    targetIntensity = 1;
  } else {
    targetIntensity = 0;
  }
  requestRender();
}

window.addEventListener('mousemove', (e) => {
  updatePointerPosition(e.clientX, e.clientY);
}, { passive: true });

window.addEventListener('mouseleave', () => {
  targetIntensity = 0;
  requestRender();
}, { passive: true });

window.addEventListener('scroll', () => {
  const bounds = canvas.getBoundingClientRect();
  if (window.scrollY > (bounds.height || window.innerHeight)) {
    targetIntensity = 0;
  }
}, { passive: true });

document.addEventListener('ascii-intro-update', requestRender);

canvas.addEventListener('focus', () => {
  targetX = width / 2;
  targetY = height / 2;
  targetIntensity = 1;
  requestRender();
});

canvas.addEventListener('blur', () => {
  targetIntensity = 0;
  requestRender();
});

prefersReducedMotion.addEventListener('change', () => {
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  render();
});

new ResizeObserver(rebuildGrid).observe(container);

source.addEventListener('load', () => {
  container.dataset.ready = 'true';
  fallback.hidden = true;
  rebuildGrid();
});

source.addEventListener('error', () => {
  container.dataset.ready = 'false';
});

source.src = './assets/hands-source.png';
})();
