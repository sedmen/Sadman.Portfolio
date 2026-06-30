/**
 * RETRO_OS DITHERING ENGINE (EXACT LINE-HALFTONE VERSION)
 * Converts image frames to a horizontal line-halftone pattern with a dithered look.
 * Matches the exact texture of the RETRO_OS console avatar.
 */

// Helper to clamp values between 0 and 255
const clamp = (val) => Math.max(0, Math.min(255, val));

// Helper to convert hex colors to RGB object
function hexToRgb(hex) {
  hex = hex.trim();
  if (hex.startsWith('rgb')) {
    const matches = hex.match(/\d+/g);
    return matches ? { r: parseInt(matches[0]), g: parseInt(matches[1]), b: parseInt(matches[2]) } : { r: 255, g: 255, b: 255 };
  }
  
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Helper to fetch theme variable values
function getThemeColor(variableName, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
  return value || fallback;
}

/**
 * Procedurally draws a profile silhouette and halftones it.
 */
export function drawDefaultAvatar(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 1. Draw plain white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // 2. Draw a circular radial grid background
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1;
  for (let r = 20; r < w; r += 15) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Draw silhouette head
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 20, 36, 0, Math.PI * 2);
  ctx.fill();

  // Face outline
  ctx.beginPath();
  ctx.moveTo(w / 2 - 15, h / 2 - 40);
  ctx.lineTo(w / 2 - 45, h / 2 - 15);
  ctx.lineTo(w / 2 - 30, h / 2 - 5);
  ctx.lineTo(w / 2 - 40, h / 2 + 10);
  ctx.lineTo(w / 2 - 15, h / 2 + 15);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.moveTo(w / 2 - 65, h);
  ctx.quadraticCurveTo(w / 2 - 30, h / 2 + 25, w / 2 - 15, h / 2 + 25);
  ctx.lineTo(w / 2 + 35, h / 2 + 25);
  ctx.quadraticCurveTo(w / 2 + 55, h / 2 + 25, w / 2 + 75, h);
  ctx.closePath();
  ctx.fill();

  // Apply Halftone Line Filter
  applyLineHalftoneFilter(canvas);
}

/**
 * Draws an image element onto a canvas maintaining aspect ratio,
 * then applies horizontal line-halftoning matching the theme colors.
 */
export function ditherUploadedImage(canvas, img) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Draw image cropped & centered (with right-aligned window for landscape profile)
  const imgRatio = img.width / img.height;
  const canvasRatio = w / h;
  let sx, sy, sWidth, sHeight;

  if (imgRatio > canvasRatio) {
    sHeight = img.height;
    sWidth = img.height * canvasRatio;
    // Align closer to the right to capture the profile subject
    sx = Math.max(0, img.width - sWidth - 40);
    sy = 0;
  } else {
    sWidth = img.width;
    sHeight = img.width / canvasRatio;
    sx = 0;
    sy = (img.height - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, w, h);

  // Apply Halftone Line Filter
  applyLineHalftoneFilter(canvas);
}

/**
 * Renders the canvas as horizontal lines of variable thickness based on image darkness.
 */
function applyLineHalftoneFilter(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Convert to grayscale and apply contrast boost
  const grayscale = new Float32Array(w * h);
  const contrastFactor = 1.7; // Enhanced contrast for clean silhouette lines

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = (gray - 128) * contrastFactor + 128;
    grayscale[i / 4] = clamp(gray);
  }

  // Get active colors
  const fgColor = getThemeColor('--text', '#f5a623');
  const bgColor = getThemeColor('--bg', '#100d0a');

  // Fill canvas with background color
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  // Draw horizontal lines in foreground color
  ctx.fillStyle = fgColor;
  
  const spacing = 3; // Space between line centers (fine resolution)
  const maxThickness = 3.8; // Maximum thickness of drawn line

  for (let y = 1; y < h - 1; y += spacing) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const gray = grayscale[idx];

      // Calculate darkness percentage (0 = white, 1 = black)
      const darkness = 1.0 - (gray / 255);

      // Line thickness varies with darkness
      const thickness = darkness * maxThickness;

      if (thickness > 0.2) {
        // Draw vertical pixel strip centered at (x, y) to construct the scanline
        ctx.fillRect(x, y - thickness / 2, 1, thickness);
      }
    }
  }
}
