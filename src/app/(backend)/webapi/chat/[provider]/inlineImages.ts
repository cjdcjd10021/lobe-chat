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

interface LoadResult {
  detail: string;
  image?: { bytes: Uint8Array; mimeType: string };
}

const errText = (e: unknown) => {
  const err = e as any;
  return [err?.name, err?.Code, err?.code, err?.message].filter(Boolean).slice(0, 2).join(':');
};

const tryLoadImage = async (url: string, fileService: FileService): Promise<LoadResult> => {
  const detail: string[] = [`url=${url.slice(0, 100)}`];

  // Publicly accessible URLs can be fetched directly
  try {
    const res = await fetch(url);
    detail.push(`fetch=${res.status}`);
    if (res.ok) {
      return {
        detail: '',
        image: {
          bytes: new Uint8Array(await res.arrayBuffer()),
          mimeType: res.headers.get('content-type') || inferMimeType(url),
        },
      };
    }
  } catch (e) {
    detail.push(`fetchErr=${errText(e)}`);
  }

  // Uploaded files live in a private bucket; derive the object key from the URL path.
  // Path-style URLs (https://<endpoint>/<bucket>/<key>) carry the bucket as the first
  // segment, virtual-hosted-style URLs do not — try both candidates.
  try {
    const pathname = new URL(url).pathname.slice(1);
    const withoutBucket = pathname.split('/').slice(1).join('/');
    const candidates = [pathname, withoutBucket].filter(
      (key, index, arr) => key && arr.indexOf(key) === index,
    );

    for (const key of candidates) {
      try {
        return {
          detail: '',
          image: { bytes: await fileService.getFileByteArray(key), mimeType: inferMimeType(url) },
        };
      } catch (e) {
        detail.push(`s3[${key.slice(0, 50)}]=${errText(e)}`);
      }
    }
  } catch {
    detail.push('invalidUrl');
  }

  return { detail: detail.join(' '), image: undefined };
};

export const inlineImageUrls = async (
  messages: OpenAIChatMessage[],
  fileService: FileService,
): Promise<OpenAIChatMessage[]> => {
  // Images that cannot be inlined (missing from storage, over size limit) must never
  // reach the Kimi Code endpoint as remote URLs — replace them with a text placeholder
  // so the conversation can continue.
  return Promise.all(
    messages.map(async (message) => {
      if (typeof message.content === 'string') return message;

      const content = await Promise.all(
        message.content.map(async (part) => {
          if (part.type !== 'image_url') return part;

          const url = part.image_url?.url;
          if (!url || url.startsWith('data:')) return part;

          const { image } = await tryLoadImage(url, fileService);
          if (!image) {
            return { text: '[一张图片无法加载，已跳过]', type: 'text' as const };
          }
          if (image.bytes.byteLength > MAX_INLINE_IMAGE_SIZE) {
            const sizeMB = (image.bytes.byteLength / 1024 / 1024).toFixed(1);
            return { text: `[一张 ${sizeMB}MB 的图片超出大小限制，已跳过]`, type: 'text' as const };
          }

          return { ...part, image_url: { ...part.image_url, url: toDataUrl(image.bytes, image.mimeType) } };
        }),
      );

      return { ...message, content };
    }),
  );
};
