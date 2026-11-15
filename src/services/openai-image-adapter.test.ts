import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateOpenAIImage } from './openai-image-adapter';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('generateOpenAIImage', () => {
    it('sends the correct request and returns image data', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [{ b64_json: 'dGVzdC1pbWFnZQ==' }],
            }),
        });

        vi.stubGlobal('fetch', mockFetch);

        const result = await generateOpenAIImage({
            apiKey: 'test-openai-key',
            model: 'test-image-model',
            prompt: 'A test image',
        });

        expect(mockFetch).toHaveBeenCalledOnce();

        const [url, options] = mockFetch.mock.calls[0] as [
            string,
            RequestInit
        ];

        expect(url).toBe('https://api.openai.com/v1/images/generations');
        expect(options.method).toBe('POST');
        expect((options.headers as Record<string, string>).Authorization)
            .toBe('Bearer test-openai-key');

        const body = JSON.parse(options.body as string);
        expect(body.model).toBe('test-image-model');
        expect(body.prompt).toBe('A test image');
        expect(body.n).toBe(1);

        expect(result).toEqual({
            image_base64: 'dGVzdC1pbWFnZQ==',
            mime_type: 'image/png',
        });
    });

    it('rejects when the API key is missing', async () => {
        const mockFetch = vi.fn();
        vi.stubGlobal('fetch', mockFetch);

        await expect(
            generateOpenAIImage({
                apiKey: '',
                model: 'test-image-model',
                prompt: 'Test',
            })
        ).rejects.toThrow('missing OPENAI_API_KEY');

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('redacts API keys from HTTP errors', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            text: async () =>
                'Invalid key sk-proj-1234567890abcdefghijklmnop',
        });

        vi.stubGlobal('fetch', mockFetch);

        await expect(
            generateOpenAIImage({
                apiKey: 'test-openai-key',
                model: 'test-image-model',
                prompt: 'Test',
            })
        ).rejects.toThrow('openai_image_error: HTTP 401');

        try {
            await generateOpenAIImage({
                apiKey: 'test-openai-key',
                model: 'test-image-model',
                prompt: 'Test',
            });
        } catch (error) {
            expect((error as Error).message)
                .not.toContain('sk-proj-1234567890');
            expect((error as Error).message)
                .toContain('[REDACTED_KEY]');
        }
    });

    it('rejects when the API returns no image data', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        vi.stubGlobal('fetch', mockFetch);

        await expect(
            generateOpenAIImage({
                apiKey: 'test-openai-key',
                model: 'test-image-model',
                prompt: 'Test',
            })
        ).rejects.toThrow('no image data returned');
    });
});
