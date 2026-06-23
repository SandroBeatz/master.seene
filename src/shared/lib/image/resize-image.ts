/**
 * Client-side image resize used before uploading an avatar. Crops the source to
 * a centered square and downscales it to at most `size` px, producing a small
 * WebP blob — caps storage and bandwidth and keeps avatars uniform.
 */

export interface SquareCrop {
  /** Left offset of the square crop within the source. */
  sx: number
  /** Top offset of the square crop within the source. */
  sy: number
  /** Side length of the (square) crop in source pixels. */
  side: number
}

/**
 * Computes a centered square crop for an image of the given dimensions. The
 * square side equals the shorter edge; the longer edge is trimmed equally on
 * both sides. Pure (no DOM) so it can be unit-tested directly.
 */
export function computeSquareCrop(width: number, height: number): SquareCrop {
  const side = Math.min(width, height)
  return {
    sx: Math.max(0, Math.floor((width - side) / 2)),
    sy: Math.max(0, Math.floor((height - side) / 2)),
    side,
  }
}

const DEFAULT_OUTPUT_TYPE = 'image/webp'
const DEFAULT_QUALITY = 0.85

/**
 * Loads `file`, crops it to a centered square and downscales to at most `size`
 * px (never upscales beyond the source square), returning a compressed Blob.
 *
 * @param file  Source image (expects image/png or image/jpeg).
 * @param size  Max output edge in px (default 512).
 */
export async function resizeImageToSquare(file: File | Blob, size = 512): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const { sx, sy, side } = computeSquareCrop(img.naturalWidth, img.naturalHeight)
    // Don't upscale a small source — cap the output at the crop's own size.
    const target = Math.min(size, side)

    const canvas = document.createElement('canvas')
    canvas.width = target
    canvas.height = target

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context is not available')
    ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target)

    return await canvasToBlob(canvas, DEFAULT_OUTPUT_TYPE, DEFAULT_QUALITY)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
      type,
      quality,
    )
  })
}
