
/**
 * Advanced Image Processing for OCR Enhancement
 * This module provides high-fidelity preprocessing to optimize character 
 * recognition in challenging visual environments (low light, noise, low contrast).
 */

/**
 * Applies a 3x3 convolution matrix to image data.
 */
function applyConvolution(pixels: Uint8ClampedArray, width: number, height: number, weights: number[], factor: number = 1): void {
  const side = 3;
  const halfSide = 1;
  const oldData = new Uint8ClampedArray(pixels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dstOff = (y * width + x) * 4;
      let r = 0, g = 0, b = 0;

      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
          const srcOff = (scy * width + scx) * 4;
          const wt = weights[cy * side + cx];
          
          r += oldData[srcOff] * wt;
          g += oldData[srcOff + 1] * wt;
          b += oldData[srcOff + 2] * wt;
        }
      }

      pixels[dstOff] = Math.min(255, Math.max(0, (r * factor)));
      pixels[dstOff + 1] = Math.min(255, Math.max(0, (g * factor)));
      pixels[dstOff + 2] = Math.min(255, Math.max(0, (b * factor)));
    }
  }
}

/**
 * Performs a simple box blur.
 */
function boxBlur(pixels: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const off = (ny * width + nx) * 4;
            r += pixels[off];
            g += pixels[off + 1];
            b += pixels[off + 2];
            count++;
          }
        }
      }
      const off = (y * width + x) * 4;
      out[off] = r / count;
      out[off + 1] = g / count;
      out[off + 2] = b / count;
    }
  }
  return out;
}

export interface ImageEnhancementOptions {
  brightness: number;
  contrast: number;
  sharpen: number;
}

/**
 * Advanced Pre-OCR Enhancement Pipeline
 */
export async function enhanceImageForOCR(canvas: HTMLCanvasElement, options: ImageEnhancementOptions = { brightness: 1, contrast: 1, sharpen: 0 }): Promise<void> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // PASS 1: Base Normalization
  // Use a strong contrast and brightness boost as a baseline to flatten background noise
  const finalBrightness = 1.2 * options.brightness;
  const finalContrast = 1.4 * options.contrast;
  ctx.filter = `grayscale(100%) brightness(${finalBrightness}) contrast(${finalContrast})`;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  let imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // PASS 2: Gamma Correction
  // Specifically for low-light images, we need to non-linearly lift the shadows 
  // without blowing out the highlights (useful for faint text on dark paper)
  const gamma = 0.65; // < 1 lifts shadows
  const lookupTable = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    lookupTable[i] = Math.pow(i / 255, gamma) * 255;
  }

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = lookupTable[pixels[i]];
    pixels[i + 1] = lookupTable[pixels[i + 1]];
    pixels[i + 2] = lookupTable[pixels[i + 2]];
  }

  // PASS 3: Laplacian Edge Reinforcement / Sharpening
  // This highlights the transitions between text and background.
  const laplacianKernel = [0, 1, 0, 1, -4, 1, 0, 1, 0];
  const edgeBuffer = new Uint8ClampedArray(pixels);
  applyConvolution(edgeBuffer, width, height, laplacianKernel);

  // Blend edges back into the main image (reinforce outlines)
  // Increase reinforcement if sharpen is high
  const sharpenFactor = 0.8 + (options.sharpen * 1.2); 
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.min(255, Math.max(0, pixels[i] - edgeBuffer[i] * sharpenFactor));
    pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1] - edgeBuffer[i + 1] * sharpenFactor));
    pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2] - edgeBuffer[i + 2] * sharpenFactor));
  }

  // PASS 4: Local Adaptive Contrast
  // Final pass to ensure characters are significantly different from their local background
  const localMean = boxBlur(pixels, width, height, 8);
  for (let i = 0; i < pixels.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      const val = pixels[i + j];
      const mean = localMean[i + j];
      const diff = val - mean;
      // Aggressive push away from local average
      pixels[i + j] = Math.min(255, Math.max(0, mean + diff * 2.2));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
