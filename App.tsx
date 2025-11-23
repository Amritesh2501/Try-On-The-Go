
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation } from './services/geminiService';
import { OutfitLayer, WardrobeItem } from './types';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import Header from './components/Header';
import { getFriendlyErrorMessage } from './lib/utils';
import InitialLoader from './components/InitialLoader';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query, matches]);

  return matches;
};


const App: React.FC = () => {
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isAppStarted, setIsAppStarted] = useState(false);

  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialLoader(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return generatedModelUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return generatedModelUrl;

    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, generatedModelUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  const handleModelFinalized = (url: string) => {
    setGeneratedModelUrl(url);
    setIsAppStarted(true);
    setOutfitHistory([{
      garment: null,
      poseImages: { [POSE_INSTRUCTIONS[0]]: url }
    }]);
    setCurrentOutfitIndex(0);
  };

  const handleBackToStart = () => {
    setIsAppStarted(false);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
  };

  const handleFullReset = () => {
    setGeneratedModelUrl(null);
    setIsAppStarted(false);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setWardrobe(defaultWardrobe);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;

    // Check if the garment is already in the active stack (e.g. switching back to a previous layer)
    const activeHistory = outfitHistory.slice(0, currentOutfitIndex + 1);
    const existingIndex = activeHistory.findIndex(l => l.garment?.id === garmentInfo.id);

    if (existingIndex !== -1) {
        // If it's NOT the current one, it means we want to switch back to an underlying layer
        if (existingIndex !== currentOutfitIndex) {
             setCurrentOutfitIndex(existingIndex);
             setCurrentPoseIndex(0);
             if (isMobile) setIsSheetCollapsed(true);
             return;
        }
        // If it IS the current one, we proceed to allow re-generation (Retry logic)
        // by falling through to the generation code below.
    } else {
        // Check if it's in the immediate future (Redo logic) - only check if we aren't re-generating
        const nextLayer = outfitHistory[currentOutfitIndex + 1];
        if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
            setCurrentOutfitIndex(prev => prev + 1);
            setCurrentPoseIndex(0); 
             if (isMobile) setIsSheetCollapsed(true);
            return;
        }
    }

    // Automatically collapse sheet on mobile to show the canvas loading state
    if (isMobile) {
      setIsSheetCollapsed(true);
    }

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);

    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl, garmentFile);
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [currentPoseInstruction]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => {
        // Truncate future history if we generate something new (standard Undo/Redo behavior)
        const newHistory = prevHistory.slice(0, currentOutfitIndex + 1);
        return [...newHistory, newLayer];
      });
      setCurrentOutfitIndex(prev => prev + 1);
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err as any, 'Failed to apply garment'));
      if (isMobile) setIsSheetCollapsed(false);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex, isMobile]);

  const handleRemoveLastGarment = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      setCurrentPoseIndex(0); 
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    
    const prevPoseIndex = currentPoseIndex;
    setCurrentPoseIndex(newIndex);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const updatedLayer = newHistory[currentOutfitIndex];
        updatedLayer.poseImages[poseInstruction] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err as any, 'Failed to change pose'));
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="font-sans bg-[#FAFAF9] dark:bg-stone-950 w-full h-full text-gray-900 dark:text-stone-50 selection:bg-gray-200 dark:selection:bg-stone-800 transition-colors duration-300 overflow-hidden">
      <AnimatePresence mode="wait">
        {showInitialLoader && (
           <InitialLoader key="loader" />
        )}

        {!showInitialLoader && !isAppStarted && (
          <motion.div
            key="start-screen"
            className="w-full h-full relative flex flex-col overflow-hidden"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Header />
            {/* Added relative and overflow-hidden to ensure main content scales correctly without scrolling */}
            <main className="flex-grow flex items-center justify-center w-full h-full relative overflow-hidden pt-16 pb-12">
                <StartScreen 
                  onModelFinalized={handleModelFinalized} 
                  initialImage={generatedModelUrl}
                  onReset={handleFullReset}
                />
            </main>
            <Footer />
          </motion.div>
        )}
        
        {!showInitialLoader && isAppStarted && (
          <motion.div
            key="main-app"
            className="relative w-full h-full overflow-hidden flex flex-col md:flex-row bg-[#FAFAF9] dark:bg-stone-950 transition-colors duration-300"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Main Canvas Area */}
            <main className="flex-grow relative h-full order-1 md:order-1 overflow-hidden">
              <Canvas 
                displayImageUrl={displayImageUrl}
                onBack={handleBackToStart}
                isLoading={isLoading}
                loadingMessage={loadingMessage}
                onSelectPose={handlePoseSelect}
                poseInstructions={POSE_INSTRUCTIONS}
                currentPoseIndex={currentPoseIndex}
                availablePoseKeys={availablePoseKeys}
              />
            </main>

            {/* Sidebar / Panel */}
            <aside 
              className={`absolute md:relative z-40 order-2 md:order-2 bottom-0 right-0 w-full md:w-[400px] bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl md:border-l border-white/20 dark:border-stone-800 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isSheetCollapsed ? 'translate-y-[calc(100%-4rem)]' : 'translate-y-0'} md:translate-y-0 flex flex-col h-[85vh] md:h-full rounded-t-3xl md:rounded-none ring-1 ring-black/5 dark:ring-white/5 md:ring-0`}
            >
                {/* Mobile Handle */}
                <button 
                  onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                  className="md:hidden w-full h-12 flex items-center justify-center flex-shrink-0"
                >
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-stone-700 rounded-full"></div>
                </button>

                <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm leading-relaxed shadow-sm">
                      <p className="font-bold mb-1">Attention needed</p>
                      <p>{error}</p>
                    </div>
                  )}
                  
                  <OutfitStack 
                    outfitHistory={activeOutfitLayers}
                    onRemoveLastGarment={handleRemoveLastGarment}
                  />
                  
                  <WardrobePanel
                    onGarmentSelect={handleGarmentSelect}
                    activeGarmentIds={activeGarmentIds}
                    isLoading={isLoading}
                    wardrobe={wardrobe}
                  />
                </div>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
