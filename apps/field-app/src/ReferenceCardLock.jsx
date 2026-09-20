import { useEffect, useRef } from 'react';

// Lightweight browser-side geometry gate. It estimates a rectangular card boundary
// from edge energy around the guide region. It is intentionally not presented as
// ArUco detection; authoritative marker calibration remains in the vision service.
export default function ReferenceCardLock({ videoRef, active, onStatus }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      const w = 320, h = Math.max(180, Math.round((video.videoHeight / video.videoWidth) * w));
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      const gray = new Float32Array(w*h);
      let sum=0, sumSq=0;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){const i=(y*w+x)*4; const g=.299*d[i]+.587*d[i+1]+.114*d[i+2]; gray[y*w+x]=g; sum+=g; sumSq+=g*g;}
      const mean=sum/(w*h), variance=Math.max(0,sumSq/(w*h)-mean*mean);
      const guide={left:Math.round(w*.19),right:Math.round(w*.81),top:Math.round(h*.14),bottom:Math.round(h*.86)};
      const band=7;
      const edgeAt=(x1,y1,x2,y2,vertical=false)=>{let total=0,n=0; if(vertical){for(let y=y1;y<=y2;y++)for(let dx=-band;dx<=band;dx++){const x=Math.max(1,Math.min(w-1,x1+dx));const p=y*w+x;total+=Math.abs(gray[p]-gray[p-1]);n++;}}else{for(let x=x1;x<=x2;x++)for(let dy=-band;dy<=band;dy++){const y=Math.max(1,Math.min(h-1,y1+dy));const p=y*w+x;total+=Math.abs(gray[p]-gray[p-w]);n++;}}return total/Math.max(1,n);};
      const topE=edgeAt(guide.left,guide.top,guide.right,guide.top), bottomE=edgeAt(guide.left,guide.bottom,guide.right,guide.bottom);
      const leftE=edgeAt(guide.left,guide.top,guide.bottom,guide.top,true), rightE=edgeAt(guide.right,guide.top,guide.bottom,guide.top,true);
      const edgeScore=(topE+bottomE+leftE+rightE)/4;
      const cardDetected=variance>500 && edgeScore>8;
      const balanced=Math.min(topE,bottomE,leftE,rightE)/Math.max(1,Math.max(topE,bottomE,leftE,rightE))>0.42;
      const perspectiveOk=cardDetected && balanced;
      const cardW=guide.right-guide.left, cardH=guide.bottom-guide.top, ratio=cardW/cardH;
      const aspectOk=ratio>1.15 && ratio<2.4;
      const reactionAreaOk=cardDetected && aspectOk;
      const calibrationReady=cardDetected && perspectiveOk && reactionAreaOk;
      const corners=[{x:guide.left,y:guide.top},{x:guide.right,y:guide.top},{x:guide.right,y:guide.bottom},{x:guide.left,y:guide.bottom}];
      const reactionRoi={x:guide.left+Math.round(cardW*.22),y:guide.top+Math.round(cardH*.48),width:Math.round(cardW*.56),height:Math.round(cardH*.28)};
      const score=Math.round(([cardDetected,perspectiveOk,reactionAreaOk].filter(Boolean).length/3)*100);
      const message=calibrationReady?'4-CORNER CARD LOCKED — reaction ROI is ready.':cardDetected?'Card boundary found. Flatten the card and keep all four corners inside the guide.':'Move the complete reference card into the guide; avoid cropped edges and uneven lighting.';
      onStatus({cardDetected,perspectiveOk,reactionAreaOk,calibrationReady,score,corners,reactionRoi,edgeScore,aspectRatio:ratio,message});
    },700);
    return ()=>window.clearInterval(timer);
  },[active,videoRef,onStatus]);
  return <canvas ref={canvasRef} className="reference-card-lock-canvas" aria-hidden="true"/>;
}
