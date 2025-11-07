
import React, { useState, useRef, useCallback } from 'react';
import { generateStoryFromImage, generateSpeechFromText } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { ImageUploader } from './ImageUploader';
import { StoryDisplay } from './StoryDisplay';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { useLanguage } from '../contexts/LanguageContext';
import { VideoIcon } from './icons';

interface StoryCreatorProps {
    sendPromptToVideoCreator: (prompt: string) => void;
}

export const StoryCreator: React.FC<StoryCreatorProps> = ({ sendPromptToVideoCreator }) => {
    const { t } = useLanguage();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [story, setStory] = useState<string>('');
    const [isLoadingStory, setIsLoadingStory] = useState<boolean>(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const handleImageChange = (file: File | null) => {
        if (file) {
            setImageFile(file);
            setImageUrl(URL.createObjectURL(file));
            setStory('');
            setError('');
        }
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleGenerateStory = useCallback(async () => {
        if (!imageFile) {
            setError(t('story.error.noImage'));
            return;
        }

        setIsLoadingStory(true);
        setError('');
        setStory('');
        if (isPlaying) {
            audioSourceRef.current?.stop();
            setIsPlaying(false);
        }

        try {
            const base64Image = await fileToBase64(imageFile);
            const mimeType = imageFile.type;
            const generatedStory = await generateStoryFromImage(base64Image, mimeType);
            setStory(generatedStory);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`${t('story.error.apiFail')} ${errorMessage}`);
            console.error(err);
        } finally {
            setIsLoadingStory(false);
        }
    }, [imageFile, isPlaying, t]);

    const handleReadAloud = useCallback(async () => {
        if (!story) {
            return;
        }

        if (isPlaying) {
            audioSourceRef.current?.stop();
            setIsPlaying(false);
            return;
        }

        setIsLoadingAudio(true);
        setError('');

        try {
            const base64Audio = await generateSpeechFromText(story);

            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContext({ sampleRate: 24000 });
            }
            const context = audioContextRef.current;

            const decodedData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedData, context, 24000, 1);

            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.start();
            setIsPlaying(true);
            audioSourceRef.current = source;

            source.onended = () => {
                setIsPlaying(false);
                audioSourceRef.current = null;
            };

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`${t('story.error.audioFail')} ${errorMessage}`);
            console.error(err);
        } finally {
            setIsLoadingAudio(false);
        }
    }, [story, isPlaying, t]);

    const handleSendToVideo = () => {
        if (story) {
            sendPromptToVideoCreator(story);
        }
    };

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700 backdrop-blur-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col gap-4">
                    <ImageUploader
                        onImageChange={handleImageChange}
                        imageUrl={imageUrl}
                    />
                    <button
                        onClick={handleGenerateStory}
                        disabled={!imageFile || isLoadingStory}
                        className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg"
                    >
                        {isLoadingStory ? <Loader /> : t('story.button.weave')}
                    </button>
                    {story && !isLoadingStory && (
                        <button
                            onClick={handleSendToVideo}
                            className="w-full bg-cyan-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-cyan-500 transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg"
                            title={t('story.button.sendToVideoTitle')}
                        >
                            <VideoIcon className="w-5 h-5" />
                            <span>{t('story.button.sendToVideo')}</span>
                        </button>
                    )}
                </div>

                <div className="flex flex-col h-full">
                     {isLoadingStory ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 min-h-[200px] bg-gray-900/70 rounded-xl border border-gray-700">
                            <Loader />
                            <p className="mt-2 animate-pulse">{t('story.loading')}</p>
                        </div>
                    ) : (
                        <StoryDisplay
                            story={story}
                            onReadAloud={handleReadAloud}
                            isPlaying={isPlaying}
                            isLoadingAudio={isLoadingAudio}
                        />
                    )}
                </div>
            </div>
             {error && <div className="mt-6"><ErrorMessage message={error} /></div>}
        </div>
    );
};
