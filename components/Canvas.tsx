
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, RotateCcwIcon, DownloadIcon, ImageIcon, SparklesIcon, ShareIcon, XIcon, HeartIcon, LightningIcon, NewspaperIcon, FloppyDiskIcon } from './icons';
import ProcessingLoader from './ProcessingLoader';
import { AnimatePresence, motion } from 'framer-motion';
import { generateStyleAdvice } from '../services/geminiService';

interface CanvasProps {
  displayImageUrl: string | null;
  baseImage: string | null;
  currentGarmentUrl: string | null;
  onBack: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
  onSceneSelect: (scene: string) => void;
  currentScene: string;
}

const SCENE_OPTIONS = [
    { label: "Studio", value: "Studio" },
    { label: "Coffee Shop", value: "Cozy Coffee Shop" },
    { label: "Urban Street", value: "City Street, Daytime" },
    { label: "Beach", value: "Tropical Beach" },
    { label: "Office", value: "Modern Office Interior" }
];

type ShareTemplateId = 'classic' | 'scrapbook' | 'street' | 'editorial' | 'y2k';

interface ShareTemplate {
    id: ShareTemplateId;
    name: string;
    colors: { bg: string; text: string; accent: string; secondary: string };
    icon: React.ElementType;
}

const SHARE_TEMPLATES: ShareTemplate[] = [
    { id: 'classic', name: 'Minimal', colors: { bg: '#FAFAF9', text: '#1c1917', accent: '#a8a29e', secondary: '#57534e' }, icon: SparklesIcon },
    { id: 'scrapbook', name: 'Cute', colors: { bg: '#fff1f2', text: '#831843', accent: '#fbcfe8', secondary: '#db2777' }, icon: HeartIcon },
    { id: 'street', name: 'Street', colors: { bg: '#09090b', text: '#f2f2f2', accent: '#22c55e', secondary: '#262626' }, icon: LightningIcon },
    { id: 'editorial', name: 'Editorial', colors: { bg: '#ffffff', text: '#000000', accent: '#ef4444', secondary: '#a3a3a3' }, icon: NewspaperIcon },
    { id: 'y2k', name: 'Y2K', colors: { bg: '#e0e7ff', text: '#1e3a8a', accent: '#f472b6', secondary: '#60a5fa' }, icon: FloppyDiskIcon },
];

const Canvas: React.FC<CanvasProps> = ({ 
    displayImageUrl, 
    baseImage,
    currentGarmentUrl,
    onBack, 
    isLoading, 
    loadingMessage, 
    onSelectPose, 
    poseInstructions, 
    currentPoseIndex, 
    onSceneSelect,
    currentScene
}) => {
  const [showSceneMenu, setShowSceneMenu] = useState(false);
  
  // Style Advisor State
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [isAnalysingStyle, setIsAnalysingStyle] = useState(false);
  const [styleAdvice, setStyleAdvice] = useState<string | null>(null);

  // Social Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ShareTemplateId>('classic');

  // Clear advice when image changes
  useEffect(() => {
    setStyleAdvice(null);
  }, [displayImageUrl]);

  // Regenerate share card when template changes
  useEffect(() => {
      if (showShareModal && displayImageUrl) {
          generateShareCard(activeTemplate);
      }
  }, [activeTemplate, showShareModal]);

  const handleDownload = () => {
    if (!displayImageUrl) return;
    
    // Create a temporary link
    const link = document.createElement('a');
    link.href = displayImageUrl;
    link.download = `try-on-the-go-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRateMyFit = async () => {
      if (!displayImageUrl) return;
      setShowAdvisor(true);
      
      if (styleAdvice) return; // Already analyzed this image

      setIsAnalysingStyle(true);
      try {
          const advice = await generateStyleAdvice(displayImageUrl);
          setStyleAdvice(advice);
      } catch (e) {
          setStyleAdvice("Unable to analyze style at the moment. Please try again.");
      } finally {
          setIsAnalysingStyle(false);
      }
  };

  // --- Canvas Drawing Helpers ---

  const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      // Check if roundRect is supported (it's relatively new in some contexts)
      if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, r);
      } else {
          // Polyfill for older environments
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
      }
      ctx.closePath();
  };

  const drawTape = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, angle: number, color: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle * Math.PI / 180);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(-width/2, -15, width, 30);
      ctx.globalAlpha = 1.0;
      ctx.restore();
  };

  const drawDoodle = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, angle: number = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle * Math.PI / 180);
      ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
      ctx.restore();
  };

  const generateShareCard = async (templateId: ShareTemplateId = 'classic') => {
      if (!displayImageUrl) return;
      
      setIsGeneratingShare(true);
      
      try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error("Could not get canvas context");

          const width = 1080;
          const height = 1920;
          canvas.width = width;
          canvas.height = height;
          
          const template = SHARE_TEMPLATES.find(t => t.id === templateId) || SHARE_TEMPLATES[0];
          const { bg, text, accent, secondary } = template.colors;

          // Load Images
          const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = src;
          });

          const resultImg = await loadImage(displayImageUrl);
          let baseImg: HTMLImageElement | null = null;
          let garmentImg: HTMLImageElement | null = null;
          if (baseImage) try { baseImg = await loadImage(baseImage); } catch(e) {}
          if (currentGarmentUrl) try { garmentImg = await loadImage(currentGarmentUrl); } catch(e) {}

          // --- TEMPLATE LOGIC ---

          if (templateId === 'classic') {
              // Background
              ctx.fillStyle = bg;
              ctx.fillRect(0, 0, width, height);
              
              // Texture (Subtle Noise)
              ctx.globalAlpha = 0.04;
              ctx.fillStyle = text;
              for(let i=0; i<width; i+=4) {
                  for(let j=0; j<height; j+=4) {
                      if(Math.random() > 0.5) ctx.fillRect(i, j, 2, 2);
                  }
              }
              ctx.globalAlpha = 1.0;

              // Title
              ctx.fillStyle = text;
              ctx.font = 'italic 500 110px "Instrument Serif", serif';
              ctx.textAlign = 'center';
              ctx.fillText("My Fit Check", width / 2, 180);

              ctx.font = '500 28px "Inter", sans-serif';
              ctx.fillStyle = secondary;
              ctx.fillText("CREATED WITH TRY ON THE GO", width / 2, 240);

              // Main Image
              const targetResH = 1150;
              const scaleRes = Math.min((width - 160) / resultImg.width, targetResH / resultImg.height);
              const resW = resultImg.width * scaleRes;
              const resH = resultImg.height * scaleRes;
              const resX = (width - resW) / 2;
              const resY = 320;
              
              // Shadow
              ctx.shadowColor = 'rgba(0,0,0,0.08)';
              ctx.shadowBlur = 50;
              ctx.shadowOffsetY = 25;

              ctx.save();
              drawRoundedRect(ctx, resX, resY, resW, resH, 32);
              ctx.clip();
              ctx.drawImage(resultImg, resX, resY, resW, resH);
              ctx.restore();
              ctx.shadowColor = 'transparent';

              // Border
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 12;
              drawRoundedRect(ctx, resX, resY, resW, resH, 32);
              ctx.stroke();

              // Inputs area
              if (baseImg && garmentImg) {
                  const sSize = 320;
                  const gap = 80;
                  const startY = resY + resH + 80;
                  const totalW = sSize * 2 + gap;
                  let startX = (width - totalW) / 2;

                  // Connect Line
                  ctx.strokeStyle = accent;
                  ctx.lineWidth = 3;
                  ctx.setLineDash([15, 15]);
                  ctx.beginPath();
                  ctx.moveTo(startX + sSize/2, startY + sSize/2);
                  ctx.lineTo(startX + sSize + gap + sSize/2, startY + sSize/2);
                  ctx.stroke();
                  ctx.setLineDash([]);

                  // Base Bubble
                  ctx.save();
                  drawRoundedRect(ctx, startX, startY, sSize, sSize, sSize/2);
                  ctx.clip();
                  const scaleB = Math.max(sSize/baseImg.width, sSize/baseImg.height);
                  ctx.drawImage(baseImg, startX - (baseImg.width*scaleB-sSize)/2, startY - (baseImg.height*scaleB-sSize)/2, baseImg.width*scaleB, baseImg.height*scaleB);
                  ctx.restore();
                  
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 8;
                  drawRoundedRect(ctx, startX, startY, sSize, sSize, sSize/2);
                  ctx.stroke();
                  
                  ctx.fillStyle = secondary;
                  ctx.font = '600 24px "Inter", sans-serif';
                  ctx.fillText("ME", startX + sSize/2, startY + sSize + 45);

                  // Plus Icon
                  ctx.fillStyle = '#fff';
                  ctx.beginPath(); ctx.arc(width/2, startY + sSize/2, 35, 0, Math.PI*2); ctx.fill();
                  ctx.fillStyle = accent;
                  ctx.font = '50px sans-serif';
                  ctx.textBaseline = 'middle';
                  ctx.fillText("+", width/2, startY + sSize/2 + 4);
                  ctx.textBaseline = 'alphabetic';

                  startX += sSize + gap;

                  // Garment Bubble
                  ctx.save();
                  drawRoundedRect(ctx, startX, startY, sSize, sSize, sSize/2);
                  ctx.clip();
                  ctx.fillStyle = '#fff';
                  ctx.fillRect(startX, startY, sSize, sSize);
                  const scaleG = Math.min((sSize-60)/garmentImg.width, (sSize-60)/garmentImg.height);
                  ctx.drawImage(garmentImg, startX + (sSize - garmentImg.width*scaleG)/2, startY + (sSize - garmentImg.height*scaleG)/2, garmentImg.width*scaleG, garmentImg.height*scaleG);
                  ctx.restore();
                  
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 8;
                  drawRoundedRect(ctx, startX, startY, sSize, sSize, sSize/2);
                  ctx.stroke();

                  ctx.fillStyle = secondary;
                  ctx.fillText("FIT", startX + sSize/2, startY + sSize + 45);
              }
          } 
          else if (templateId === 'scrapbook') {
              // Background
              ctx.fillStyle = bg;
              ctx.fillRect(0, 0, width, height);
              
              // Grid Pattern
              ctx.strokeStyle = accent;
              ctx.globalAlpha = 0.5;
              ctx.lineWidth = 2;
              for(let i=0; i<width; i+=60) {
                  ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,height); ctx.stroke();
              }
              for(let j=0; j<height; j+=60) {
                  ctx.beginPath(); ctx.moveTo(0,j); ctx.lineTo(width,j); ctx.stroke();
              }
              ctx.globalAlpha = 1.0;

              // Title
              ctx.fillStyle = text;
              ctx.font = '700 130px "Instrument Serif", serif';
              ctx.textAlign = 'center';
              ctx.save();
              ctx.translate(width/2, 240);
              ctx.rotate(-4 * Math.PI / 180);
              ctx.fillText("My New Look!", 0, 0);
              ctx.restore();

              // Main Image (Polaroid)
              const resW = 850;
              const resH = 1000;
              const resX = (width - resW) / 2;
              const resY = 400;

              ctx.save();
              ctx.translate(width/2, resY + resH/2);
              ctx.rotate(3 * Math.PI / 180); 
              ctx.translate(-width/2, -(resY + resH/2));

              // White Frame
              ctx.fillStyle = '#fff';
              ctx.shadowColor = 'rgba(0,0,0,0.15)';
              ctx.shadowBlur = 40;
              ctx.shadowOffsetY = 20;
              ctx.fillRect(resX - 40, resY - 40, resW + 80, resH + 320);
              ctx.shadowColor = 'transparent';

              // Image
              const scaleRes = Math.min(resW / resultImg.width, resH / resultImg.height);
              const drawW = resultImg.width * scaleRes;
              const drawH = resultImg.height * scaleRes;
              ctx.fillStyle = bg; // placeholder bg inside polaroid
              ctx.fillRect(resX, resY, resW, resH);
              ctx.drawImage(resultImg, resX + (resW - drawW)/2, resY + (resH - drawH)/2, drawW, drawH);
              
              // Caption
              ctx.font = '50px "Instrument Serif", serif';
              ctx.fillStyle = secondary;
              ctx.textAlign = 'center';
              ctx.fillText("Feeling cute today ✨", width/2, resY + resH + 160);
              ctx.font = '26px monospace';
              ctx.fillStyle = secondary;
              ctx.globalAlpha = 0.7;
              ctx.fillText(new Date().toLocaleDateString(), width/2, resY + resH + 210);
              ctx.globalAlpha = 1.0;
              
              // Tape
              drawTape(ctx, resX, resY, 200, -45, accent); // Use accent pink for tape
              drawTape(ctx, resX + resW, resY, 200, 45, accent); 

              ctx.restore();

              // Doodles
              drawDoodle(ctx, "✨", 150, 350, 100, -15);
              drawDoodle(ctx, "💖", width - 150, 300, 110, 15);
              drawDoodle(ctx, "🎀", width - 180, 1750, 100, 10);
              drawDoodle(ctx, "⭐", 180, 1700, 80, -10);
          }
          else if (templateId === 'street') {
              // Background
              ctx.fillStyle = bg;
              ctx.fillRect(0, 0, width, height);
              
              // Noise
              ctx.fillStyle = '#ffffff';
              ctx.globalAlpha = 0.05;
              for(let i=0; i<4000; i++) {
                 ctx.fillRect(Math.random()*width, Math.random()*height, 2, 2);
              }
              ctx.globalAlpha = 1.0;

              // Massive BG Text
              ctx.font = '900 340px "Inter", sans-serif';
              ctx.fillStyle = secondary; 
              ctx.textAlign = 'center';
              ctx.save();
              ctx.translate(width/2, height/2);
              ctx.rotate(-90 * Math.PI / 180);
              ctx.fillText("ARCHIVE", 0, 0);
              ctx.restore();

              // Header
              ctx.fillStyle = accent; 
              ctx.font = '900 150px "Inter", sans-serif';
              ctx.textAlign = 'left';
              ctx.fillText("FIT", 80, 220);
              
              ctx.strokeStyle = text;
              ctx.lineWidth = 3;
              ctx.strokeText("CHECK", 80, 350);
              ctx.fillStyle = text;
              ctx.fillText("CHECK", 88, 358); // Offset fill effect

              // Main Image
              const resW = width - 120;
              const resH = 1150;
              const resX = 60;
              const resY = 420;

              // Accent block behind
              ctx.fillStyle = accent;
              ctx.fillRect(resX + 30, resY + 30, resW, resH);

              // Image Container Background
              ctx.fillStyle = secondary;
              ctx.fillRect(resX, resY, resW, resH);

              const scaleRes = Math.min(resW / resultImg.width, resH / resultImg.height);
              const drawW = resultImg.width * scaleRes;
              const drawH = resultImg.height * scaleRes;
              ctx.drawImage(resultImg, resX + (resW - drawW)/2, resY + (resH - drawH)/2, drawW, drawH);
              
              // Overlays on image
              ctx.strokeStyle = accent;
              ctx.lineWidth = 3;
              // Crosshairs
              const chLen = 40;
              ctx.beginPath(); ctx.moveTo(resX + 30, resY + 30); ctx.lineTo(resX + 30 + chLen, resY + 30); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(resX + 30, resY + 30); ctx.lineTo(resX + 30, resY + 30 + chLen); ctx.stroke();
              
              ctx.beginPath(); ctx.moveTo(resX + resW - 30, resY + resH - 30); ctx.lineTo(resX + resW - 30 - chLen, resY + resH - 30); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(resX + resW - 30, resY + resH - 30); ctx.lineTo(resX + resW - 30, resY + resH - 30 - chLen); ctx.stroke();

              // Footer
              ctx.fillStyle = text;
              ctx.font = 'bold 50px monospace';
              ctx.textAlign = 'right';
              ctx.fillText("AI_GEN_V1", width - 80, resY + resH + 80);

              // Barcode visual
              let bx = 80;
              const by = resY + resH + 40;
              ctx.fillStyle = text;
              for(let i=0; i<35; i++) {
                  const w = Math.random() > 0.5 ? 5 : 12;
                  ctx.fillRect(bx, by, w, 50);
                  bx += w + 6;
              }
              
              drawDoodle(ctx, "⚡", width - 120, 180, 140);
          }
          else if (templateId === 'editorial') {
            // Background
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            // Large Header Behind
            // Use secondary color with very low opacity as watermark
            ctx.fillStyle = secondary;
            ctx.globalAlpha = 0.15;
            ctx.font = 'bold 380px "Instrument Serif", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("MODE", width / 2, 420);
            ctx.globalAlpha = 1.0;

            // Main Image
            const resW = 920;
            const resH = 1250;
            const resX = (width - resW) / 2;
            const resY = 350;
            
            // Draw Main Image
            ctx.drawImage(resultImg, resX, resY, resW, resH);
            
            // Frame
            ctx.strokeStyle = text;
            ctx.lineWidth = 2;
            ctx.strokeRect(resX, resY, resW, resH); 

            // Text Overlay on top - use text color for contrast
            ctx.fillStyle = text;
            ctx.font = 'bold 150px "Instrument Serif", serif';
            ctx.textAlign = 'center';
            ctx.fillText("VIRTUAL", width / 2, 280); 

            // Footer info
            ctx.beginPath(); 
            ctx.moveTo(width/2, resY + resH + 80); 
            ctx.lineTo(width/2, resY + resH + 180); 
            ctx.strokeStyle = secondary;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = '40px "Inter", sans-serif';
            ctx.fillStyle = text;
            ctx.fillText("ISSUE 01", width / 2, resY + resH + 240);
            
            ctx.font = 'italic 32px "Instrument Serif", serif';
            ctx.fillStyle = secondary;
            ctx.fillText("The Digital Collection", width / 2, resY + resH + 290);
          }
          else if (templateId === 'y2k') {
            // Gradient Background using template colors
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, secondary); 
            gradient.addColorStop(1, bg); 
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            for (let i = 0; i < width; i += 80) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
            }
            for (let j = 0; j < height; j += 80) {
                ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
            }

            // Window Logic
            const winW = 940;
            const winH = 1450;
            const winX = (width - winW) / 2;
            const winY = 240;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(winX + 25, winY + 25, winW, winH);

            // Window Body - classic grey
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(winX, winY, winW, winH);
            
            // Bevels
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(winX, winY+winH); ctx.lineTo(winX, winY); ctx.lineTo(winX+winW, winY); ctx.stroke();
            ctx.strokeStyle = '#808080'; ctx.beginPath(); ctx.moveTo(winX+winW, winY); ctx.lineTo(winX+winW, winY+winH); ctx.lineTo(winX, winY+winH); ctx.stroke();

            // Title Bar
            const gradTitle = ctx.createLinearGradient(winX, winY, winX+winW, winY);
            gradTitle.addColorStop(0, text); 
            gradTitle.addColorStop(1, secondary);
            ctx.fillStyle = gradTitle;
            ctx.fillRect(winX + 6, winY + 6, winW - 12, 55);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 30px monospace';
            ctx.textAlign = 'left';
            ctx.fillText("ootd_generator.exe", winX + 20, winY + 45);

            // Buttons
            const btnSize = 40;
            const btnX = winX + winW - 55;
            const btnY = winY + 12;
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(btnX, btnY, btnSize, btnSize);
            // Button Bevels
            ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(btnX, btnY+btnSize); ctx.lineTo(btnX, btnY); ctx.lineTo(btnX+btnSize, btnY); ctx.stroke();
            ctx.strokeStyle = '#404040'; ctx.beginPath(); ctx.moveTo(btnX+btnSize, btnY); ctx.lineTo(btnX+btnSize, btnY+btnSize); ctx.lineTo(btnX, btnY+btnSize); ctx.stroke();
            
            ctx.strokeStyle = '#000000'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(btnX+10, btnY+10); ctx.lineTo(btnX+btnSize-10, btnY+btnSize-10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(btnX+btnSize-10, btnY+10); ctx.lineTo(btnX+10, btnY+btnSize-10); ctx.stroke();

            // Content Area
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(winX + 16, winY + 80, winW - 32, winH - 140);
            
            // Content Bevels (Inset)
            ctx.strokeStyle = '#808080'; ctx.beginPath(); ctx.moveTo(winX+16, winY+winH-60); ctx.lineTo(winX+16, winY+80); ctx.lineTo(winX+winW-16, winY+80); ctx.stroke();
            ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(winX+winW-16, winY+80); ctx.lineTo(winX+winW-16, winY+winH-60); ctx.lineTo(winX+16, winY+winH-60); ctx.stroke();

            // Image
            const contentW = winW - 64;
            const contentH = winH - 240; 
            const scale = Math.min(contentW / resultImg.width, contentH / resultImg.height);
            const drawW = resultImg.width * scale;
            const drawH = resultImg.height * scale;
            ctx.drawImage(resultImg, winX + 32 + (contentW-drawW)/2, winY + 100, drawW, drawH);

            // Progress Bar
            ctx.fillStyle = text; // dark blue
            ctx.fillRect(winX + 32, winY + winH - 100, 240, 35);
            ctx.fillStyle = '#ffffff';
            ctx.font = '22px monospace';
            ctx.textAlign = 'center';
            ctx.fillText("Loading... 100%", winX + 152, winY + winH - 75);

            drawDoodle(ctx, "💿", 180, 180, 120);
            drawDoodle(ctx, "👾", width - 180, 1650, 120);
          }

          setShareImageUrl(canvas.toDataURL('image/png'));

      } catch (e) {
          console.error(e);
      } finally {
          setIsGeneratingShare(false);
      }
  };

  const openShareModal = () => {
      setShowShareModal(true);
      if (!shareImageUrl) {
          generateShareCard(activeTemplate);
      }
  };

  const downloadShareCard = () => {
      if (!shareImageUrl) return;
      const link = document.createElement('a');
      link.href = shareImageUrl;
      link.download = `try-on-the-go-story-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
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

      {/* Top Right Actions */}
      <div className="absolute top-6 right-6 z-30 flex gap-2">
         {/* Rate My Fit */}
         <button
            onClick={handleRateMyFit}
            disabled={isLoading || !displayImageUrl}
            className="p-3 rounded-full bg-white/50 dark:bg-stone-900/50 backdrop-blur-md border border-white/40 dark:border-stone-700 shadow-sm text-amber-500 hover:bg-white dark:hover:bg-stone-900 transition-all hover:scale-105"
            title="Style Advisor"
         >
             <SparklesIcon className="w-5 h-5" />
         </button>

         {/* Share */}
         <button
            onClick={openShareModal}
            disabled={isLoading || !displayImageUrl}
            className="p-3 rounded-full bg-white/50 dark:bg-stone-900/50 backdrop-blur-md border border-white/40 dark:border-stone-700 shadow-sm text-gray-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-900 transition-all hover:scale-105"
            title="Create Share Card"
         >
             <ShareIcon className="w-5 h-5" />
         </button>

         {/* Scene Toggle */}
         <div className="relative">
             <button
                onClick={() => setShowSceneMenu(!showSceneMenu)}
                disabled={isLoading}
                className={`p-3 rounded-full backdrop-blur-md border shadow-sm transition-all ${showSceneMenu ? 'bg-gray-900 text-white dark:bg-stone-100 dark:text-stone-900 border-transparent' : 'bg-white/50 dark:bg-stone-900/50 border-white/40 dark:border-stone-700 text-gray-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-900'}`}
                title="Change Scene"
             >
                 <ImageIcon className="w-5 h-5" />
             </button>
             <AnimatePresence>
                {showSceneMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-gray-100 dark:border-stone-800 overflow-hidden py-1 z-40"
                    >
                        {SCENE_OPTIONS.map((scene) => (
                            <button
                                key={scene.value}
                                onClick={() => {
                                    onSceneSelect(scene.value);
                                    setShowSceneMenu(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-stone-800 ${currentScene === scene.value ? 'font-semibold text-gray-900 dark:text-stone-100 bg-gray-50 dark:bg-stone-800' : 'text-gray-600 dark:text-stone-400'}`}
                            >
                                {scene.label}
                            </button>
                        ))}
                    </motion.div>
                )}
             </AnimatePresence>
         </div>

         {/* Download */}
         <button
            onClick={handleDownload}
            disabled={isLoading}
            className="p-3 rounded-full bg-white/50 dark:bg-stone-900/50 backdrop-blur-md border border-white/40 dark:border-stone-700 shadow-sm text-gray-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-900 transition-all"
            title="Download Image"
         >
             <DownloadIcon className="w-5 h-5" />
         </button>
      </div>

      {/* Main Image Display */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
        {displayImageUrl ? (
          <motion.div
            key={displayImageUrl}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative h-full max-h-[85vh] w-auto aspect-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-stone-900"
          >
            <img
                src={displayImageUrl}
                alt="Virtual try-on model"
                className="h-full w-full object-contain"
            />
          </motion.div>
        ) : (
            <div className="w-[400px] h-[600px] bg-gray-50 dark:bg-stone-900 border border-gray-100 dark:border-stone-800 rounded-2xl flex flex-col items-center justify-center">
              <ProcessingLoader message="Preparing Studio" />
            </div>
        )}
        </AnimatePresence>
        
        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 flex items-center justify-center z-40 bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <ProcessingLoader message={loadingMessage || "Updating Look"} />
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

      {/* Style Advisor Modal */}
      <AnimatePresence>
         {showAdvisor && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAdvisor(false)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                 />
                 <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white dark:bg-stone-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col"
                 >
                     <div className="p-4 bg-gradient-to-r from-amber-100 to-orange-50 dark:from-amber-900/30 dark:to-stone-900 border-b border-amber-200/50 dark:border-amber-900/50 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                            <SparklesIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <h3 className="font-serif text-lg font-semibold">Style Advisor</h3>
                         </div>
                         <button onClick={() => setShowAdvisor(false)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                             <XIcon className="w-5 h-5 text-gray-500" />
                         </button>
                     </div>
                     
                     <div className="p-6 min-h-[200px] flex flex-col">
                        {isAnalysingStyle ? (
                             <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
                                <ProcessingLoader message="Analyzing..." />
                             </div>
                        ) : (
                             <div className="text-gray-800 dark:text-stone-200 text-sm leading-relaxed whitespace-pre-wrap">
                                 {styleAdvice}
                             </div>
                        )}
                     </div>
                 </motion.div>
             </div>
         )}
      </AnimatePresence>

      {/* Social Share Modal */}
      <AnimatePresence>
         {showShareModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowShareModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                 />
                 <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-transparent w-full max-w-md flex flex-col gap-4 pointer-events-auto h-full max-h-[90vh]"
                 >
                     {/* Modern Template Selector (Floating Dock Style) */}
                     <div className="bg-black/80 backdrop-blur-xl rounded-full p-1.5 flex flex-wrap items-center justify-center gap-2 shadow-2xl z-10 mx-auto border border-white/10">
                        {SHARE_TEMPLATES.map(t => {
                            const Icon = t.icon;
                            const isActive = activeTemplate === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTemplate(t.id)}
                                    className={`relative flex items-center justify-center h-10 px-3 rounded-full transition-all duration-300 ${
                                        isActive 
                                        ? 'bg-white text-black' 
                                        : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'mr-2' : ''}`} />
                                    {isActive && (
                                        <motion.span 
                                            initial={{ opacity: 0, width: 0 }} 
                                            animate={{ opacity: 1, width: 'auto' }}
                                            className="text-sm font-medium whitespace-nowrap overflow-hidden"
                                        >
                                            {t.name}
                                        </motion.span>
                                    )}
                                </button>
                            );
                        })}
                     </div>

                     <div className="flex-1 flex items-center justify-center min-h-0 relative">
                        {isGeneratingShare ? (
                             <div className="bg-white dark:bg-stone-900 rounded-3xl p-8 flex flex-col items-center justify-center aspect-[9/16] h-full w-auto gap-4 shadow-2xl">
                                 <ProcessingLoader message="Designing..." />
                             </div>
                        ) : shareImageUrl && (
                            <img 
                                src={shareImageUrl} 
                                alt="Share Card" 
                                className="h-full w-auto max-w-full object-contain rounded-2xl shadow-2xl border-4 border-white dark:border-stone-800" 
                            />
                        )}
                     </div>
                             
                     <div className="flex gap-3">
                        <button 
                            onClick={downloadShareCard}
                            className="flex-1 bg-white text-gray-900 font-bold py-3 rounded-full shadow-lg hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Save Image
                        </button>
                        <button 
                            onClick={() => setShowShareModal(false)}
                            className="bg-white/20 backdrop-blur text-white p-3 rounded-full hover:bg-white/30 transition-colors"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                     </div>
                 </motion.div>
             </div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default Canvas;
