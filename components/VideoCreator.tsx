import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateVideo } from '../services/geminiService';
import { ImageUploader } from './ImageUploader';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { InfoIcon, VideoIcon, ShareIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface VideoCreatorProps {
    initialPrompt?: string;
}

export const VideoCreator: React.FC<VideoCreatorProps> = ({ initialPrompt }) => {
    const { t } = useLanguage();

    const LOADING_MESSAGES = useMemo(() => [
        t('video.loading.1'),
        t('video.loading.2'),
        t('video.loading.3'),
        t('video.loading.4'),
        t('video.loading.5'),
    ], [t]);

    const [isKeyReady, setIsKeyReady] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);
    const [canShare, setCanShare] = useState(false);

    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '16:10'>('16:9');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const [duration, setDuration] = useState(8);
    const [allowPeople, setAllowPeople] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const [error, setError] = useState('');
    const [allowHtmlError, setAllowHtmlError] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    
    useEffect(() => {
        if (typeof navigator.share === 'function') {
            setCanShare(true);
        }
    }, []);

    useEffect(() => {
        if (initialPrompt) {
            setPrompt(initialPrompt);
        }
    }, [initialPrompt]);

    const checkKey = useCallback(async () => {
        if (window.aistudio) {
            setIsCheckingKey(true);
            try {
                const keyExists = await window.aistudio.hasSelectedApiKey();
                setIsKeyReady(keyExists);
            } catch (e) {
                console.error("Error checking for API key:", e);
                setIsKeyReady(false);
            } finally {
                setIsCheckingKey(false);
            }
        } else {
            setTimeout(checkKey, 100);
        }
    }, []);

    useEffect(() => {
        checkKey();
    }, [checkKey]);
    
    useEffect(() => {
        let interval: number;
        if (isLoading) {
            setLoadingMessage(LOADING_MESSAGES[0]);
            let i = 0;
            interval = window.setInterval(() => {
                i = (i + 1) % LOADING_MESSAGES.length;
                setLoadingMessage(LOADING_MESSAGES[i]);
            }, 4000);
        }
        return () => window.clearInterval(interval);
    }, [isLoading, LOADING_MESSAGES]);

    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setIsKeyReady(true);
    };

    const handleImageChange = (file: File | null) => {
        setImageFile(file);
        setImageUrl(file ? URL.createObjectURL(file) : null);
    };
    
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = (error) => reject(error);
        });
    };

    const handleGenerate = async () => {
        if (!prompt && !imageFile) {
            setError(t('video.error.noPromptOrImage'));
            setAllowHtmlError(false);
            return;
        }
        setIsLoading(true);
        setError('');
        setAllowHtmlError(false);
        setVideoUrl(null);
        
        try {
            let base64Image: string | undefined = undefined;
            let mimeType: string | undefined = undefined;
            if (imageFile) {
                base64Image = await fileToBase64(imageFile);
                mimeType = imageFile.type;
            }

            const url = await generateVideo(prompt, aspectRatio, duration, allowPeople, base64Image, mimeType);
            setVideoUrl(url);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setAllowHtmlError(false);
            
            if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
                setError(t('video.error.quotaExceeded'));
                setAllowHtmlError(true);
            } else if (errorMessage.includes('Requested entity was not found')) {
                setError(t('video.error.invalidKey'));
                setIsKeyReady(false);
            } else {
                setError(`${t('video.error.apiFail')} ${errorMessage}`);
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShareVideo = async () => {
        if (!videoUrl || !canShare) return;
        try {
            const response = await fetch(videoUrl);
            const blob = await response.blob();
            const file = new File([blob], 'ai-creative-suite-video.mp4', { type: 'video/mp4' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: t('share.video.title'),
                    text: prompt || t('share.video.text'),
                });
            } else {
                throw new Error("Cannot share this file type.");
            }
        } catch (error) {
            console.error('Error sharing video:', error);
            setError(t('share.error'));
            setAllowHtmlError(false);
        }
    };
    
    if (isCheckingKey) {
        return (
            <div className="flex justify-center items-center p-8 bg-gray-800/50 rounded-2xl">
                <Loader />
                <p className="ml-4 text-gray-400">{t('video.apiKey.checking')}</p>
            </div>
        )
    }

    if (!isKeyReady) {
        return (
            <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-6 py-5 rounded-2xl relative text-center">
                <InfoIcon className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                <h3 className="font-bold text-xl mb-2 text-white">{t('video.apiKey.required.title')}</h3>
                <p className="text-yellow-300/80 mb-4">
                    {t('video.apiKey.required.description')} <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-yellow-300 font-semibold hover:underline">{t('video.apiKey.required.docsLink')}</a>.
                </p>
                <button onClick={handleSelectKey} className="bg-yellow-500 text-yellow-950 font-bold py-2 px-5 rounded-lg hover:bg-yellow-400 transition-colors">
                    {t('video.apiKey.required.button')}
                </button>
            </div>
        );
    }
    
    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700 backdrop-blur-sm flex flex-col gap-6">
             <style>{`
                .range-thumb::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    background: #22d3ee;
                    cursor: pointer;
                    border-radius: 50%;
                    margin-top: -7px;
                }

                .range-thumb::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    background: #22d3ee;
                    cursor: pointer;
                    border-radius: 50%;
                }
            `}</style>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {t('video.title')}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-400">{t('video.description')}</p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('video.placeholder.prompt')}
                        className="w-full h-28 p-3 bg-gray-900/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                    />
                    <ImageUploader onImageChange={handleImageChange} imageUrl={imageUrl} />
                </div>
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('video.label.aspectRatio')}</label>
                        <div className="flex gap-2">
                            {(['16:9', '16:10'] as const).map((ratio) => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio)}
                                    className={`flex-1 py-2 px-2 text-sm rounded-lg border-2 transition-colors ${aspectRatio === ratio ? 'bg-cyan-500 border-cyan-500 text-white font-semibold' : 'bg-gray-700 border-gray-600 hover:border-gray-500'}`}>
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="duration-slider" className="block text-sm font-medium text-gray-300 mb-2">
                            {t('video.label.duration')} <span className="font-bold text-cyan-400">{duration}s</span>
                        </label>
                        <input
                            id="duration-slider"
                            type="range"
                            min="5"
                            max="8"
                            step="1"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-thumb"
                        />
                    </div>

                    <div className="flex items-center justify-between bg-gray-900/70 p-3 rounded-lg border border-gray-600">
                        <label htmlFor="allow-people-toggle" className="text-sm font-medium text-gray-300">
                            {t('video.label.allowPeople')}
                        </label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="allow-people-toggle"
                                checked={allowPeople}
                                onChange={(e) => setAllowPeople(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                    </div>


                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="w-full bg-cyan-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg mt-2"
                    >
                        {isLoading ? <Loader /> : <VideoIcon className="w-5 h-5" />}
                        {isLoading ? t('video.button.generating') : t('video.button.generate')}
                    </button>

                    <div className="w-full aspect-video bg-gray-900/70 rounded-xl flex items-center justify-center border border-gray-700 relative mt-2">
                        {isLoading ? (
                            <div className="text-center p-4">
                                <Loader />
                                <p className="mt-4 text-gray-400 animate-pulse">{loadingMessage}</p>
                            </div>
                        ) : videoUrl ? (
                            <>
                                <video src={videoUrl} controls autoPlay muted loop className="w-full h-full object-contain rounded-xl" />
                                {canShare && (
                                     <button
                                        onClick={handleShareVideo}
                                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors z-10"
                                        title={t('share.buttonTitle')}
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500">{t('video.placeholder.result')}</p>
                        )}
                    </div>
                </div>
            </div>
            {error && <ErrorMessage message={error} allowHtml={allowHtmlError} />}
        </div>
    );
};