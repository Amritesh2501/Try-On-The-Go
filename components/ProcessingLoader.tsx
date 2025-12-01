
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ProcessingLoaderProps {
  message?: string;
  subMessage?: string;
}

const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({ message = "Processing", subMessage }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress behavior
    const duration = 4000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
        currentStep++;
        // Logarithmic-ish progress to 95%, then wait
        const nextProgress = Math.min(95, 100 * (1 - Math.exp(-4 * currentStep / steps)));
        setProgress(nextProgress);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto">
       <div className="relative mb-6">
           {/* Morphing Shape */}
           <motion.div 
             className="w-12 h-12 rounded-xl bg-gradient-to-tr from-gray-900 to-gray-600 dark:from-stone-100 dark:to-stone-400"
             animate={{ 
                rotate: 180, 
                borderRadius: ["12px", "50%", "12px"],
                scale: [1, 0.85, 1]
             }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
           />
           {/* Glow Effect */}
           <motion.div 
             className="absolute inset-0 bg-gray-900 dark:bg-stone-100 opacity-20 blur-xl"
             animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
             transition={{ duration: 2, repeat: Infinity }}
           />
       </div>

       <h3 className="text-lg font-serif text-gray-900 dark:text-stone-100 mb-1 text-center font-medium tracking-wide">
         {message}
       </h3>
       
       {subMessage && (
           <p className="text-sm text-gray-500 dark:text-stone-400 mb-5 text-center">{subMessage}</p>
       )}

       {/* Progress Bar */}
       <div className="w-full max-w-[200px] h-1 bg-gray-200 dark:bg-stone-800 rounded-full overflow-hidden relative">
          <motion.div 
             className="absolute left-0 top-0 bottom-0 bg-gray-900 dark:bg-stone-100"
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
             transition={{ ease: "linear" }}
          />
          {/* Shimmer Overlay */}
          <motion.div
            className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: [-100, 250] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
       </div>
    </div>
  );
};

export default ProcessingLoader;
