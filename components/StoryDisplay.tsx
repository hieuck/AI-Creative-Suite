
import React from 'react';
import { SpeakerIcon, StopIcon } from './icons';
import { Loader } from './Loader';
import { useLanguage } from '../contexts/LanguageContext';

interface StoryDisplayProps {
  story: string;
  onReadAloud: () => void;
  isPlaying: boolean;
  isLoadingAudio: boolean;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, onReadAloud, isPlaying, isLoadingAudio }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-gray-900/70 rounded-xl p-6 flex flex-col h-full border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-200">{t('story.title')}</h2>
        {story && (
          <button
            onClick={onReadAloud}
            disabled={isLoadingAudio}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            aria-label={isPlaying ? t('story.aria.stop') : t('story.aria.read')}
          >
            {isLoadingAudio ? (
              <Loader size="small" />
            ) : isPlaying ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <SpeakerIcon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      <div className="prose prose-invert prose-p:text-gray-300 flex-grow overflow-y-auto min-h-[150px] pr-2 custom-scrollbar">
        {story ? (
          <p>{story}</p>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>{t('story.placeholder')}</p>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4f46e5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6366f1;
        }
      `}</style>
    </div>
  );
};