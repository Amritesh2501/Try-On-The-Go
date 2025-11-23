
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { ChevronLeftIcon, RotateCcwIcon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

interface CanvasProps {
  displayImageUrl: string | null;
  onBack: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
}

const Canvas: React.FC<CanvasProps> = ({ displayImageUrl, onBack, isLoading, loadingMessage, onSelectPose, poseInstructions, currentPoseIndex, availablePoseKeys }) => {
  const [isHovering, setIsHovering] = useState(false);
  
  return (
    <div className="w-full h-full flex items-center justify-center p-4 md:p-8 relative">
      
      {/* Back Button - Floating Glass */}
      <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-30 flex items-center justify-center bg-white/50 dark:bg-stone-900/50 hover:bg-white dark:hover:bg-stone-900 text-gray-900 dark:text-stone-100 py-3 px-5 rounded-full transition-all duration-300 ease-out backdrop-blur-md border border-white/40 dark:border-stone-700 shadow-sm hover:shadow-md active:scale-95 group"
      >
          <ChevronLeftIcon className="w-4 h-4 mr-2 text-gray-600 dark:text-stone-400 group-hover:text-gray-900 dark:group-hover:text-stone-100" />
          <span className="font-medium text-sm">Exit Studio</span>
      </button>

      {/* Main Image Display */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <AnimatePresence mode="wait">
        {displayImageUrl ? (
          <motion.div
            key={displayImageUrl}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative h-full max-h-[85vh] w-auto aspect-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
          >
            <img
              src={displayImageUrl}
              alt="Virtual try-on model"
              className="h-full w-full object-contain bg-white dark:bg-stone-900"
            />
          </motion.div>
        ) : (
            <div className="w-[400px] h-[600px] bg-gray-50 dark:bg-stone-900 border border-gray-100 dark:border-stone-800 rounded-2xl flex flex-col items-center justify-center">
              <Spinner />
            </div>
        )}
        </AnimatePresence>
        
        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 flex items-center justify-center z-40 bg-white/30 dark:bg-black/30 backdrop-blur-sm rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                 <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 dark:border-stone-700 flex flex-col items-center">
                    <Spinner />
                    {loadingMessage && (
                        <p className="text-base font-serif text-gray-900 dark:text-stone-100 mt-4 text-center tracking-wide">{loadingMessage}</p>
                    )}
                 </div>
              </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Pose Controls */}
        {displayImageUrl && !isLoading && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-3 bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl p-2 pl-4 rounded-full border border-white/50 dark:border-stone-700 shadow-lg hover:bg-white/90 dark:hover:bg-stone-900/90 transition-colors"
                >
                    <span className="text-xs font-semibold text-gray-500 dark:text-stone-400 uppercase tracking-widest mr-2">Pose</span>
                    
                    <div className="flex items-center gap-1">
                        {poseInstructions.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => onSelectPose(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    index === currentPoseIndex 
                                    ? 'bg-gray-900 dark:bg-stone-100 w-6' 
                                    : 'bg-gray-300 dark:bg-stone-600 hover:bg-gray-400 dark:hover:bg-stone-500'
                                }`}
                                aria-label={`Select pose ${index + 1}`}
                            />
                        ))}
                    </div>

                    <div className="h-6 w-px bg-gray-200 dark:bg-stone-700 mx-2"></div>

                    <button 
                        onClick={() => onSelectPose((currentPoseIndex + 1) % poseInstructions.length)}
                        className="p-2 rounded-full bg-gray-100 dark:bg-stone-800 hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors text-gray-900 dark:text-stone-100"
                    >
                        <RotateCcwIcon className="w-4 h-4" />
                    </button>
                </motion.div>
                <div className="text-center mt-3">
                     <span className="text-xs font-medium text-gray-500 dark:text-stone-400 bg-white/50 dark:bg-stone-900/50 backdrop-blur px-3 py-1 rounded-full border border-white/20 dark:border-stone-800">
                        {poseInstructions[currentPoseIndex]}
                     </span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;
