
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { generateImageFromPrompt } from '../services/geminiService';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { ImageIcon, VideoIcon, MagicIcon, InfoIcon, ShareIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageGeneratorProps {
    sendPromptToVideoCreator: (prompt: string) => void;
}

interface ImageHistoryItem {
  imageUrl: string;
  prompt: string;
  aspectRatio: '1:1' | '16:9' | '9:16';
}

const MAX_HISTORY_ITEMS = 6;

const randomPrompts = [
    'A majestic cat astronaut exploring a neon-lit alien jungle',
    'A steampunk city on the back of a giant turtle, floating through the clouds',
    'An enchanted library where the books fly and whisper ancient secrets',
    'A robot chef in a high-tech kitchen, flipping pancakes with laser precision',
    'A serene underwater world with glowing coral reefs and mythical sea creatures',
    'A portrait of a knight made of flowers and vines, holding a sword of light',
    'A cozy hobbit hole in the side of a hill during a vibrant sunset',
    'A futuristic cityscape at night, with flying cars and holographic advertisements',
    'A mystical wolf with fur made of nebulae and stars, howling at a crystal moon',
    'A whimsical candy land with chocolate rivers and lollipop trees'
];

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({ sendPromptToVideoCreator }) => {
    const { t } = useLanguage();
    
    const LOADING_MESSAGES = useMemo(() => [
        t('image.loading.1'),
        t('image.loading.2'),
        t('image.loading.3'),
        t('image.loading.4'),
    ], [t]);

    const [isKeyReady, setIsKeyReady] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);
    const [canShare, setCanShare] = useState(false);

    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
    const [error, setError] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [history, setHistory] = useState<ImageHistoryItem[]>([]);

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
        if (typeof navigator.share === 'function') {
            setCanShare(true);
        }
    }, []);

    useEffect(() => {
        checkKey();
    }, [checkKey]);
    
    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('imageGenHistory');
            if (storedHistory) {
                setHistory(JSON.parse(storedHistory));
            }
        } catch (e) {
            console.error("Failed to load image history from localStorage", e);
            localStorage.removeItem('imageGenHistory');
        }
    }, []);

    useEffect(() => {
        let interval: number;
        if (isLoading) {
            setLoadingMessage(LOADING_MESSAGES[0]);
            let i = 0;
            interval = window.setInterval(() => {
                i = (i + 1) % LOADING_MESSAGES.length;
                setLoadingMessage(LOADING_MESSAGES[i]);
            }, 3000);
        }
        return () => window.clearInterval(interval);
    }, [isLoading, LOADING_MESSAGES]);
    
    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setIsKeyReady(true);
        setError(''); // Clear previous errors
    };


    const generate = async (currentPrompt: string) => {
        if (!currentPrompt) {
            setError(t('image.error.noPrompt'));
            return;
        }
        setIsLoading(true);
        setError('');
        setImageUrl(null);
        
        try {
            const serviceAspectRatio = aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
            const url = await generateImageFromPrompt(currentPrompt, serviceAspectRatio);
            setImageUrl(url);

            const newHistoryItem: ImageHistoryItem = { imageUrl: url, prompt: currentPrompt, aspectRatio };
            setHistory(prevHistory => {
                const updatedHistory = [newHistoryItem, ...prevHistory.filter(item => item.imageUrl !== url)].slice(0, MAX_HISTORY_ITEMS);
                try {
                    localStorage.setItem('imageGenHistory', JSON.stringify(updatedHistory));
                } catch (e) {
                    console.error("Failed to save image history to localStorage", e);
                }
                return updatedHistory;
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
             if (errorMessage.includes('billed users') || errorMessage.includes('Requested entity was not found')) {
                setError(t('image.error.billingRequired'));
                setIsKeyReady(false);
            } else {
                 setError(`${t('image.error.apiFail')} ${errorMessage}`);
            }
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerate = () => {
        generate(prompt);
    };

    const handleRandomGenerate = () => {
        const randomIndex = Math.floor(Math.random() * randomPrompts.length);
        const randomPrompt = randomPrompts[randomIndex];
        setPrompt(randomPrompt);
        generate(randomPrompt);
    };

    const handleSendToVideo = () => {
        if (prompt) {
            sendPromptToVideoCreator(prompt);
        }
    };
    
    const handleHistoryClick = (item: ImageHistoryItem) => {
        setPrompt(item.prompt);
        setAspectRatio(item.aspectRatio);
        setImageUrl(item.imageUrl);
        setError('');
    };

    const handleShareImage = async () => {
        if (!imageUrl || !canShare) return;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'ai-creative-suite-image.jpg', { type: blob.type });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                 await navigator.share({
                    files: [file],
                    title: t('share.image.title'),
                    text: prompt || t('share.image.text'),
                });
            } else {
                throw new Error("Cannot share this file type.");
            }
        } catch (error) {
            console.error('Error sharing image:', error);
            setError(t('share.error'));
        }
    };

    if (isCheckingKey) {
        return (
            <div className="flex justify-center items-center p-8 bg-gray-800/50 rounded-2xl">
                <Loader />
                <p className="ml-4 text-gray-400">{t('image.apiKey.checking')}</p>
            </div>
        )
    }

    if (!isKeyReady) {
        return (
             <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-6 py-5 rounded-2xl relative text-center">
                <InfoIcon className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                <h3 className="font-bold text-xl mb-2 text-white">{t('image.apiKey.required.title')}</h3>
                <p className="text-yellow-300/80 mb-4">
                    {t('image.apiKey.required.description')} <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-yellow-300 font-semibold hover:underline">{t('image.apiKey.required.docsLink')}</a>.
                </p>
                <button onClick={handleSelectKey} className="bg-yellow-500 text-yellow-950 font-bold py-2 px-5 rounded-lg hover:bg-yellow-400 transition-colors">
                    {t('image.apiKey.required.button')}
                </button>
                 {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700 backdrop-blur-sm flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-400">{t('image.description')}</p>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t('image.placeholder')}
                        className="w-full h-40 p-3 bg-gray-900/70 border border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
                        rows={5}
                    />
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('image.label.aspectRatio')}</label>
                        <div className="flex gap-4">
                            {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio)}
                                    className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${aspectRatio === ratio ? 'bg-amber-500 border-amber-500 text-white font-semibold' : 'bg-gray-700 border-gray-600 hover:border-gray-500'}`}>
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="flex-grow bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-amber-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg"
                        >
                            {isLoading ? <Loader /> : <ImageIcon className="w-5 h-5" />}
                            {isLoading ? t('image.button.generating') : t('image.button.generate')}
                        </button>
                        <button
                            onClick={handleRandomGenerate}
                            disabled={isLoading}
                            className="flex-grow bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg"
                            title={t('image.button.randomTitle')}
                        >
                            <MagicIcon className="w-5 h-5" />
                            <span>{t('image.button.random')}</span>
                        </button>
                        <button
                            onClick={handleSendToVideo}
                            disabled={!prompt || isLoading}
                            className="flex-grow bg-cyan-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg"
                            title={t('image.button.sendToVideoTitle')}
                        >
                            <VideoIcon className="w-5 h-5" />
                            <span>{t('image.button.sendToVideo')}</span>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col gap-4 items-center justify-center">
                    <div className="w-full aspect-square bg-gray-900/70 rounded-xl flex items-center justify-center border border-gray-700 relative">
                        {isLoading ? (
                            <div className="text-center p-4">
                                <Loader />
                                <p className="mt-4 text-gray-400 animate-pulse">{loadingMessage}</p>
                            </div>
                        ) : imageUrl ? (
                            <>
                                <img src={imageUrl} alt={prompt} className="w-full h-full object-contain rounded-xl" />
                                {canShare && (
                                     <button
                                        onClick={handleShareImage}
                                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-colors z-10"
                                        title={t('share.buttonTitle')}
                                    >
                                        <ShareIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </>
                        ) : (
                            <p className="text-gray-500">{t('image.placeholder.result')}</p>
                        )}
                    </div>
                </div>
            </div>
            {error && <ErrorMessage message={error} />}

            {history.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-300 mb-4 text-center">{t('image.history.title')}</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                        {history.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => handleHistoryClick(item)}
                                className="relative aspect-square rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-amber-500"
                                title={t('image.history.tooltip')}
                            >
                                <img src={item.imageUrl} alt={item.prompt.substring(0, 30)} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
