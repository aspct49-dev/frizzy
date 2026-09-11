/**
 * Vercel Blob authenticates with a read/write token. Attaching a Blob store to
 * the project is supposed to export it, but the store can end up connected
 * while the token is missing from the environment -- in which case uploads
 * fail at the moment someone tries to add a challenge image.
 *
 * Checked up front so the admin panel can say so before that happens.
 */
export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}
