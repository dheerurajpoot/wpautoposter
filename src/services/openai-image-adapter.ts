import { redactErrorBody } from './gemini-adapter';

export interface OpenAIImageGenOptions {
    apiKey: string;
    model: string;
    prompt: string;
}

export interface OpenAIImageGenResult {
    image_base64: string;
    mime_type: string;
}

export async function generateOpenAIImage(
    options: OpenAIImageGenOptions
): Promise<OpenAIImageGenResult> {
    if (!options.apiKey) {
        throw new Error('openai_image_error: missing OPENAI_API_KEY');
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
            model: options.model,
            prompt: options.prompt,
            size: '1536x1024',
            quality: 'low',
            output_format: 'png',
            n: 1,
        }),
    });

    if (!response.ok) {
        const errorBody = redactErrorBody(await response.text());
        throw new Error(`openai_image_error: HTTP ${response.status}: ${errorBody}`);
    }

    const result = await response.json() as {
        data?: Array<{ b64_json?: string }>;
    };

    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
        throw new Error('openai_image_error: no image data returned');
    }

    return {
        image_base64: imageBase64,
        mime_type: 'image/png',
    };
}
