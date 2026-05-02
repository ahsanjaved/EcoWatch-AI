import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Camera } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageDropzoneProps {
  onImageSelect: (file: File) => void;
  isProcessing: boolean;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageSelect, isProcessing }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageSelect(acceptedFiles[0]);
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    multiple: false,
    disabled: isProcessing
  });

  return (
    <div
      {...getRootProps()}
      id="dropzone-root"
      className={cn(
        'relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300',
        'flex flex-col items-center justify-center p-12 text-center',
        isDragActive 
          ? 'border-emerald-500 bg-emerald-500/10' 
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900',
        isProcessing && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} id="dropzone-input" />
      
      <div className="relative z-10">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-400 group-hover:scale-110 transition-transform duration-300">
          {isDragActive ? <Upload className="h-8 w-8 text-emerald-400" /> : <Camera className="h-8 w-8" />}
        </div>
        
        <h3 className="mb-2 text-xl font-medium text-white">
          {isDragActive ? 'Drop your image here' : 'Capture Environment Data'}
        </h3>
        
        <p className="max-w-xs text-sm text-slate-400">
          {isProcessing 
            ? 'Analyzing environmental biosignatures...' 
            : 'Unload or drag environmental photographs to initiate AI forensic monitoring.'}
        </p>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-4 left-4 h-4 w-4 border-t border-l border-slate-700" />
      <div className="absolute top-4 right-4 h-4 w-4 border-t border-r border-slate-700" />
      <div className="absolute bottom-4 left-4 h-4 w-4 border-b border-l border-slate-700" />
      <div className="absolute bottom-4 right-4 h-4 w-4 border-b border-r border-slate-700" />
    </div>
  );
};
