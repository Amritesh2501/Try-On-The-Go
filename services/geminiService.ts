
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    // Find the first image part in any candidate
    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const systemInstruction = "You are an expert fashion photographer AI. Your goal is to transform regular photos into professional e-commerce model shots.";
    const prompt = "Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be a clean, neutral stone-colored studio backdrop. The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic. Return ONLY the final image.";
    
    const response = await ai.models.generateContent({
        model,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            systemInstruction
        },
    });
    return handleApiResponse(response);
};

export const generateVirtualTryOnImage = async (modelImageUrl: string, garmentImage: File): Promise<string> => {
    const modelImagePart = dataUrlToPart(modelImageUrl);
    const garmentImagePart = await fileToPart(garmentImage);
    
    const systemInstruction = "You are a specialized virtual try-on assistant. Your sole job is to photorealistically modify the clothing of a person in an image.";
    
    const prompt = `Perform a virtual try-on task.
    
    Input Image 1: The 'Model'.
    Input Image 2: The 'Garment' to be worn.
    
    Instructions:
    1. Identify the garment shown in Input Image 2.
    2. Replace the top/clothing worn by the Model in Input Image 1 with the Garment from Input Image 2.
    3. Ensure the Garment fits the Model's body shape and pose naturally. Apply realistic lighting, shadows, and fabric folds.
    4. CRITICAL: Preserve the Model's face, hair, skin tone, hands, and the original background EXACTLY as they are. Do not change the person's identity.
    5. Return ONLY the final, edited image.`;

    const response = await ai.models.generateContent({
        model,
        // The order of parts implies the inputs referenced in the prompt
        contents: { parts: [modelImagePart, garmentImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            systemInstruction
        },
    });
    return handleApiResponse(response);
};

export const generatePoseVariation = async (tryOnImageUrl: string, poseInstruction: string): Promise<string> => {
    const tryOnImagePart = dataUrlToPart(tryOnImageUrl);
    
    const systemInstruction = "You are an expert fashion photographer AI. You specialize in generating different angles and poses for fashion models.";

    const prompt = `Regenerate this image from a different perspective.
    
    Target Pose: "${poseInstruction}".
    
    Instructions:
    1. Keep the person, their clothing, and the background style EXACTLY the same.
    2. Change ONLY the pose and camera angle to match the Target Pose.
    3. Ensure photorealistic quality.
    4. Return ONLY the final image.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [tryOnImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            systemInstruction
        },
    });
    return handleApiResponse(response);
};

export const generateSceneVariation = async (currentImageUrl: string, sceneDescription: string): Promise<string> => {
    const imagePart = dataUrlToPart(currentImageUrl);
    
    const systemInstruction = "You are an expert digital artist. Your goal is to change the background of an image while preserving the foreground subject exactly.";

    const prompt = `Change the background of this image.
    
    Target Scene: "${sceneDescription}".
    
    Instructions:
    1. Keep the person (model) and their clothing EXACTLY as they appear in the original image. Do not change their pose, lighting on the body, or facial features.
    2. Replace the current background with a high-quality, photorealistic representation of the Target Scene.
    3. Ensure the lighting of the background matches the lighting of the subject realistically.
    4. Return ONLY the final image.`;

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            systemInstruction
        },
    });
    return handleApiResponse(response);
};
