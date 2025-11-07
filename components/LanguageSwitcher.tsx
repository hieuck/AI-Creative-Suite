
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'vi' ? 'en' : 'vi');
  };

  const buttonText = language === 'vi' ? 'VI' : 'EN';

  return (
    <div className="flex items-center">
      <button 
        onClick={toggleLanguage} 
        className="px-4 py-2 text-sm font-bold rounded-lg transition-colors bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={`Switch language to ${language === 'vi' ? 'English' : 'Tiếng Việt'}`}
      >
        {buttonText}
      </button>
    </div>
  );
};
