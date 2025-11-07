import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ErrorMessageProps {
  message: string;
  allowHtml?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, allowHtml = false }) => {
  const { t } = useLanguage();
  if (!message) return null;

  return (
    <div
      className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative"
      role="alert"
    >
      <strong className="font-bold">{t('error.prefix')} </strong>
      {allowHtml ? (
        <span className="block sm:inline" dangerouslySetInnerHTML={{ __html: message }} />
      ) : (
        <span className="block sm:inline">{message}</span>
      )}
    </div>
  );
};
