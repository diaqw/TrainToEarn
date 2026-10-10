import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

// Match the existing R2 adapter contract, including atomic compare-and-swap.
export function createBlobBucket(sdk = { get, put }) {
  return {
    async get(key) {
      // Compression weakens the HTTP ETag, which cannot authorize an atomic write.
      const result = await sdk.get(key, { access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' } });
      if (!result) return null;
      if (result.statusCode !== 200 || !result.stream) throw new Error('Unexpected storage response');
      if (!result.blob.etag || result.blob.etag.startsWith('W/')) throw new Error('Storage returned an unsafe version identifier');
      return { etag: result.blob.etag, json: () => new Response(result.stream).json() };
    },
    async put(key, value, { onlyIf }) {
      const create = onlyIf.etagDoesNotMatch === '*';
      try {
        return await sdk.put(key, value, {
          access: 'private', addRandomSuffix: false, allowOverwrite: !create,
          contentType: 'application/json', cacheControlMaxAge: 60,
          ...(create ? {} : { ifMatch: onlyIf.etagMatches })
        });
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) return null;
        // A concurrent first write can win creation; retry only when it now exists.
        if (create && await sdk.get(key, { access: 'private', useCache: false })) return null;
        throw error;
      }
    }
  };
}
