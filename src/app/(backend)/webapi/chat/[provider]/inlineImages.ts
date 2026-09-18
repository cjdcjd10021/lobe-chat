import { type OpenAIChatMessage } from '@lobechat/types';
import { inferContentTypeFromImageUrl } from '@lobechat/utils';

import { type FileService } from '@/server/services/file';

// Kimi Code endpoint rejects remote image URLs, so images must be inlined as base64
const MAX_INLINE_IMAGE_SIZE = 10 * 1024 * 1024;

const toDataUrl = (bytes: Uint8Array, mimeType: string) =>
  `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;

const inferMimeType = (url: string): string => {
  try {
    return inferContentTypeFromImageUrl(url);
  } catch {
    return 'image/png';
  }
};

const loadImageBytes = async (
  url: string,
  fileService: FileService,
): Promise<{ bytes: Uint8Array; mimeType: string } | undefined> => {
  // Publicly accessible URLs can be fetched directly
  try {
    const res = await fetch(url);
    if (res.ok) {
      return {
        bytes: new Uint8Array(await res.arrayBuffer()),
        mimeType: res.headers.get('content-type') || inferMimeType(url),
      };
    }
  } catch {
    // fall through to storage lookup
  }

  // Uploaded files live in a private bucket; the object key is the URL path
  try {
    const key = new URL(url).pathname.slice(1);
    return { bytes: await fileService.getFileByteArray(key), mimeType: inferMimeType(url) };
  } catch {
    return undefined;
  }
};

export const inlineImageUrls = async (
  messages: OpenAIChatMessage[],
  fileService: FileService,
): Promise<OpenAIChatMessage[]> => {
  return Promise.all(
    messages.map(async (message) => {
      if (typeof message.content === 'string') return message;

      const content = await Promise.all(
        message.content.map(async (part) => {
          if (part.type !== 'image_url') return part;

          const url = part.image_url?.url;
          if (!url || url.startsWith('data:')) return part;

          const image = await loadImageBytes(url, fileService);
          if (!image || image.bytes.byteLength > MAX_INLINE_IMAGE_SIZE) return part;

          return { ...part, image_url: { ...part.image_url, url: toDataUrl(image.bytes, image.mimeType) } };
        }),
      );

      return { ...message, content };
    }),
  );
};
