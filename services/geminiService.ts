
import { GoogleGenAI, Modality, PersonGeneration, Type } from "@google/genai";

/**
 * Generates a list of creative prompts.
 * @returns A promise that resolves to an array of string prompts.
 */
export const generateIdeas = async (): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';
  const prompt = `Generate a list of 5 creative, visually descriptive, and unique prompts suitable for an AI image or video generator.`;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prompts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                            description: "A creative prompt"
                        }
                    }
                }
            }
        }
    });
    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr);
    if (result.prompts && Array.isArray(result.prompts)) {
        return result.prompts;
    } else {
        throw new Error("AI response did not contain a 'prompts' array.");
    }
  } catch (error) {
    console.error("Error generating ideas:", error);
    throw new Error("Failed to communicate with the AI model for idea generation.");
  }
};


/**
 * Generates a story opening based on an image.
 * @param base64ImageData The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the generated story text.
 */
export const generateStoryFromImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';
  const prompt = `Analyze the mood, scene, and any characters in this image. Based on your analysis, write an evocative opening paragraph for a story set in this world. The paragraph should be rich in sensory details, establish a clear tone, and draw the reader in.`;

  const imagePart = {
    inlineData: {
      data: base64ImageData,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: prompt,
  };

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] },
    });
    return response.text;
  } catch (error) {
    console.error("Error generating story from image:", error);
    throw new Error("Failed to communicate with the AI model.");
  }
};

/**
 * Converts text to speech using the Gemini TTS model.
 * @param text The text to convert to speech.
 * @returns A promise that resolves to the base64 encoded audio data.
 */
export const generateSpeechFromText = async (text: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash-preview-tts";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: `Read this with an expressive, narrative voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      return base64Audio;
    } else {
      throw new Error("No audio data received from the AI model.");
    }

  } catch (error) {
    console.error("Error generating speech from text:", error);
    throw new Error("Failed to communicate with the TTS AI model.");
  }
};

/**
 * Generates an image from a text prompt.
 * @param prompt The text prompt for the image.
 * @param aspectRatio The desired aspect ratio.
 * @returns A promise that resolves to a data URL for the generated image.
 */
export const generateImageFromPrompt = async (
  prompt: string,
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
): Promise<string> => {
  const imageAI = new GoogleGenAI({ apiKey: process.env.API_KEY }); 
  try {
    const response = await imageAI.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
    });

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    if (!base64ImageBytes) {
      throw new Error("Image generation succeeded, but no image data was returned.");
    }
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred during image generation.");
  }
};

/**
 * Generates a video from a prompt and optional starting image.
 * @param prompt The text prompt for the video.
 * @param aspectRatio The desired aspect ratio ('16:9' or '16:10').
 * @param duration The duration of the video in seconds (5-8).
 * @param allowPeople Whether to allow generation of people.
 * @param base64Image Optional base64 encoded starting image.
 * @param mimeType Optional MIME type for the starting image.
 * @returns A promise that resolves to an object URL for the generated video.
 */
export const generateVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '16:10',
  duration: number,
  allowPeople: boolean,
  base64Image?: string,
  mimeType?: string
): Promise<string> => {
  // Capture the API key at the start of the operation to ensure consistency.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API key is not available.");
  }
  
  const videoAI = new GoogleGenAI({ apiKey });
  
  const requestPayload: any = {
    model: 'veo-2.0-generate-001',
    prompt,
    config: {
      numberOfVideos: 1,
      aspectRatio: aspectRatio,
      durationSeconds: duration,
      personGeneration: allowPeople ? PersonGeneration.ALLOW_ALL : PersonGeneration.DISALLOW_ALL
    }
  };

  if (base64Image && mimeType) {
    requestPayload.image = {
      imageBytes: base64Image,
      mimeType: mimeType,
    };
  }

  try {
    let operation = await videoAI.models.generateVideos(requestPayload);

    while (!operation.done) {
      // Per documentation, poll every 10 seconds for video operations.
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Use the same client (and thus the same key) for polling.
      operation = await videoAI.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation succeeded, but no download link was provided.");
    }
    
    // Use the same API key that started the operation to download the result.
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to download video: ${response.statusText}. Details: ${errorBody}`);
    }
    
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error) {
    console.error("Error generating video:", error);
    if (error instanceof Error) {
        throw error; // Re-throw the original error to be handled by the UI
    }
    throw new Error("An unknown error occurred during video generation.");
  }
};
