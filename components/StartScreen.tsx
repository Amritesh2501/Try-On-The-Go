
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from './icons';
import { generateModelImage } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string) => void;
  initialImage?: string | null;
  onReset?: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized, initialImage, onReset }) => {
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(initialImage || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (initialImage) {
        setGeneratedModelUrl(initialImage);
    }
  }, [initialImage]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('Please select an image file.');
        return;
    }

    setIsGenerating(true);
    setGeneratedModelUrl(null);
    setError(null);
    try {
        const result = await generateModelImage(file);
        setGeneratedModelUrl(result);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'Failed to create model'));
    } finally {
        setIsGenerating(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setError(null);
    if (onReset) onReset();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="content"
        className="w-full h-full max-w-4xl mx-auto flex flex-col items-center justify-center px-6 overflow-hidden relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header Text - Flexible height, shrinks if needed */}
        {!generatedModelUrl && !isGenerating && (
          <motion.div variants={itemVariants} className="text-center mb-6 md:mb-12 flex-shrink-0 z-10">
            <h1 className="text-4xl md:text-7xl font-serif text-gray-900 dark:text-stone-50 mb-4 leading-tight">
              Virtual <br className="hidden md:block" />
              <span className="italic text-gray-600 dark:text-stone-400">Fitting Room</span>
            </h1>
            <p className="text-gray-500 dark:text-stone-400 font-sans text-base md:text-lg max-w-md mx-auto hidden sm:block">
              Upload a photo to create your digital twin and start styling instantly.
            </p>
          </motion.div>
        )}

        {/* State 1: Upload (Initial) */}
        {!isGenerating && !generatedModelUrl && (
          <motion.div variants={itemVariants} className="w-full max-w-md flex-shrink-1 min-h-0 flex flex-col items-center justify-center">
             <div 
                className={`relative w-full aspect-[4/5] md:aspect-square max-h-[50vh] bg-white dark:bg-stone-900 rounded-3xl border-2 transition-all duration-300 ease-out flex flex-col items-center justify-center gap-6 group overflow-hidden shadow-sm hover:shadow-xl ${isHovering ? 'border-gray-900 dark:border-stone-500 scale-[1.02]' : 'border-dashed border-gray-300 dark:border-stone-700'}`}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
             >
                <input 
                  id="image-upload-start" 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" 
                  accept="image/png, image/jpeg, image/webp" 
                  onChange={handleFileChange} 
                />
                
                <div className={`p-6 rounded-full bg-gray-50 dark:bg-stone-800 transition-transform duration-500 ${isHovering ? 'scale-110 bg-gray-100 dark:bg-stone-700' : ''}`}>
                    <PlusIcon className="w-8 h-8 text-gray-400 dark:text-stone-500" />
                </div>
                <div className="text-center px-6 pointer-events-none">
                    <span className="block font-serif text-2xl text-gray-900 dark:text-stone-100 mb-2">Upload your photo</span>
                    <span className="text-sm text-gray-500 dark:text-stone-500 font-medium">Drag & drop or click to browse</span>
                </div>
             </div>
             {error && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="text-red-500 text-sm mt-4 text-center bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-full border border-red-100 dark:border-red-900 flex-shrink-0"
                >
                  {error}
                </motion.p>
             )}
          </motion.div>
        )}

        {/* State 2: Generating */}
        {isGenerating && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-col items-center gap-8 py-20"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gray-200 dark:bg-stone-700 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <Spinner />
            </div>
            <span className="text-2xl font-serif text-gray-800 dark:text-stone-200 tracking-wide animate-pulse">Constructing Model...</span>
          </motion.div>
        )}

        {/* State 3: Result Display */}
        {generatedModelUrl && !isGenerating && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center gap-6 w-full max-w-2xl h-full py-4"
          >
             <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-stone-900 p-2 border border-white dark:border-stone-800 flex-shrink-1 min-h-0">
               <img 
                 src={generatedModelUrl} 
                 alt="Generated Model" 
                 className="w-auto h-auto max-h-[55vh] object-contain rounded-2xl"
               />
             </div>
             
             <div className="flex items-center gap-4 flex-shrink-0">
                <button 
                  onClick={handleReset}
                  className="px-8 py-4 text-sm font-semibold text-gray-600 dark:text-stone-400 hover:text-gray-900 dark:hover:text-stone-100 transition-colors"
                >
                  Retake
                </button>
                <button 
                  onClick={() => onModelFinalized(generatedModelUrl!)}
                  className="px-10 py-4 text-sm font-semibold text-white bg-gray-900 dark:bg-stone-100 dark:text-stone-950 rounded-full hover:bg-black dark:hover:bg-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  Enter Studio
                </button>
             </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StartScreen;
