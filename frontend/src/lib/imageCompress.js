/* Client-side image compression via <canvas>.
   - Resize longest side to `maxDim`
   - Re-encode as JPEG (or preserve PNG for transparency-critical logos)
   - Keeps EXIF-free output to reduce size + strip metadata.
   Returns a File suitable for FormData upload. */

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function compressImage(
  file,
  { maxDim = 1600, quality = 0.85, keepPngTransparency = false } = {}
) {
  if (!(file instanceof Blob)) return file;
  // Only compress raster images we know how to re-encode
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  try {
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImg(dataUrl);

    let { width, height } = img;
    const longest = Math.max(width, height);
    if (longest > maxDim) {
      const scale = maxDim / longest;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    // Skip if already small AND already well-sized
    if (longest <= maxDim && file.size < 400 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const isPng = file.type === "image/png";
    const outMime = keepPngTransparency && isPng ? "image/png" : "image/jpeg";
    const ext = outMime === "image/png" ? "png" : "jpg";

    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        outMime,
        outMime === "image/jpeg" ? quality : undefined
      )
    );

    // If compression made it larger (rare for PNG→JPEG loss), fall back to source
    if (blob.size >= file.size && outMime === file.type) return file;

    const newName = (file.name || "photo").replace(/\.[^.]+$/, "") + "." + ext;
    return new File([blob], newName, { type: outMime, lastModified: Date.now() });
  } catch {
    // On any error, fall back to the original file — never block the upload.
    return file;
  }
}
