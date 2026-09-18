import { type OpenAIChatMessage } from '@lobechat/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type FileService } from '@/server/services/file';

import { inlineImageUrls } from './inlineImages';

const pngBytes = new Uint8Array([137, 80, 78, 71]);
const pngBase64 = Buffer.from(pngBytes).toString('base64');

const imageMessage = (url: string): OpenAIChatMessage => ({
  content: [
    { text: 'hi', type: 'text' },
    { image_url: { url }, type: 'image_url' },
  ],
  role: 'user',
});

const mockFileService = () =>
  ({ getFileByteArray: vi.fn().mockResolvedValue(pngBytes) }) as unknown as FileService;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('inlineImageUrls', () => {
  it('should leave string content untouched', async () => {
    const messages: OpenAIChatMessage[] = [{ content: 'hello', role: 'user' }];
    const result = await inlineImageUrls(messages, mockFileService());
    expect(result).toEqual(messages);
  });

  it('should leave data URLs untouched', async () => {
    const url = 'data:image/png;base64,abc123';
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await inlineImageUrls([imageMessage(url)], mockFileService());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect((result[0].content as any[])[1].image_url.url).toBe(url);
  });

  it('should inline publicly accessible image URLs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(pngBytes, { headers: { 'content-type': 'image/png' }, status: 200 }),
      ),
    );

    const result = await inlineImageUrls([imageMessage('https://example.com/a.png')], mockFileService());

    expect((result[0].content as any[])[1].image_url.url).toBe(`data:image/png;base64,${pngBase64}`);
  });

  it('should fall back to storage when the URL is not publicly accessible', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 400 })));
    const fileService = mockFileService();

    const result = await inlineImageUrls(
      [imageMessage('https://bucket.r2.cloudflarestorage.com/files/1/a.png')],
      fileService,
    );

    expect(fileService.getFileByteArray).toHaveBeenCalledWith('files/1/a.png');
    expect((result[0].content as any[])[1].image_url.url).toBe(`data:image/png;base64,${pngBase64}`);
  });

  it('should keep the original URL when nothing can load the image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const fileService = {
      getFileByteArray: vi.fn().mockRejectedValue(new Error('no such key')),
    } as unknown as FileService;

    const url = 'https://bucket.r2.cloudflarestorage.com/files/1/gone.png';
    const result = await inlineImageUrls([imageMessage(url)], fileService);

    expect((result[0].content as any[])[1].image_url.url).toBe(url);
  });
});
