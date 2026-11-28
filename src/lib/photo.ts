import imageCompression from 'browser-image-compression'

export const PHOTO_MAX_PX = 1600
export const PHOTO_QUALITY = 0.7
export const THUMB_MAX_PX = 300

export type PreparedPhoto = { photo: Blob; thumb: Blob }

async function shrink(file: File, maxPx: number): Promise<Blob> {
  return imageCompression(file, {
    maxWidthOrHeight: maxPx,
    initialQuality: PHOTO_QUALITY,
    fileType: 'image/jpeg',
    // The worker is fetched from a CDN that the offline-first app does not precache.
    useWebWorker: false,
  })
}

/** Compresses a camera/gallery image (max 1600 px, JPEG 0.7) and builds the 300 px thumbnail. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const photo = await shrink(file, PHOTO_MAX_PX)
  const asFile = new File([photo], 'photo.jpg', { type: 'image/jpeg' })
  const thumb = await shrink(asFile, THUMB_MAX_PX)
  return { photo, thumb }
}
