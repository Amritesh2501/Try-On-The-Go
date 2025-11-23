
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { CheckCircleIcon, PlusIcon, ShirtIcon } from './icons';
import Spinner from './Spinner';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
}

const urlToFile = async (url: string, filename: string): Promise<File> => {
    // Helper to fetch with specific options
    const fetchBlob = async (urlToFetch: string): Promise<Blob> => {
        const response = await fetch(urlToFetch, { 
            mode: 'cors', 
            credentials: 'omit' // Important for public resources to avoid strict CORS checks
        });
        if (!response.ok) {
            throw new Error(`HTTP Status: ${response.status}`);
        }
        return await response.blob();
    };

    try {
        let blob: Blob;
        try {
            // Attempt 1: Try fetching the clean URL directly
            blob = await fetchBlob(url);
        } catch (firstError) {
            console.warn("Direct fetch failed, retrying with cache buster...", firstError);
            // Attempt 2: Try with cache busting to bypass browser cache
            const cacheBustedUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
            blob = await fetchBlob(cacheBustedUrl);
        }
        
        return new File([blob], filename, { type: blob.type || 'image/png' });
    } catch (error) {
        console.error("Image loading error:", error);
        throw new Error('Could not load image. It may have CORS restrictions or the URL is inaccessible.');
    }
};

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe }) => {
    const [error, setError] = useState<string | null>(null);
    const [preparingItemId, setPreparingItemId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleItemClick = (item: WardrobeItem) => {
        if (isLoading) return; // Allow clicking even if active
        setSelectedItem(item);
        setSelectedFile(null); // Clear custom file if switching to preset
        setError(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file.');
                return;
            }
            const customGarmentInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
            };
            setSelectedItem(customGarmentInfo);
            setSelectedFile(file);
            setError(null);
        }
    };

    const handleTryOn = async () => {
        if (!selectedItem || isLoading) return;
        
        setPreparingItemId(selectedItem.id);
        setError(null);

        try {
            let file = selectedFile;
            if (!file) {
                file = await urlToFile(selectedItem.url, selectedItem.name);
            }
            onGarmentSelect(file, selectedItem);
            setSelectedItem(null);
            setSelectedFile(null);
        } catch (err) {
            setError(`Failed to load item. ${(err as Error).message}`);
        } finally {
            setPreparingItemId(null);
        }
    };

  return (
    <div className="pt-2 pb-24 md:pb-6 relative min-h-[300px]">
        <h2 className="text-2xl font-serif text-gray-900 mb-6 flex items-center justify-between">
            <span>Wardrobe</span>
            <span className="text-xs font-sans text-gray-400 font-normal uppercase tracking-wider">Select Item</span>
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
            {/* Upload Button */}
             <label className={`aspect-[4/5] relative border border-dashed rounded-2xl flex flex-col items-center justify-center text-gray-400 transition-all duration-200 group ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-900 hover:text-gray-900 cursor-pointer bg-gray-50 hover:bg-white'}`}>
                <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <PlusIcon className="w-5 h-5"/>
                </div>
                <span className="text-xs font-semibold mt-3">Add New</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading}/>
            </label>

            {wardrobe.map((item) => {
            const isActive = activeGarmentIds.includes(item.id);
            const isSelected = selectedItem?.id === item.id;
            
            return (
                <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={isLoading}
                className={`relative aspect-[4/5] rounded-2xl overflow-hidden transition-all duration-300 group focus:outline-none disabled:opacity-70 disabled:grayscale ${isSelected ? 'ring-2 ring-gray-900 ring-offset-2' : ''}`}
                >
                <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <p className="text-white text-sm font-medium">{item.name}</p>
                </div>

                {/* Active (Worn) State Indicator */}
                {isActive && (
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] flex items-center justify-center z-20 group-hover:bg-gray-900/40 transition-colors">
                        <CheckCircleIcon className="w-8 h-8 text-white drop-shadow-md" />
                    </div>
                )}
                </button>
            );
            })}
        </div>
        
        {/* Floating Try-On Button */}
        {selectedItem && (
             <div className="fixed md:absolute bottom-6 md:bottom-0 left-0 right-0 p-4 md:p-0 z-50 animate-fade-in-up">
                <div className="max-w-md mx-auto md:max-w-none">
                    <button
                        onClick={handleTryOn}
                        disabled={isLoading || preparingItemId !== null}
                        className="w-full bg-gray-900 text-white font-serif text-lg py-4 rounded-full shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {preparingItemId ? (
                            <>
                                <Spinner />
                                <span className="ml-2">Preparing...</span>
                            </>
                        ) : (
                            <>
                                <ShirtIcon className="w-5 h-5" />
                                <span>
                                    {activeGarmentIds.includes(selectedItem.id) ? 'Try Again' : `Try On ${selectedItem.name}`}
                                </span>
                            </>
                        )}
                    </button>
                </div>
             </div>
        )}
        
        {error && <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium">{error}</div>}
    </div>
  );
};

export default WardrobePanel;