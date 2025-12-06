
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, RotateCcwIcon, DownloadIcon, ImageIcon, SparklesIcon, ShareIcon, XIcon, HeartIcon, LightningIcon, NewspaperIcon, FloppyDiskIcon, CameraIcon, SunIcon } from './icons';
import ProcessingLoader from './ProcessingLoader';
import Spinner from './Spinner';
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
  generatedPoses?: Record<string, string>;
  onSceneSelect: (scene: string) => void;
  currentScene: string;
  onOverlayStateChange?: (isOpen: boolean) => void;
}

const SCENE_OPTIONS = [
    { label: "Studio", value: "Studio" },
    { label: "Coffee Shop", value: "Cozy Coffee Shop" },
    { label: "Urban Street", value: "City Street, Daytime" },
    { label: "Beach", value: "Tropical Beach" },
    { label: "Office", value: "Modern Office Interior" }
];

const POSE_SHORT_LABELS = [
    "Frontal",
    "3/4 Turn",
    "Profile",
    "Action",
    "Walking",
    "Leaning"
];

type ShareTemplateId = 'tech' | 'cute' | 'y2k' | 'minimal' | 'street' | 'editorial' | 'retro' | 'pop';

interface ShareTemplate {
    id: ShareTemplateId;
    name: string;
    colors: { bg: string; text: string; accent: string; secondary: string };
    icon: React.ElementType;
}

const SHARE_TEMPLATES: ShareTemplate[] = [
    { id: 'tech', name: 'Cyber', colors: { bg: '#051014', text: '#00f2ff', accent: '#00f2ff', secondary: '#13232e' }, icon: FloppyDiskIcon },
    { id: 'cute', name: 'Sweet', colors: { bg: '#ffdeeb', text: '#1f1f1f', accent: '#ff8fab', secondary: '#ffb3c6' }, icon: HeartIcon },
    { id: 'y2k', name: 'Y2K', colors: { bg: '#e0e7ff', text: '#312e81', accent: '#f472b6', secondary: '#818cf8' }, icon: SparklesIcon },
    { id: 'minimal', name: 'Clean', colors: { bg: '#ffffff', text: '#000000', accent: '#000000', secondary: '#404040' }, icon: NewspaperIcon },
    { id: 'street', name: 'Urban', colors: { bg: '#efeee9', text: '#1a1a1a', accent: '#e11d48', secondary: '#d6d3d1' }, icon: LightningIcon },
    { id: 'editorial', name: 'Vogue', colors: { bg: '#fdfbf7', text: '#1c1917', accent: '#d4d4d4', secondary: '#57534e' }, icon: NewspaperIcon },
    { id: 'retro', name: 'Retro', colors: { bg: '#18181b', text: '#22c55e', accent: '#f43f5e', secondary: '#3f3f46' }, icon: CameraIcon },
    { id: 'pop', name: 'Pop', colors: { bg: '#fef08a', text: '#4f46e5', accent: '#ec4899', secondary: '#fbbf24' }, icon: SunIcon },
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
    generatedPoses = {},
    onSceneSelect,
    currentScene,
    onOverlayStateChange
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
  const [activeTemplate, setActiveTemplate] = useState<ShareTemplateId>('tech');

  // Notify parent when overlays are open to fix z-index with sidebar
  useEffect(() => {
    onOverlayStateChange?.(showShareModal || showAdvisor);
  }, [showShareModal, showAdvisor, onOverlayStateChange]);

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
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
  };

  const drawChamferRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, chamfer: number) => {
      ctx.beginPath();
      ctx.moveTo(x + chamfer, y);
      ctx.lineTo(x + w - chamfer, y);
      ctx.lineTo(x + w, y + chamfer);
      ctx.lineTo(x + w, y + h - chamfer);
      ctx.lineTo(x + w - chamfer, y + h);
      ctx.lineTo(x + chamfer, y + h);
      ctx.lineTo(x, y + h - chamfer);
      ctx.lineTo(x, y + chamfer);
      ctx.closePath();
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
  };

  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2, true);
      ctx.arc(x - size * 0.7, y + size * 0.4, size * 0.7, 0, Math.PI * 2, true);
      ctx.arc(x + size * 0.7, y + size * 0.4, size * 0.7, 0, Math.PI * 2, true);
      ctx.arc(x - size * 1.3, y + size * 0.7, size * 0.5, 0, Math.PI * 2, true);
      ctx.arc(x + size * 1.3, y + size * 0.7, size * 0.5, 0, Math.PI * 2, true);
      ctx.fill();
  };

  const generateShareCard = async (templateId: ShareTemplateId = 'tech') => {
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

          if (templateId === 'tech') {
              ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
              ctx.strokeStyle = secondary; ctx.lineWidth = 2;
              const gridSize = 60; ctx.beginPath(); for(let x=0; x<width; x+=gridSize) { ctx.moveTo(x,0); ctx.lineTo(x,height); } for(let y=0; y<height; y+=gridSize) { ctx.moveTo(0,y); ctx.lineTo(width,y); } ctx.stroke();
              ctx.fillStyle = secondary; ctx.fillRect(50, 50, 200, 20); ctx.fillRect(width - 250, 50, 200, 20);
              ctx.textAlign = 'center'; ctx.font = 'bold 100px "Inter", monospace'; ctx.fillStyle = accent; ctx.fillText("TRY ON", width/2, 160); ctx.fillStyle = '#fff'; ctx.fillText("THE GO", width/2, 270);
              ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(width/2 - 250, 300); ctx.lineTo(width/2 + 250, 300); ctx.stroke();
              
              const mainW = 800; const mainH = 1000; const mainX = (width - mainW)/2; const startY = 360;
              ctx.save(); drawChamferRect(ctx, mainX, startY, mainW, mainH, 40); ctx.clip();
              const scaleR = Math.max(mainW/resultImg.width, mainH/resultImg.height); ctx.drawImage(resultImg, mainX + (mainW-resultImg.width*scaleR)/2, startY, resultImg.width*scaleR, resultImg.height*scaleR); ctx.restore();
              ctx.strokeStyle = accent; ctx.lineWidth = 8; drawChamferRect(ctx, mainX, startY, mainW, mainH, 40); ctx.stroke(); ctx.shadowColor = accent; ctx.shadowBlur = 20; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
              
              const boxS = 250; const boxY = startY + mainH + 60;
              if(baseImg) { const bX = 100; ctx.strokeStyle = secondary; ctx.lineWidth = 4; drawChamferRect(ctx, bX, boxY, boxS, boxS, 20); ctx.stroke(); ctx.save(); drawChamferRect(ctx, bX, boxY, boxS, boxS, 20); ctx.clip(); const scaleB = Math.max(boxS/baseImg.width, boxS/baseImg.height); ctx.drawImage(baseImg, bX + (boxS-baseImg.width*scaleB)/2, boxY, baseImg.width*scaleB, baseImg.height*scaleB); ctx.restore(); ctx.strokeStyle = secondary; ctx.beginPath(); ctx.moveTo(bX + boxS/2, boxY); ctx.lineTo(bX + boxS/2, boxY - 30); ctx.lineTo(mainX + 100, boxY - 30); ctx.lineTo(mainX + 100, startY + mainH); ctx.stroke(); }
              if(garmentImg) { const gX = width - 100 - boxS; ctx.strokeStyle = accent; ctx.lineWidth = 4; drawChamferRect(ctx, gX, boxY, boxS, boxS, 20); ctx.stroke(); ctx.font = '24px monospace'; ctx.fillStyle = accent; ctx.textAlign = 'center'; ctx.fillText("FIT_DATA", gX + boxS/2, boxY + boxS + 35); ctx.save(); drawChamferRect(ctx, gX, boxY, boxS, boxS, 20); ctx.clip(); const scaleG = Math.max(boxS/garmentImg.width, boxS/garmentImg.height); ctx.drawImage(garmentImg, gX + (boxS-garmentImg.width*scaleG)/2, boxY + (boxS-garmentImg.height*scaleG)/2, garmentImg.width*scaleG, garmentImg.height*scaleG); ctx.restore(); ctx.strokeStyle = accent; ctx.beginPath(); ctx.moveTo(gX + boxS/2, boxY); ctx.lineTo(gX + boxS/2, boxY - 30); ctx.lineTo(mainX + mainW - 100, boxY - 30); ctx.lineTo(mainX + mainW - 100, startY + mainH); ctx.stroke(); }
              ctx.fillStyle = text; ctx.font = '30px monospace'; ctx.textAlign = 'center'; ctx.fillText("VIRTUAL_TRY_ON_SYSTEM // V.2.5", width/2, height - 50);
          }
          else if (templateId === 'cute') {
              ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); ctx.fillStyle = secondary; ctx.globalAlpha = 0.15; for(let x=20; x<width; x+=40) { for(let y=20; y<height; y+=40) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill(); } } ctx.globalAlpha = 1.0;
              ctx.fillStyle = '#ffffff'; drawCloud(ctx, 150, 150, 80); drawCloud(ctx, 950, 250, 90); drawCloud(ctx, 540, 1700, 100);
              ctx.textAlign = 'center'; ctx.font = '900 120px "Inter", sans-serif'; ctx.fillStyle = text; ctx.fillText("TRY ON", width/2, 200); ctx.fillText("THE GO", width/2, 310);
              const mainW = 800; const mainH = 1000; const mainX = (width - mainW)/2; const mainY = 380;
              ctx.save(); drawRoundedRect(ctx, mainX, mainY, mainW, mainH, 60); ctx.clip(); const scaleR = Math.max(mainW/resultImg.width, mainH/resultImg.height); ctx.drawImage(resultImg, mainX + (mainW-resultImg.width*scaleR)/2, mainY, resultImg.width*scaleR, resultImg.height*scaleR); ctx.restore();
              ctx.strokeStyle = text; ctx.lineWidth = 6; drawRoundedRect(ctx, mainX, mainY, mainW, mainH, 60); ctx.stroke();
              const bubbleY = mainY + mainH + 50; const bubbleS = 240;
              if (baseImg) { const bX = width/2 - bubbleS - 30; ctx.fillStyle = '#fff0f5'; drawRoundedRect(ctx, bX, bubbleY, bubbleS, bubbleS, 40); ctx.fill(); ctx.lineWidth = 4; ctx.stroke(); ctx.save(); drawRoundedRect(ctx, bX + 10, bubbleY + 10, bubbleS - 20, bubbleS - 20, 30); ctx.clip(); const scaleB = Math.max((bubbleS-20)/baseImg.width, (bubbleS-20)/baseImg.height); ctx.drawImage(baseImg, bX+10 + (bubbleS-20-baseImg.width*scaleB)/2, bubbleY+10, baseImg.width*scaleB, baseImg.height*scaleB); ctx.restore(); ctx.font = '800 24px "Inter", sans-serif'; ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.fillText("MODEL", bX + bubbleS/2, bubbleY + bubbleS + 40); }
              if (garmentImg) { const gX = width/2 + 30; ctx.fillStyle = '#fff0f5'; drawRoundedRect(ctx, gX, bubbleY, bubbleS, bubbleS, 40); ctx.fill(); ctx.lineWidth = 4; ctx.stroke(); ctx.save(); drawRoundedRect(ctx, gX + 10, bubbleY + 10, bubbleS - 20, bubbleS - 20, 30); ctx.clip(); const scaleG = Math.min((bubbleS-20)/garmentImg.width, (bubbleS-20)/garmentImg.height); const dw = garmentImg.width*scaleG; const dh = garmentImg.height*scaleG; ctx.drawImage(garmentImg, gX + 10 + (bubbleS-20-dw)/2, bubbleY + 10 + (bubbleS-20-dh)/2, dw, dh); ctx.restore(); ctx.font = '800 24px "Inter", sans-serif'; ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.fillText("FIT", gX + bubbleS/2, bubbleY + bubbleS + 40); }
          }
           else if (templateId === 'y2k') {
              const grad = ctx.createLinearGradient(0, 0, width, height); grad.addColorStop(0, '#fdf4ff'); grad.addColorStop(0.5, '#e0e7ff'); grad.addColorStop(1, '#fae8ff'); ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
              ctx.fillStyle = '#fff'; for(let i=0; i<30; i++) { drawStar(ctx, Math.random()*width, Math.random()*height, 4, 15, 5); ctx.fill(); }
              ctx.font = '900 130px "Inter", cursive'; ctx.strokeStyle = text; ctx.lineWidth = 15; ctx.lineJoin = 'round'; ctx.textAlign = 'center'; ctx.strokeText("Try on", width/2, 200); ctx.fillStyle = '#fff'; ctx.fillText("Try on", width/2, 200);
              ctx.strokeText("The Go", width/2, 320); ctx.fillStyle = '#fff'; ctx.fillText("The Go", width/2, 320);
              ctx.fillStyle = '#fde047'; ctx.strokeStyle = text; ctx.lineWidth = 8; drawStar(ctx, 900, 220, 5, 120, 60); ctx.fill(); ctx.stroke(); ctx.fillStyle = text; ctx.beginPath(); ctx.arc(860, 210, 8, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(940, 210, 8, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(900, 240, 20, 0, Math.PI, false); ctx.stroke();
              const frameW = 850; const frameH = 1000; const frameX = (width - frameW)/2; const frameY = 420;
              ctx.fillStyle = '#dbeafe'; drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 60); ctx.fill(); ctx.strokeStyle = text; ctx.lineWidth = 8; ctx.stroke();
              ctx.fillStyle = '#fff'; drawRoundedRect(ctx, frameX + 20, frameY + 20, frameW - 40, frameH - 40, 45); ctx.fill();
              ctx.save(); drawRoundedRect(ctx, frameX + 20, frameY + 20, frameW - 40, frameH - 40, 45); ctx.clip(); const scaleR = Math.max((frameW-40)/resultImg.width, (frameH-40)/resultImg.height); ctx.drawImage(resultImg, frameX+20 + (frameW-40-resultImg.width*scaleR)/2, frameY+20, resultImg.width*scaleR, resultImg.height*scaleR); ctx.restore();
              const circleY = frameY + frameH + 150; const radius = 130;
              if(baseImg) { const cx = width/2 - 200; ctx.save(); ctx.beginPath(); ctx.arc(cx, circleY, radius, 0, Math.PI*2); ctx.clip(); const scaleB = Math.max((radius*2)/baseImg.width, (radius*2)/baseImg.height); ctx.drawImage(baseImg, cx - baseImg.width*scaleB/2, circleY - baseImg.height*scaleB/2, baseImg.width*scaleB, baseImg.height*scaleB); ctx.restore(); ctx.beginPath(); ctx.arc(cx, circleY, radius, 0, Math.PI*2); ctx.lineWidth = 8; ctx.strokeStyle = text; ctx.stroke(); ctx.font = 'bold 40px "Inter", sans-serif'; ctx.fillStyle = text; ctx.fillText("ME", cx, circleY + radius + 50); }
              ctx.font = 'bold 100px sans-serif'; ctx.fillStyle = text; ctx.fillText("+", width/2, circleY + 30);
              if(garmentImg) { const cx = width/2 + 200; ctx.save(); ctx.beginPath(); ctx.arc(cx, circleY, radius, 0, Math.PI*2); ctx.clip(); ctx.fillStyle = '#e0f2fe'; ctx.fill(); const scaleG = Math.min((radius*1.5)/garmentImg.width, (radius*1.5)/garmentImg.height); ctx.drawImage(garmentImg, cx - garmentImg.width*scaleG/2, circleY - garmentImg.height*scaleG/2, garmentImg.width*scaleG, garmentImg.height*scaleG); ctx.restore(); ctx.beginPath(); ctx.arc(cx, circleY, radius, 0, Math.PI*2); ctx.lineWidth = 8; ctx.strokeStyle = text; ctx.stroke(); ctx.font = 'bold 40px "Inter", sans-serif'; ctx.fillStyle = text; ctx.fillText("FIT", cx, circleY + radius + 50); }
           }
          else if (templateId === 'minimal') {
              ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
              ctx.textAlign = 'center'; ctx.font = 'bold 140px "Inter", sans-serif'; ctx.fillStyle = text; ctx.fillText("TRY ON", width/2, 220); ctx.font = '140px "Inter", sans-serif'; ctx.fillText("THE GO", width/2, 360);
              const mainW = 800; const mainH = 1050; const mainX = (width - mainW)/2; const startY = 420;
              ctx.save(); drawRoundedRect(ctx, mainX, startY, mainW, mainH, 30); ctx.clip(); const scaleR = Math.max(mainW/resultImg.width, mainH/resultImg.height); ctx.drawImage(resultImg, mainX + (mainW-resultImg.width*scaleR)/2, startY, resultImg.width*scaleR, resultImg.height*scaleR); ctx.restore();
              ctx.strokeStyle = text; ctx.lineWidth = 3; drawRoundedRect(ctx, mainX, startY, mainW, mainH, 30); ctx.stroke();
              const boxY = startY + mainH + 50; const boxW = 220; const boxH = 280;
              if (baseImg) { const bX = width/2 - boxW - 20; ctx.fillStyle = '#fff'; drawRoundedRect(ctx, bX, boxY, boxW, boxH, 20); ctx.save(); drawRoundedRect(ctx, bX, boxY, boxW, boxH, 20); ctx.clip(); const scaleB = Math.max(boxW/baseImg.width, boxH/baseImg.height); ctx.drawImage(baseImg, bX + (boxW-baseImg.width*scaleB)/2, boxY, baseImg.width*scaleB, baseImg.height*scaleB); ctx.restore(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(bX + 10, boxY + 10, 80, 30); ctx.fillStyle = text; ctx.font = 'bold 20px "Inter", sans-serif'; ctx.textAlign = 'left'; ctx.fillText("MODEL", bX + 20, boxY + 32); }
              if (garmentImg) { const gX = width/2 + 20; ctx.save(); drawRoundedRect(ctx, gX, boxY, boxW, boxH, 20); ctx.clip(); const scaleG = Math.min((boxW-20)/garmentImg.width, (boxH-20)/garmentImg.height); ctx.drawImage(garmentImg, gX + (boxW-garmentImg.width*scaleG)/2, boxY + (boxH-garmentImg.height*scaleG)/2, garmentImg.width*scaleG, garmentImg.height*scaleG); ctx.restore(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(gX + 10, boxY + 10, 50, 30); ctx.fillStyle = text; ctx.font = 'bold 20px "Inter", sans-serif'; ctx.textAlign = 'left'; ctx.fillText("FIT", gX + 20, boxY + 32); }
              ctx.font = '30px "Inter", sans-serif'; ctx.fillStyle = secondary; ctx.textAlign = 'center'; ctx.fillText("Try on the Go · Virtual Fitting", width/2, height - 60);
          }
           else if (templateId === 'street') {
              ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); ctx.fillStyle = '#000'; ctx.globalAlpha = 0.08; for(let i=0; i<10000; i++) ctx.fillRect(Math.random()*width, Math.random()*height, 2, 2); ctx.globalAlpha = 1.0;
              ctx.save(); ctx.translate(width/2, 250); ctx.rotate(-5 * Math.PI / 180); ctx.font = '900 160px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 25; ctx.strokeStyle = '#000'; ctx.strokeText("TRY ON", 0, -80); ctx.strokeText("THE GO", 0, 80); ctx.fillStyle = '#22c55e'; ctx.fillText("TRY ON", 0, -80); ctx.fillStyle = '#ef4444'; ctx.fillText("THE GO", 0, 80); ctx.restore();
              const fW = 800; const fH = 950; const fX = (width - fW)/2; const fY = 480;
              ctx.fillStyle = '#1c1917'; drawRoundedRect(ctx, fX - 10, fY - 10, fW + 20, fH + 20, 10); ctx.fill();
              ctx.save(); drawRoundedRect(ctx, fX, fY, fW, fH, 4); ctx.clip(); const scaleR = Math.max(fW/resultImg.width, fH/resultImg.height); ctx.drawImage(resultImg, fX + (fW-resultImg.width*scaleR)/2, fY, resultImg.width*scaleR, resultImg.height*scaleR); ctx.restore();
              ctx.font = 'italic 40px serif'; ctx.fillStyle = '#000'; ctx.textAlign = 'left'; ctx.fillText("M.", fX + 60, fY + fH - 60);
              const bY = height - 350; const rad = 120;
              if (baseImg) { const cx = 300; ctx.save(); ctx.beginPath(); ctx.arc(cx, bY, rad, 0, Math.PI*2); ctx.clip(); const scaleB = Math.max((rad*2)/baseImg.width, (rad*2)/baseImg.height); ctx.drawImage(baseImg, cx - baseImg.width*scaleB/2, bY - baseImg.height*scaleB/2, baseImg.width*scaleB, baseImg.height*scaleB); ctx.restore(); ctx.beginPath(); ctx.arc(cx, bY, rad, 0, Math.PI*2); ctx.lineWidth = 10; ctx.strokeStyle = '#1c1917'; ctx.stroke(); ctx.font = '900 40px "Inter", sans-serif'; ctx.fillStyle = '#1c1917'; ctx.textAlign = 'center'; ctx.fillText("ME", cx, bY + rad + 50); }
              ctx.font = '900 100px "Inter", sans-serif'; ctx.fillStyle = '#1c1917'; ctx.textAlign = 'center'; ctx.fillText("=", width/2, bY + 30);
              if (garmentImg) { const cx = width - 300; ctx.save(); ctx.beginPath(); ctx.arc(cx, bY, rad, 0, Math.PI*2); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fill(); const scaleG = Math.min((rad*1.5)/garmentImg.width, (rad*1.5)/garmentImg.height); ctx.drawImage(garmentImg, cx - garmentImg.width*scaleG/2, bY - garmentImg.height*scaleG/2, garmentImg.width*scaleG, garmentImg.height*scaleG); ctx.restore(); ctx.beginPath(); ctx.arc(cx, bY, rad, 0, Math.PI*2); ctx.lineWidth = 10; ctx.strokeStyle = '#1c1917'; ctx.stroke(); ctx.font = '900 40px "Inter", sans-serif'; ctx.fillStyle = '#1c1917'; ctx.fillText("FIT", cx, bY + rad + 50); }
           }
           else if (templateId === 'editorial') {
              ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
              ctx.font = 'italic 180px "Instrument Serif", serif'; ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.fillText("VOGUE", width/2, 220); ctx.font = '40px "Inter", sans-serif'; ctx.letterSpacing = '10px'; ctx.fillText("DIGITAL COLLECTION", width/2, 280); ctx.letterSpacing = '0px';
              const mainW = 900; const mainH = 1100; const mainX = (width - mainW)/2; const mainY = 350;
              ctx.fillStyle = '#e5e5e5'; ctx.fillRect(mainX + 20, mainY + 20, mainW, mainH);
              ctx.save(); ctx.beginPath(); ctx.rect(mainX, mainY, mainW, mainH); ctx.clip(); const scaleR = Math.max(mainW/resultImg.width, mainH/resultImg.height); ctx.drawImage(resultImg, mainX + (mainW-resultImg.width*scaleR)/2, mainY, resultImg.width*scaleR, resultImg.height*scaleR); ctx.restore();
              ctx.strokeStyle = text; ctx.lineWidth = 2; ctx.strokeRect(mainX, mainY, mainW, mainH);
              const bY = mainY + mainH + 100; ctx.font = '30px "Instrument Serif", serif'; ctx.textAlign = 'left'; ctx.fillText("Model Ref: 001", 100, bY); ctx.fillText("Fit Ref: #AG24", 100, bY + 40);
              if(baseImg) { const r = 80; ctx.save(); ctx.beginPath(); ctx.arc(width - 250, bY + r, r, 0, Math.PI*2); ctx.clip(); const s = Math.max(2*r/baseImg.width, 2*r/baseImg.height); ctx.drawImage(baseImg, width - 250 - baseImg.width*s/2, bY + r - baseImg.height*s/2, baseImg.width*s, baseImg.height*s); ctx.restore(); ctx.beginPath(); ctx.arc(width - 250, bY + r, r, 0, Math.PI*2); ctx.stroke(); }
              if(garmentImg) { const r = 80; ctx.save(); ctx.beginPath(); ctx.arc(width - 80, bY + r, r, 0, Math.PI*2); ctx.clip(); const s = Math.max(2*r/garmentImg.width, 2*r/garmentImg.height); ctx.drawImage(garmentImg, width - 80 - garmentImg.width*s/2, bY + r - garmentImg.height*s/2, garmentImg.width*s, garmentImg.height*s); ctx.restore(); ctx.beginPath(); ctx.arc(width - 80, bY + r, r, 0, Math.PI*2); ctx.stroke(); }
           }
           else if (templateId === 'retro') {
               ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.05; for(let i=0; i<50000; i++) ctx.fillRect(Math.random()*width, Math.random()*height, 2, 2); ctx.globalAlpha = 1.0;
               ctx.font = 'bold 40px monospace'; ctx.fillStyle = '#f43f5e'; ctx.shadowColor = '#f43f5e'; ctx.shadowBlur = 10; ctx.textAlign = 'left'; ctx.fillText("REC ●", 60, 100); ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'right'; ctx.fillText(new Date().toLocaleDateString(), width - 60, 100);
               const pW = 800; const pH = 900; const borderT = 40; const borderB = 180; const borderS = 40; const totalW = pW + borderS*2; const totalH = pH + borderT + borderB;
               ctx.save(); ctx.translate(width/2, height/2 - 100); ctx.rotate(-2 * Math.PI / 180); ctx.fillStyle = '#fafafa'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.fillRect(-totalW/2, -totalH/2, totalW, totalH); ctx.shadowBlur = 0;
               const imgX = -pW/2; const imgY = -totalH/2 + borderT; ctx.save(); ctx.beginPath(); ctx.rect(imgX, imgY, pW, pH); ctx.clip(); const scaleR = Math.max(pW/resultImg.width, pH/resultImg.height); ctx.drawImage(resultImg, imgX + (pW-resultImg.width*scaleR)/2, imgY, resultImg.width*scaleR, resultImg.height*scaleR); const grad = ctx.createLinearGradient(imgX, imgY, imgX, imgY+pH); grad.addColorStop(0, 'rgba(255,100,100,0.1)'); grad.addColorStop(1, 'rgba(0,0,50,0.2)'); ctx.fillStyle = grad; ctx.fillRect(imgX, imgY, pW, pH); ctx.restore(); ctx.font = '40px cursive'; ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText("Try on the Go", 0, totalH/2 - 80); ctx.restore();
               const stripY = height - 300; const filmH = 200; ctx.fillStyle = '#000'; ctx.fillRect(0, stripY, width, filmH); ctx.fillStyle = '#fff'; for(let x=20; x<width; x+=60) { ctx.fillRect(x, stripY + 10, 30, 20); ctx.fillRect(x, stripY + filmH - 30, 30, 20); }
               if(baseImg) { const h = filmH - 60; const w = h * (baseImg.width/baseImg.height); ctx.drawImage(baseImg, 100, stripY + 30, w, h); }
               if(garmentImg) { const h = filmH - 60; const w = h * (garmentImg.width/garmentImg.height); ctx.drawImage(garmentImg, 400, stripY + 30, w, h); }
           }
           else if (templateId === 'pop') {
              ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); ctx.fillStyle = secondary; ctx.globalAlpha = 0.2; for(let x=0; x<width; x+=30) { for(let y=0; y<height; y+=30) { if((Math.floor(x/30)+Math.floor(y/30)) % 2 === 0) { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill(); } } } ctx.globalAlpha = 1.0;
              ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(width/2, 200, 300, 120, 0, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 8; ctx.stroke();
              ctx.font = '900 100px "Inter", sans-serif'; ctx.fillStyle = text; ctx.textAlign = 'center'; ctx.fillText("FRESH FIT", width/2, 230);
              const cx = width/2; const cy = height/2 + 50; ctx.fillStyle = accent; ctx.beginPath(); for(let i=0; i<20; i++) { const angle = (i/20)*Math.PI*2; const rOut = 600; const rIn = 450; ctx.lineTo(cx + Math.cos(angle)*rOut, cy + Math.sin(angle)*rOut); ctx.lineTo(cx + Math.cos(angle + Math.PI/20)*rIn, cy + Math.sin(angle + Math.PI/20)*rIn); } ctx.closePath(); ctx.fill(); ctx.stroke();
              const iW = 700; const iH = 900; const iX = cx - iW/2; const iY = cy - iH/2; ctx.fillStyle = '#000'; ctx.fillRect(iX + 30, iY + 30, iW, iH); ctx.save(); ctx.beginPath(); ctx.rect(iX, iY, iW, iH); ctx.clip(); const s = Math.max(iW/resultImg.width, iH/resultImg.height); ctx.drawImage(resultImg, iX + (iW-resultImg.width*s)/2, iY, resultImg.width*s, resultImg.height*s); ctx.restore(); ctx.strokeRect(iX, iY, iW, iH);
              if(baseImg) { const s = 300; const sx = 100; const sy = height - 400; ctx.save(); ctx.translate(sx+s/2, sy+s/2); ctx.rotate(-15 * Math.PI/180); ctx.fillStyle = '#fff'; ctx.fillRect(-s/2 - 10, -s/2 - 10, s+20, s+20); ctx.strokeRect(-s/2 - 10, -s/2 - 10, s+20, s+20); ctx.drawImage(baseImg, -s/2, -s/2, s, s); ctx.restore(); }
              if(garmentImg) { const s = 300; const sx = width - 400; const sy = height - 400; ctx.save(); ctx.translate(sx+s/2, sy+s/2); ctx.rotate(15 * Math.PI/180); ctx.fillStyle = '#fff'; ctx.fillRect(-s/2 - 10, -s/2 - 10, s+20, s+20); ctx.strokeRect(-s/2 - 10, -s/2 - 10, s+20, s+20); ctx.drawImage(garmentImg, -s/2, -s/2, s, s); ctx.restore(); }
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
    <div className="w-full h-full flex items-center justify-center relative pt-24 pb-40 px-4 md:pt-20 md:pb-40 md:pr-8">
      
      {/* Back Button - Floating Glass */}
      <button 
          onClick={onBack}
          className="absolute top-6 left-6 z-30 flex items-center justify-center bg-white/50 dark:bg-stone-900/50 hover:bg-white dark:hover:bg-stone-900 text-gray-900 dark:text-stone-100 py-3 px-5 rounded-full transition-all duration-300 ease-out backdrop-blur-md border border-white/40 dark:border-stone-700 shadow-sm hover:shadow-md active:scale-95 group"
      >
          <ChevronLeftIcon className="w-4 h-4 mr-2 text-gray-600 dark:text-stone-400 group-hover:text-gray-900 dark:group-hover:text-stone-100" />
          <span className="font-medium text-sm">Exit Studio</span>
      </button>

      {/* Top Right Actions - Positioned absolutely relative to the main workspace */}
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
            className="relative h-full max-h-full w-auto aspect-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 dark:ring-white/5 bg-white dark:bg-stone-900"
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
        
        {/* Loading Overlay - Subtle Glass Effect over previous image */}
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 flex items-center justify-center z-40 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <ProcessingLoader message={loadingMessage || "Updating Look"} />
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Pose Controls - Enhanced Thumbnail Gallery - Moved to root for z-index/fixed positioning */}
      {displayImageUrl && (
            <div className="absolute bottom-6 left-0 right-0 z-30 px-4 flex justify-center pointer-events-none">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="pointer-events-auto flex items-center gap-4 bg-gray-900/90 dark:bg-black/90 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl overflow-x-auto max-w-full mx-auto"
                >
                    {poseInstructions.map((instruction, index) => {
                        const isGenerated = !!generatedPoses[instruction];
                        const isSelected = index === currentPoseIndex;
                        const url = generatedPoses[instruction];

                        return (
                            <button
                                key={index}
                                onClick={() => onSelectPose(index)}
                                className={`relative group flex-shrink-0 flex flex-col items-center gap-2 transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                            >
                                <div className={`w-16 h-24 rounded-xl overflow-hidden border-2 transition-all relative ${isSelected ? 'border-white shadow-lg scale-105' : 'border-white/10 hover:border-white/30'}`}>
                                    {isGenerated ? (
                                        <img src={url} alt={POSE_SHORT_LABELS[index]} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                            <SparklesIcon className="w-6 h-6 text-white/40" />
                                        </div>
                                    )}

                                    {/* Loading State Overlay for Poses */}
                                    {isLoading && isSelected && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                           {/* Animated Gradient Border effect */}
                                            <div className="absolute inset-0 border-2 border-transparent rounded-xl animate-[spin_2s_linear_infinite]" style={{ background: 'linear-gradient(white, transparent) border-box', WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)' }}></div>
                                            <Spinner className="w-6 h-6 text-white relative z-10" />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-medium tracking-wider uppercase ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                    {POSE_SHORT_LABELS[index] || `Pose ${index + 1}`}
                                </span>
                            </button>
                        )
                    })}
                </motion.div>
            </div>
      )}

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
                     <div className="bg-black/80 backdrop-blur-xl rounded-full p-1.5 flex flex-wrap items-center justify-center gap-2 shadow-2xl z-10 mx-auto border border-white/10 overflow-x-auto max-w-full custom-scrollbar">
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
