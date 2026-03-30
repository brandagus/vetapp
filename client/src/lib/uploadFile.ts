/**
 * Helper to upload a file to S3 via the server's visits.uploadAttachment procedure.
 * For pet photos, we encode to base64 and send through a dedicated pet photo upload.
 * Returns the public URL of the uploaded file.
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Stub for pet photo upload — actual upload happens via the pets.update mutation
 * after getting the base64 string. This returns a data URL for preview purposes
 * until the server mutation completes.
 */
export async function storagePut(file: File, base64: string): Promise<string> {
  // Return a data URL for immediate preview; the actual S3 URL comes from the server mutation
  return `data:${file.type};base64,${base64}`;
}
