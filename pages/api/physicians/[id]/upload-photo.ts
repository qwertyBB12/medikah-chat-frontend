import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { supabaseAdmin } from '../../../../lib/supabaseServer';
import { validatePhoto, processPhoto, photoErrorMessages } from '../../../../lib/photoProcessing';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Physician ID is required' });
  }

  try {
    // Verify ownership
    const { data: physician, error: fetchError } = await supabaseAdmin
      .from('physicians')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !physician) {
      return res.status(404).json({ error: 'Physician not found' });
    }

    if (physician.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    // Expect JSON body with base64 data URL
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'dataUrl is required' });
    }

    // Parse data URL: data:image/png;base64,<data>
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image data URL. Supported formats: JPEG, PNG, WebP.' });
    }

    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate photo (dimensions, size, format, aspect ratio)
    const validation = await validatePhoto(buffer);
    if (!validation.valid) {
      const lang = req.headers['accept-language']?.startsWith('es') ? 'es' : 'en';
      const messages = photoErrorMessages[lang];
      const errorMessages = validation.errors.map(
        (key) => messages[key as keyof typeof messages] || key
      );
      return res.status(400).json({
        error: errorMessages.join(' '),
        validationErrors: validation.errors,
        metadata: validation.metadata,
      });
    }

    // Process photo: center-crop, resize, normalize
    const processed = await processPhoto(buffer);

    // Upload display variant (800×800)
    const displayPath = `${id}/photo.jpeg`;
    const { error: displayUploadError } = await supabaseAdmin.storage
      .from('physician-photos')
      .upload(displayPath, processed.display, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (displayUploadError) {
      console.error('Error uploading display photo:', displayUploadError);
      return res.status(500).json({ error: 'Failed to upload photo' });
    }

    // Upload thumbnail variant (200×200)
    const thumbPath = `${id}/photo-thumb.jpeg`;
    const { error: thumbUploadError } = await supabaseAdmin.storage
      .from('physician-photos')
      .upload(thumbPath, processed.thumbnail, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (thumbUploadError) {
      console.error('Error uploading thumbnail:', thumbUploadError);
      // Non-fatal — display photo was uploaded successfully
    }

    // Get public URLs
    const { data: displayUrlData } = supabaseAdmin.storage
      .from('physician-photos')
      .getPublicUrl(displayPath);

    const { data: thumbUrlData } = supabaseAdmin.storage
      .from('physician-photos')
      .getPublicUrl(thumbPath);

    const photoUrl = displayUrlData.publicUrl;
    const photoThumbUrl = thumbUrlData.publicUrl;

    // Update physician record with both URLs
    const { error: updateError } = await supabaseAdmin
      .from('physicians')
      .update({
        photo_url: photoUrl,
        photo_thumb_url: photoThumbUrl,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating photo_url:', updateError);
      return res.status(500).json({ error: 'Photo uploaded but failed to update profile' });
    }

    return res.status(200).json({
      success: true,
      photoUrl,
      photoThumbUrl,
    });
  } catch (err) {
    console.error('Exception uploading photo:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// Base64-encoded 5MB image ≈ 6.7MB; allow 8MB to be safe
export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};
