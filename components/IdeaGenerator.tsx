
import React, { useState } from 'react';
import { generateIdeas } from '../services/geminiService';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { MagicIcon, ImageIcon, VideoIcon } from './icons';
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

    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');
        setIdeas([]);
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
                disabled={isLoading}
                className="w-full max-w-sm mx-auto bg-pink-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-pink-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 ease-in-out flex items-center justify-center gap-2 shadow-lg"
            >
                {isLoading ? <Loader /> : <MagicIcon className="w-5 h-5" />}
                {isLoading ? t('idea.button.generating') : t('idea.button.generate')}
            </button>

            {error && <ErrorMessage message={error} />}

            <div className="mt-4">
                {ideas.length > 0 ? (
                    <ul className="space-y-4">
                        {ideas.map((idea, index) => (
                            <li key={index} className="bg-gray-900/70 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
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
