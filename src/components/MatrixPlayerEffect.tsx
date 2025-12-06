import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";

interface MatrixPlayerEffectProps {
  className?: string;
}

export const MatrixPlayerEffect = ({ className = "" }: MatrixPlayerEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [xrayImage, setXrayImage] = useState<HTMLImageElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Load specific images from zip - image 7 as base, image 11 as x-ray
  useEffect(() => {
    const loadZip = async () => {
      try {
        const response = await fetch("/assets/Website_Hero_RISE.zip");
        const zipData = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);
        
        const imageMap: { [key: string]: HTMLImageElement } = {};
        const imagePromises: Promise<void>[] = [];

        zip.forEach((relativePath, file) => {
          if (relativePath.endsWith(".png") && !relativePath.startsWith("__MACOSX")) {
            // Extract image number from filename
            const match = relativePath.match(/(\d+)\.png$/i);
            if (match) {
              const imageNum = match[1];
              const promise = file.async("blob").then((blob) => {
                return new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => {
                    imageMap[imageNum] = img;
                    resolve();
                  };
                  img.onerror = () => resolve();
                  img.src = URL.createObjectURL(blob);
                });
              });
              imagePromises.push(promise);
            }
          }
        });

        await Promise.all(imagePromises);
        
        // Use image 7 as base, image 11 as x-ray
        const img7 = imageMap["7"];
        const img11 = imageMap["11"];
        
        if (img7) {
          setBaseImage(img7);
        }
        if (img11) {
          setXrayImage(img11);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading zip:", error);
        setIsLoading(false);
      }
    };

    loadZip();
  }, []);

  // Handle mouse and touch movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (containerRef.current && e.touches.length > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        setMousePos({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (containerRef.current && e.touches.length > 0) {
        const rect = containerRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        setMousePos({
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  // Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Matrix binary characters
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    // 5 Dimension lines configuration (angles only, no labels)
    const dimensionLineAngles = [-90, -162, -234, -306, -18];

    const animate = () => {
      timeRef.current += 0.016;
      
      // Clear canvas (transparent to show video behind)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle Matrix binary rain in background
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "rgba(200, 170, 90, 0.04)";

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? "1" : "0";
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Draw player images - base image only, no x-ray reveal
      if (baseImage) {
        const isMobile = canvas.width < 768;
        
        // On mobile, make player images the MAIN feature - much larger
        const scale = isMobile 
          ? Math.min(
              (canvas.height * 0.65) / baseImage.height,
              (canvas.width * 0.95) / baseImage.width
            )
          : Math.min(
              (canvas.height * 0.72) / baseImage.height,
              (canvas.width * 0.60) / baseImage.width
            );
        const imgWidth = baseImage.width * scale;
        const imgHeight = baseImage.height * scale;
        const imgX = (canvas.width - imgWidth) / 2;
        // On mobile, position higher to leave room for nav at bottom
        const imgY = isMobile ? 70 : (canvas.height - imgHeight) / 2 + 30;

        // Draw only the base image - no x-ray effect
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(baseImage, imgX, imgY, imgWidth, imgHeight);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [baseImage, xrayImage, mousePos]);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full cursor-none ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-primary font-bebas tracking-wider animate-pulse">
            LOADING...
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: isLoading ? 0 : 1, transition: "opacity 0.5s" }}
      />
    </div>
  );
};