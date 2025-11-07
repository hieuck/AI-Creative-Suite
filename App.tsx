
import React, { useState } from 'react';
import { GitHubIcon, VideoIcon, ImageIcon, StoryIcon, IdeaIcon } from './components/icons';
import { VideoCreator } from './components/VideoCreator';
import { StoryCreator } from './components/StoryCreator';
import { ImageGenerator } from './components/ImageGenerator';
import { IdeaGenerator } from './components/IdeaGenerator';
import { useLanguage } from './contexts/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';


type Tab = 'story' | 'idea' | 'image' | 'video';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('story');
    const [videoPrompt, setVideoPrompt] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const { t } = useLanguage();

    const sendPromptToVideoCreator = (prompt: string) => {
        setVideoPrompt(prompt);
        setActiveTab('video');
    };
    
    const sendPromptToImageGenerator = (prompt: string) => {
        setImagePrompt(prompt);
        setActiveTab('image');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'story':
                return <StoryCreator sendPromptToVideoCreator={sendPromptToVideoCreator} />;
            case 'idea':
                return <IdeaGenerator sendPromptToImageGenerator={sendPromptToImageGenerator} sendPromptToVideoCreator={sendPromptToVideoCreator} />;
            case 'image':
                return <ImageGenerator initialPrompt={imagePrompt} sendPromptToVideoCreator={sendPromptToVideoCreator} />;
            case 'video':
                return <VideoCreator initialPrompt={videoPrompt} />;
            default:
                return null;
        }
    };

    const tabs: { id: Tab; labelKey: string; icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string }[] = [
        { id: 'story', labelKey: 'tab.story', icon: StoryIcon, color: 'purple' },
        { id: 'idea', labelKey: 'tab.idea', icon: IdeaIcon, color: 'pink' },
        { id: 'image', labelKey: 'tab.image', icon: ImageIcon, color: 'amber' },
        { id: 'video', labelKey: 'tab.video', icon: VideoIcon, color: 'cyan' },
    ];

    const getTabClasses = (tabId: Tab, color: string) => {
        const isActive = activeTab === tabId;
        const colorClasses: { [key: string]: string } = {
            purple: 'border-purple-500 text-purple-400',
            pink: 'border-pink-500 text-pink-400',
            amber: 'border-amber-500 text-amber-400',
            cyan: 'border-cyan-500 text-cyan-400'
        };
        const hoverColorClasses: { [key: string]: string } = {
             purple: 'hover:bg-purple-900/50 hover:text-purple-300',
             pink: 'hover:bg-pink-900/50 hover:text-pink-300',
             amber: 'hover:bg-amber-900/50 hover:text-amber-300',
             cyan: 'hover:bg-cyan-900/50 hover:text-cyan-300'
        }

        return `w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 font-semibold text-gray-300 border-b-2 transition-all duration-300
            ${isActive ? colorClasses[color] : `border-transparent ${hoverColorClasses[color]}`}`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
            <main className="w-full max-w-5xl mx-auto flex flex-col gap-6">
                 <header className="w-full">
                    <div className="w-full flex justify-end mb-2">
                        <LanguageSwitcher />
                    </div>
                    <div className="text-center">
                        <div className="flex justify-center items-center gap-4">
                            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400">
                                {t('app.title')}
                            </h1>
                            <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                                <GitHubIcon className="w-8 h-8" />
                            </a>
                        </div>
                        <p className="mt-2 text-lg text-gray-400">{t('app.description')}</p>
                    </div>
                </header>

                <nav className="w-full bg-gray-800/50 rounded-xl p-1 border border-gray-700 backdrop-blur-sm flex justify-around">
                    {tabs.map(({ id, labelKey, icon: Icon, color }) => (
                         <button key={id} onClick={() => setActiveTab(id)} className={getTabClasses(id, color)}>
                            <Icon className="w-5 h-5" />
                            <span className="hidden sm:inline">{t(labelKey)}</span>
                         </button>
                    ))}
                </nav>
                
                <div className="mt-2">
                    {renderContent()}
                </div>

            </main>
        </div>
    );
};

export default App;
