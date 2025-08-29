import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GeneratedTextContent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTextContent = async (title: string): Promise<GeneratedTextContent> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert YouTube content strategist. A creator has a video idea with the working title: "${title}". Your task is to generate the following assets in JSON format: 1. seoTitle: A highly engaging and SEO-optimized title that will attract clicks. 2. description: A detailed and compelling YouTube video description. It should include a hook at the beginning, a summary of the video, relevant keywords, and placeholder calls-to-action (e.g., for subscribing or following on social media). Format it with paragraphs for readability.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seoTitle: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["seoTitle", "description"],
        },
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as GeneratedTextContent;
  } catch (error) {
    console.error("Error generating text content:", error);
    throw new Error("Failed to generate video details from AI.");
  }
};


export const generateImageFromText = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No thumbnail was generated.");
        }
    } catch (error) {
        console.error("Error generating thumbnail:", error);
        throw new Error("Failed to generate thumbnail from AI.");
    }
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType = part.inlineData.mimeType;
                return `data:${newMimeType};base64,${base64ImageBytes}`;
            }
        }
        throw new Error("The AI did not return an image. It may have refused the request.");

    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image with AI.");
    }
};