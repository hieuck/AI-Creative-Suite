import React, { useState, useEffect, useCallback } from 'react';
import { generateIdeas, generateImageFromPrompt, generateVideo } from '../services/geminiService';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { MagicIcon, ImageIcon, VideoIcon, InfoIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface IdeaGeneratorProps {
    sendPromptToImageGenerator: (prompt: string) => void;
    sendPromptToVideoCreator: (prompt: string) => void;
}

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ sendPromptToImageGenerator, sendPromptToVideoCreator }) => {
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [ideas, setIdeas] = useState<string[]>([]);

    const [isKeyReady, setIsKeyReady] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);

    const [generatedContent, setGeneratedContent] = useState<Record<string, { image?: string; video?: string }>>({});
    const [generatingState, setGeneratingState] = useState<Record<string, { image?: boolean; video?: boolean }>>({});
    const [batchJob, setBatchJob] = useState<{ type: 'images' | 'videos', progress: number, total: number } | null>(null);

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
    
    const handleSelectKey = async () => {
        await window.aistudio.openSelectKey();
        setIsKeyReady(true);
        setError('');
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setIdeas([]);
        setGeneratedContent({});
        setGeneratingState({});
        setBatchJob(null);
        try {
            const generatedIdeas = await generateIdeas();
            setIdeas(generatedIdeas);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`${t('idea.error.apiFail')} ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateAllImages = async () => {
        if (!isKeyReady) {
            setError(t('idea.error.apiKey'));
            return;
        }
        setError('');
        setBatchJob({ type: 'images', progress: 0, total: ideas.length });
        
        setGeneratingState(ideas.reduce((acc, idea) => ({ ...acc, [idea]: { ...generatingState[idea], image: true } }), {}));

        const imagePromises = ideas.map(idea => 
            generateImageFromPrompt(idea, '16:9').then(imageUrl => {
                setGeneratedContent(prev => ({ ...prev, [idea]: { ...prev[idea], image: imageUrl } }));
            }).catch(err => {
                console.error(`Failed to generate image for prompt: "${idea}"`, err);
            }).finally(() => {
                setBatchJob(prev => prev ? { ...prev, progress: prev.progress + 1 } : null);
                setGeneratingState(prev => ({ ...prev, [idea]: { ...prev[idea], image: false } }));
            })
        );
        
        await Promise.all(imagePromises);
        
        setBatchJob(null);
    };

    const handleGenerateAllVideos = async () => {
        if (!isKeyReady) {
            setError(t('idea.error.apiKey'));
            return;
        }
        setError('');
        setBatchJob({ type: 'videos', progress: 0, total: ideas.length });
        
        let currentProgress = 0;

        for (const idea of ideas) {
            setGeneratingState(prev => ({ ...prev, [idea]: { ...prev[idea], video: true } }));
            try {
                const videoUrl = await generateVideo(idea, '16:9', 8, true);
                setGeneratedContent(prev => ({ ...prev, [idea]: { ...prev[idea], video: videoUrl } }));
            } catch (err) {
                 const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                console.error(`Failed to generate video for prompt: "${idea}"`, err);
                setError(`${t('video.error.apiFail')} ${errorMessage}`);
                break; 
            } finally {
                currentProgress++;
                setBatchJob(prev => prev ? { ...prev, progress: currentProgress } : null);
                setGeneratingState(prev => ({ ...prev, [idea]: { ...prev[idea], video: false } }));
            }
        }
        
        setBatchJob(null);
    };
    
    if (isCheckingKey) {
        return (
            <div className="flex justify-center items-center p-8 bg-gray-800/50 rounded-2xl">
                <Loader />
                <p className="ml-4 text-gray-400">{t('idea.apiKey.checking')}</p>
            </div>
        )
    }

    if (!isKeyReady) {
        return (
             <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-200 px-6 py-5 rounded-2xl relative text-center">
                <InfoIcon className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                <h3 className="font-bold text-xl mb-2 text-white">{t('idea.apiKey.required.title')}</h3>
                <p className="text-yellow-300/80 mb-4">{t('idea.apiKey.required.description')}</p>
                <button onClick={handleSelectKey} className="bg-yellow-500 text-yellow-950 font-bold py-2 px-5 rounded-lg hover:bg-yellow-400 transition-colors">
                    {t('idea.apiKey.required.button')}
                </button>
            </div>
        );
    }


    return (
        <div className="bg-gray-800/50 rounded-2xl p-6 shadow-2xl border border-gray-700 backdrop-blur-sm flex flex-col gap-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
                    {t('idea.title')}
                </h2>
                <p className="mt-2 text-gray-400">{t('idea.description')}</p>
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={isLoading || !!batchJob}
                className="w-full max-w-sm mx-auto bg-pink-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-pink-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg"
            >
                {isLoading ? <Loader /> : <MagicIcon className="w-5 h-5" />}
                {isLoading ? t('idea.button.generating') : t('idea.button.generate')}
            </button>

            {error && <ErrorMessage message={error} />}

            <div className="mt-4">
                {ideas.length > 0 && (
                    <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
                        <button onClick={handleGenerateAllImages} disabled={!!batchJob} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                            <ImageIcon className="w-4 h-4" />
                            <span>{t('idea.button.generateAllImages')}</span>
                        </button>
                        <button onClick={handleGenerateAllVideos} disabled={!!batchJob} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm disabled:bg-gray-500 disabled:cursor-not-allowed">
                            <VideoIcon className="w-4 h-4" />
                            <span>{t('idea.button.generateAllVideos')}</span>
                        </button>
                    </div>
                )}

                 {batchJob && (
                    <div className="mb-6 px-4">
                        <p className="text-center text-gray-300 mb-2">
                           {batchJob.type === 'images' ? t('idea.generatingAllImages') : t('idea.generatingAllVideos')} 
                           ({batchJob.progress} / {batchJob.total})
                        </p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-pink-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(batchJob.progress / batchJob.total) * 100}%` }}></div>
                        </div>
                    </div>
                )}


                {ideas.length > 0 ? (
                    <ul className="space-y-4">
                        {ideas.map((idea, index) => (
                            <li key={index} className="bg-gray-900/70 p-4 rounded-lg border border-gray-700 flex flex-col gap-4 animate-fade-in">
                               <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <p className="text-gray-300 flex-grow">{idea}</p>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => sendPromptToImageGenerator(idea)} className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors text-sm" title={t('idea.button.sendToImage')}>
                                            <ImageIcon className="w-4 h-4" />
                                            <span className="hidden md:inline">{t('idea.button.sendToImage')}</span>
                                        </button>
                                        <button onClick={() => sendPromptToVideoCreator(idea)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-2 transition-colors text-sm" title={t('idea.button.sendToVideo')}>
                                            <VideoIcon className="w-4 h-4" />
                                            <span className="hidden md:inline">{t('idea.button.sendToVideo')}</span>
                                        </button>
                                    </div>
                               </div>
                               <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="aspect-video bg-gray-950 rounded-lg flex items-center justify-center relative border border-gray-800">
                                        {(generatingState[idea]?.image || (batchJob?.type === 'images' && !generatedContent[idea]?.image)) && <Loader />}
                                        {!generatingState[idea]?.image && generatedContent[idea]?.image && (
                                            <img src={generatedContent[idea]!.image} alt={`Generated image for: ${idea}`} className="w-full h-full object-contain rounded-lg" />
                                        )}
                                        {!(generatingState[idea]?.image) && !generatedContent[idea]?.image && (
                                            <ImageIcon className="w-10 h-10 text-gray-700" />
                                        )}
                                    </div>
                                    <div className="aspect-video bg-gray-950 rounded-lg flex items-center justify-center relative border border-gray-800">
                                        {(generatingState[idea]?.video || (batchJob?.type === 'videos' && !generatedContent[idea]?.video)) && <Loader />}
                                        {!generatingState[idea]?.video && generatedContent[idea]?.video && (
                                            <video src={generatedContent[idea]!.video} controls muted loop className="w-full h-full object-contain rounded-lg" />
                                        )}
                                        {!(generatingState[idea]?.video) && !generatedContent[idea]?.video && (
                                            <VideoIcon className="w-10 h-10 text-gray-700" />
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : !isLoading && (
                    <div className="text-center text-gray-500 py-10">
                        <p>{t('idea.placeholder')}</p>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
