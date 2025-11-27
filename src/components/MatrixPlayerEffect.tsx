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

  // Load images from zip and create both base and xray versions
  useEffect(() => {
    const loadZip = async () => {
      try {
        const response = await fetch("/assets/Website_Hero_RISE.zip");
        const zipData = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);
        
        const images: HTMLImageElement[] = [];
        const imagePromises: Promise<void>[] = [];

        zip.forEach((relativePath, file) => {
          if (relativePath.endsWith(".png") && !relativePath.startsWith("__MACOSX")) {
            console.log("Loading image:", relativePath);
            const promise = file.async("blob").then((blob) => {
              return new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => {
                  console.log(`Loaded: ${relativePath} (${img.width}x${img.height})`);
                  images.push(img);
                  resolve();
                };
                img.onerror = () => {
                  console.log("Error loading:", relativePath);
                  resolve();
                };
                img.src = URL.createObjectURL(blob);
              });
            });
            imagePromises.push(promise);
          }
        });

        await Promise.all(imagePromises);
        
        if (images.length > 0) {
          const maxWidth = Math.max(...images.map(img => img.width));
          const maxHeight = Math.max(...images.map(img => img.height));
          
          // Create base composite
          const baseCanvas = document.createElement("canvas");
          baseCanvas.width = maxWidth;
          baseCanvas.height = maxHeight;
          const baseCtx = baseCanvas.getContext("2d");
          
          // Create x-ray composite with different coloring
          const xrayCanvas = document.createElement("canvas");
          xrayCanvas.width = maxWidth;
          xrayCanvas.height = maxHeight;
          const xrayCtx = xrayCanvas.getContext("2d");
          
          if (baseCtx && xrayCtx) {
            // Draw all images centered
            images.forEach(img => {
              const x = (maxWidth - img.width) / 2;
              const y = (maxHeight - img.height) / 2;
              baseCtx.drawImage(img, x, y);
              xrayCtx.drawImage(img, x, y);
            });
            
            // Apply x-ray transformation - dramatic thermal/tech look
            xrayCtx.globalCompositeOperation = "source-atop";
            xrayCtx.fillStyle = "rgba(0, 0, 0, 0.4)";
            xrayCtx.fillRect(0, 0, maxWidth, maxHeight);
            
            xrayCtx.globalCompositeOperation = "overlay";
            xrayCtx.fillStyle = "rgba(0, 255, 200, 0.35)";
            xrayCtx.fillRect(0, 0, maxWidth, maxHeight);
            
            xrayCtx.globalCompositeOperation = "color-dodge";
            xrayCtx.fillStyle = "rgba(200, 170, 90, 0.25)";
            xrayCtx.fillRect(0, 0, maxWidth, maxHeight);
            
            // Create final images
            const baseImg = new Image();
            const xrayImg = new Image();
            
            let loadedCount = 0;
            const checkComplete = () => {
              loadedCount++;
              if (loadedCount === 2) {
                setBaseImage(baseImg);
                setXrayImage(xrayImg);
                setIsLoading(false);
              }
            };
            
            baseImg.onload = checkComplete;
            xrayImg.onload = checkComplete;
            
            baseImg.src = baseCanvas.toDataURL("image/png");
            xrayImg.src = xrayCanvas.toDataURL("image/png");
          }
        } else {
          setIsLoading(false);
        }
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

    // 5 Dimension lines configuration
    const dimensionLines = [
      { label: "PHYSICAL", angle: -90 },
      { label: "TECHNICAL", angle: -162 },
      { label: "TACTICAL", angle: -234 },
      { label: "MENTAL", angle: -306 },
      { label: "SOCIAL", angle: -18 },
    ];

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
        const imgY = (canvas.height - imgHeight) / 2 + 100;

        const playerCenterX = imgX + imgWidth / 2;
        const playerCenterY = imgY + imgHeight / 2;
        const xrayRadius = 180;

        // Draw single image (x-ray version)
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(xrayImage, imgX, imgY, imgWidth, imgHeight);

        // Calculate distance from mouse to player
        const distFromMouse = Math.sqrt(
          Math.pow(mousePos.x - playerCenterX, 2) + 
          Math.pow(mousePos.y - playerCenterY, 2)
        );

        // Show 5D lines when mouse is close
        const isMouseValid = mousePos.x > 0 && mousePos.y > 0;
        const isNearPlayer = distFromMouse < xrayRadius + imgWidth / 3;
        
        if (isMouseValid && isNearPlayer) {

          // 3. Draw 5D MATRIX LINES emanating from player center
          const baseLengthMin = 140;
          const baseLengthMax = 260;
          
          dimensionLines.forEach((dim, index) => {
            const angleRad = (dim.angle * Math.PI) / 180;
            
            // Pulsing animation
            const pulse = Math.sin(timeRef.current * 2.5 + index * 1.2) * 0.2 + 0.8;
            const lineLength = baseLengthMin + (baseLengthMax - baseLengthMin) * pulse;
            
            const endX = playerCenterX + Math.cos(angleRad) * lineLength;
            const endY = playerCenterY + Math.sin(angleRad) * lineLength;

            // Calculate visibility based on proximity
            const midX = playerCenterX + Math.cos(angleRad) * (lineLength / 2);
            const midY = playerCenterY + Math.sin(angleRad) * (lineLength / 2);
            const distToLine = Math.sqrt(
              Math.pow(mousePos.x - midX, 2) + 
              Math.pow(mousePos.y - midY, 2)
            );
            
            const alpha = Math.max(0.15, Math.min(1, 1.2 - distToLine / (xrayRadius * 1.8)));
            
            // Main glowing line
            ctx.strokeStyle = `rgba(0, 255, 200, ${alpha * 0.85})`;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = "rgba(0, 255, 200, 1)";
            ctx.shadowBlur = 25 * alpha;
            
            ctx.beginPath();
            ctx.moveTo(playerCenterX, playerCenterY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Inner gold line
            ctx.strokeStyle = `rgba(200, 170, 90, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.shadowBlur = 10 * alpha;
            ctx.beginPath();
            ctx.moveTo(playerCenterX, playerCenterY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Data particles streaming along line
            for (let p = 0; p < 10; p++) {
              const particleProgress = ((timeRef.current * 0.6 + p * 0.1 + index * 0.15) % 1);
              const px = playerCenterX + Math.cos(angleRad) * lineLength * particleProgress;
              const py = playerCenterY + Math.sin(angleRad) * lineLength * particleProgress;
              
              const particleAlpha = alpha * Math.sin(particleProgress * Math.PI) * 0.9;
              ctx.fillStyle = `rgba(0, 255, 200, ${particleAlpha})`;
              ctx.shadowColor = "rgba(0, 255, 200, 1)";
              ctx.shadowBlur = 10;
              ctx.beginPath();
              ctx.arc(px, py, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }

            // End node - hexagonal
            ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
            ctx.shadowColor = "rgba(0, 255, 200, 1)";
            ctx.shadowBlur = 20 * alpha;
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const hexAngle = (i * Math.PI) / 3 - Math.PI / 6;
              const hexRadius = 10 + pulse * 5;
              const hx = endX + Math.cos(hexAngle) * hexRadius;
              const hy = endY + Math.sin(hexAngle) * hexRadius;
              if (i === 0) ctx.moveTo(hx, hy);
              else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = `rgba(200, 170, 90, ${alpha * 0.7})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = "bold 12px 'Bebas Neue', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            const labelDist = lineLength + 30;
            const labelX = playerCenterX + Math.cos(angleRad) * labelDist;
            const labelY = playerCenterY + Math.sin(angleRad) * labelDist;
            
            // Label bg
            const textWidth = ctx.measureText(dim.label).width;
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
            ctx.shadowBlur = 0;
            ctx.fillRect(labelX - textWidth / 2 - 8, labelY - 10, textWidth + 16, 20);
            
            // Label border
            ctx.strokeStyle = `rgba(0, 255, 200, ${alpha * 0.6})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(labelX - textWidth / 2 - 8, labelY - 10, textWidth + 16, 20);
            
            // Label text
            ctx.fillStyle = `rgba(0, 255, 200, ${alpha})`;
            ctx.shadowColor = "rgba(0, 255, 200, 0.8)";
            ctx.shadowBlur = 6;
            ctx.fillText(dim.label, labelX, labelY);
            ctx.shadowBlur = 0;
          });

          // Center core node
          const corePulse = Math.sin(timeRef.current * 3) * 0.3 + 0.7;
          
          ctx.strokeStyle = `rgba(0, 255, 200, ${0.6 * corePulse})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = "rgba(0, 255, 200, 1)";
          ctx.shadowBlur = 30;
          ctx.beginPath();
          ctx.arc(playerCenterX, playerCenterY, 18 + corePulse * 6, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.fillStyle = `rgba(200, 170, 90, 0.9)`;
          ctx.shadowColor = "rgba(200, 170, 90, 1)";
          ctx.shadowBlur = 25;
          ctx.beginPath();
          ctx.arc(playerCenterX, playerCenterY, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // X-ray circle indicator
          ctx.strokeStyle = "rgba(0, 255, 200, 0.3)";
          ctx.lineWidth = 1;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.arc(mousePos.x, mousePos.y, xrayRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
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