import { useEffect, useRef } from 'react';

// Browser-side framing heuristic. This is intentionally not presented as ArUco detection;
// the authoritative calibration remains in the vision service.
export default function ReferenceCardLock({ videoRef, active, onStatus }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      const video = videoRef?.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      const w = 240, h = Math.max(135, Math.round((video.videoHeight / video.videoWidth) * w));
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      const gray = new Float32Array(w*h);
      let sum=0, sumSq=0, edges=0;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){const i=(y*w+x)*4; const g=.299*d[i]+.587*d[i+1]+.114*d[i+2]; gray[y*w+x]=g; sum+=g; sumSq+=g*g;}
      for(let y=1;y<h;y++) for(let x=1;x<w;x++){const p=y*w+x; edges+=Math.abs(gray[p]-gray[p-1])+Math.abs(gray[p]-gray[p-w]);}
      const mean=sum/(w*h), variance=Math.max(0,sumSq/(w*h)-mean*mean), edgeDensity=edges/(w*h);
      const cx=Math.floor(w*.5), cy=Math.floor(h*.5), rw=Math.floor(w*.62), rh=Math.floor(h*.72);
      let centerEdges=0, borderEdges=0;
      for(let y=Math.max(1,cy-rh/2);y<Math.min(h,cy+rh/2);y++) for(let x=Math.max(1,cx-rw/2);x<Math.min(w,cx+rw/2);x++){const p=y*w+x; centerEdges+=Math.abs(gray[p]-gray[p-1])+Math.abs(gray[p]-gray[p-w]);}
      const centerDensity=centerEdges/(rw*rh);
      const cardDetected=variance>700 && edgeDensity>7 && centerDensity>8;
      const perspectiveOk=cardDetected && centerDensity>10 && mean>35 && mean<225;
      const reactionAreaOk=cardDetected && centerDensity>9;
      const calibrationReady=cardDetected && perspectiveOk && reactionAreaOk;
      const score=Math.round(([cardDetected,perspectiveOk,reactionAreaOk].filter(Boolean).length/3)*100);
      const message=calibrationReady ? 'REFERENCE CARD LOCKED — framing is stable enough to capture.' : cardDetected ? 'Card candidate found. Center it and keep all corners visible.' : 'Move the full reference card into the guide area; keep it flat and evenly lit.';
      onStatus({cardDetected,perspectiveOk,reactionAreaOk,calibrationReady,score,message});
    },700);
    return () => window.clearInterval(timer);
  }, [active, videoRef, onStatus]);
  return <canvas ref={canvasRef} className="reference-card-lock-canvas" aria-hidden="true" />;
}
