/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { OutfitLayer } from '../types';
import { Trash2Icon } from './icons';

interface OutfitStackProps {
  outfitHistory: OutfitLayer[];
  onRemoveLastGarment: () => void;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ outfitHistory, onRemoveLastGarment }) => {
  const getLayerThumbnail = (layer: OutfitLayer) => {
    if (layer.garment) {
      return layer.garment.url;
    }
    // For base layer (where garment is null), return the first available pose image (the model's body)
    const images = Object.values(layer.poseImages);
    return images.length > 0 ? images[0] : '';
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-serif text-gray-900">Current Look</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{outfitHistory.length} Layers</span>
      </div>
      
      <div className="space-y-3">
        {outfitHistory.map((layer, index) => {
          const thumbnail = getLayerThumbnail(layer);
          
          return (
            <div
              key={layer.garment?.id || 'base'}
              className="group flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-gray-200"
            >
              <div className="flex items-center overflow-hidden">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mr-3 text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full font-mono">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  
                  <div className="w-10 h-10 rounded-lg overflow-hidden mr-3 flex-shrink-0 bg-gray-50 border border-gray-100">
                      {thumbnail && (
                          <img 
                            src={thumbnail} 
                            alt={layer.garment?.name || 'Base Model'} 
                            className="w-full h-full object-cover" 
                          />
                      )}
                  </div>

                  <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 truncate max-w-[120px]" title={layer.garment?.name || 'Base Model'}>
                        {layer.garment ? layer.garment.name : 'Base Model'}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                          {layer.garment ? 'Garment' : 'Body'}
                      </span>
                  </div>
              </div>
              
              {index > 0 && index === outfitHistory.length - 1 && (
                 <button
                  onClick={onRemoveLastGarment}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  aria-label={`Remove ${layer.garment?.name}`}
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OutfitStack;