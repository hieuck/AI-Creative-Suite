
import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageUploaderProps {
  onImageChange: (file: File | null) => void;
  imageUrl: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageChange, imageUrl }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useLanguage();

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageChange(file);
      }
    }
  }, [onImageChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageChange(e.target.files[0]);
    }
  };


  return (
    <div className="w-full">
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed transition-all duration-300
          ${isDragging ? 'border-indigo-500 bg-indigo-900/50' : 'border-gray-600 hover:border-indigo-500'}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Story inspiration" className="absolute h-full w-full object-cover rounded-xl" />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <UploadIcon className="w-12 h-12 text-gray-500 mb-2" />
            <p className="font-semibold text-gray-300">
              <span className="text-indigo-400">{t('uploader.label')}</span> {t('uploader.prompt')}
            </p>
            <p className="text-xs text-gray-500">{t('uploader.types')}</p>
          </div>
        )}
        <input
          type="file"
          id="image-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};