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

  // Handle mouse movement
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

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
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
      
      // Clear with pure black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      // Draw player images
      if (baseImage && xrayImage) {
        const scale = Math.min(
          (canvas.height * 0.88) / baseImage.height,
          (canvas.width * 0.75) / baseImage.width
        );
        const imgWidth = baseImage.width * scale;
        const imgHeight = baseImage.height * scale;
        const imgX = (canvas.width - imgWidth) / 2;
        const imgY = (canvas.height - imgHeight) / 2 - 50; // Moved up 60px

        const playerCenterX = imgX + imgWidth / 2;
        const playerCenterY = imgY + imgHeight / 2;
        const xrayRadius = 180;

        // 1. ALWAYS draw the natural base image first
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(baseImage, imgX, imgY, imgWidth, imgHeight);

        // Calculate distance from mouse to player
        const distFromMouse = Math.sqrt(
          Math.pow(mousePos.x - playerCenterX, 2) + 
          Math.pow(mousePos.y - playerCenterY, 2)
        );

        // 2. X-RAY REVEAL - only when mouse is close AND valid position
        const isMouseValid = mousePos.x > 0 && mousePos.y > 0;
        const isNearPlayer = distFromMouse < xrayRadius + imgWidth / 3;
        
        if (isMouseValid && isNearPlayer && xrayImage) {
          // Clear the x-ray circle area first (remove base image inside circle)
          ctx.save();
          ctx.beginPath();
          ctx.arc(mousePos.x, mousePos.y, xrayRadius, 0, Math.PI * 2);
          ctx.clip();
          
          // Fill with black to hide base image
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw only image 11 inside the x-ray circle
          ctx.drawImage(xrayImage, imgX, imgY, imgWidth, imgHeight);
          
          // Draw 5D MATRIX LINES - only within x-ray circle
          const baseLengthMin = 180;
          const baseLengthMax = 350;
          
          dimensionLineAngles.forEach((angle, index) => {
            const angleRad = (angle * Math.PI) / 180;
            
            // Pulsing animation
            const pulse = Math.sin(timeRef.current * 2.5 + index * 1.2) * 0.2 + 0.8;
            const lineLength = baseLengthMin + (baseLengthMax - baseLengthMin) * pulse;
            
            const endX = playerCenterX + Math.cos(angleRad) * lineLength;
            const endY = playerCenterY + Math.sin(angleRad) * lineLength;
            
            // Main glowing line - gold color
            ctx.strokeStyle = "rgba(200, 170, 90, 0.9)";
            ctx.lineWidth = 3;
            ctx.shadowColor = "rgba(200, 170, 90, 1)";
            ctx.shadowBlur = 20;
            
            ctx.beginPath();
            ctx.moveTo(playerCenterX, playerCenterY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Data particles streaming along line
            for (let p = 0; p < 8; p++) {
              const particleProgress = ((timeRef.current * 0.5 + p * 0.12 + index * 0.2) % 1);
              const px = playerCenterX + Math.cos(angleRad) * lineLength * particleProgress;
              const py = playerCenterY + Math.sin(angleRad) * lineLength * particleProgress;
              
              const particleAlpha = Math.sin(particleProgress * Math.PI) * 0.9;
              ctx.fillStyle = `rgba(200, 170, 90, ${particleAlpha})`;
              ctx.shadowColor = "rgba(200, 170, 90, 1)";
              ctx.shadowBlur = 12;
              ctx.beginPath();
              ctx.arc(px, py, 3, 0, Math.PI * 2);
              ctx.fill();
            }

            // End node - small circle
            ctx.fillStyle = "rgba(200, 170, 90, 1)";
            ctx.shadowColor = "rgba(200, 170, 90, 1)";
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(endX, endY, 6, 0, Math.PI * 2);
            ctx.fill();
          });

          // Center core node
          const corePulse = Math.sin(timeRef.current * 3) * 0.3 + 0.7;
          
          ctx.fillStyle = "rgba(200, 170, 90, 0.9)";
          ctx.shadowColor = "rgba(200, 170, 90, 1)";
          ctx.shadowBlur = 25;
          ctx.beginPath();
          ctx.arc(playerCenterX, playerCenterY, 8 + corePulse * 4, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();

          // X-ray circle indicator - GOLD color, outside clip
          ctx.strokeStyle = "rgba(200, 170, 90, 0.6)";
          ctx.lineWidth = 2;
          ctx.shadowColor = "rgba(200, 170, 90, 0.8)";
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(mousePos.x, mousePos.y, xrayRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
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