import sharp from 'sharp';

export interface PhotoValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    width: number;
    height: number;
    format: string;
    sizeBytes: number;
  };
}

export interface ProcessedPhoto {
  display: Buffer;    // 800×800 JPEG
  thumbnail: Buffer;  // 200×200 JPEG
}

const MIN_DIMENSION = 800;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ASPECT_RATIO = 2; // Reject if wider/taller than 2:1
const DISPLAY_SIZE = 800;
const THUMB_SIZE = 200;
const JPEG_QUALITY = 85;

const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

export const photoErrorMessages = {
  en: {
    tooSmall: `Photo must be at least ${MIN_DIMENSION}×${MIN_DIMENSION} pixels.`,
    tooLarge: 'Photo must be under 5MB.',
    invalidFormat: 'Supported formats: JPEG, PNG, WebP.',
    badAspectRatio: 'Photo aspect ratio is too extreme. Please use a portrait or square photo.',
    processingFailed: 'Failed to process photo. Please try a different image.',
  },
  es: {
    tooSmall: `La foto debe tener al menos ${MIN_DIMENSION}×${MIN_DIMENSION} píxeles.`,
    tooLarge: 'La foto debe ser menor de 5MB.',
    invalidFormat: 'Formatos soportados: JPEG, PNG, WebP.',
    badAspectRatio: 'La proporción de la foto es demasiado extrema. Use una foto vertical o cuadrada.',
    processingFailed: 'Error al procesar la foto. Intente con una imagen diferente.',
  },
};

export async function validatePhoto(buffer: Buffer): Promise<PhotoValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Size check
  if (buffer.length > MAX_FILE_SIZE) {
    errors.push('tooLarge');
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return {
      valid: false,
      errors: ['invalidFormat'],
      warnings: [],
      metadata: { width: 0, height: 0, format: 'unknown', sizeBytes: buffer.length },
    };
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const format = metadata.format || 'unknown';

  // Format check
  if (!ALLOWED_FORMATS.includes(format)) {
    errors.push('invalidFormat');
  }

  // Dimension check
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    errors.push('tooSmall');
  }

  // Aspect ratio check
  if (width > 0 && height > 0) {
    const ratio = Math.max(width / height, height / width);
    if (ratio > MAX_ASPECT_RATIO) {
      errors.push('badAspectRatio');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: { width, height, format, sizeBytes: buffer.length },
  };
}

export async function processPhoto(buffer: Buffer): Promise<ProcessedPhoto> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Center-crop to 1:1 square
  const cropSize = Math.min(width, height);
  const left = Math.floor((width - cropSize) / 2);
  const top = Math.floor((height - cropSize) / 2);

  const cropped = sharp(buffer).extract({
    left,
    top,
    width: cropSize,
    height: cropSize,
  });

  // Display variant: 800×800
  const display = await cropped
    .clone()
    .resize(DISPLAY_SIZE, DISPLAY_SIZE, { fit: 'cover' })
    .normalize()
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Thumbnail variant: 200×200
  const thumbnail = await cropped
    .clone()
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
    .normalize()
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return { display, thumbnail };
}
