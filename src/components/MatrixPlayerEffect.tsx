import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";

interface MatrixPlayerEffectProps {
  className?: string;
}

interface LayerImage {
  img: HTMLImageElement;
  name: string;
}

export const MatrixPlayerEffect = ({ className = "" }: MatrixPlayerEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<number>();

  // Load images from zip - separate base and overlay
  useEffect(() => {
    const loadZip = async () => {
      try {
        const response = await fetch("/assets/Website_Hero_RISE.zip");
        const zipData = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(zipData);
        
        const layers: LayerImage[] = [];
        const imagePromises: Promise<void>[] = [];

        zip.forEach((relativePath, file) => {
          if (relativePath.endsWith(".png") && !relativePath.startsWith("__MACOSX")) {
            console.log("Loading image:", relativePath);
            const promise = file.async("blob").then((blob) => {
              return new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => {
                  console.log(`Loaded: ${relativePath} (${img.width}x${img.height})`);
                  layers.push({ img, name: relativePath });
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
        
        if (layers.length > 0) {
          // Sort layers by name to ensure consistent ordering
          layers.sort((a, b) => a.name.localeCompare(b.name));
          
          const maxWidth = Math.max(...layers.map(l => l.img.width));
          const maxHeight = Math.max(...layers.map(l => l.img.height));
          
          // Create base composite (all layers combined normally)
          const baseCanvas = document.createElement("canvas");
          baseCanvas.width = maxWidth;
          baseCanvas.height = maxHeight;
          const baseCtx = baseCanvas.getContext("2d");
          
          // Create overlay composite (with different coloring for x-ray reveal)
          const overlayCanvas = document.createElement("canvas");
          overlayCanvas.width = maxWidth;
          overlayCanvas.height = maxHeight;
          const overlayCtx = overlayCanvas.getContext("2d");
          
          if (baseCtx && overlayCtx) {
            // Draw all layers to base - centered
            layers.forEach(layer => {
              const x = (maxWidth - layer.img.width) / 2;
              const y = (maxHeight - layer.img.height) / 2;
              baseCtx.drawImage(layer.img, x, y);
            });
            
            // Draw layers to overlay with gold tint effect
            layers.forEach(layer => {
              const x = (maxWidth - layer.img.width) / 2;
              const y = (maxHeight - layer.img.height) / 2;
              overlayCtx.drawImage(layer.img, x, y);
            });
            
            // Apply gold color overlay effect
            overlayCtx.globalCompositeOperation = "source-atop";
            overlayCtx.fillStyle = "rgba(200, 170, 90, 0.4)";
            overlayCtx.fillRect(0, 0, maxWidth, maxHeight);
            
            // Add glow effect
            overlayCtx.globalCompositeOperation = "lighter";
            overlayCtx.fillStyle = "rgba(255, 215, 100, 0.15)";
            overlayCtx.fillRect(0, 0, maxWidth, maxHeight);
            
            // Create final images
            const baseImg = new Image();
            const overlayImg = new Image();
            
            let loadedCount = 0;
            const checkComplete = () => {
              loadedCount++;
              if (loadedCount === 2) {
                setBaseImage(baseImg);
                setOverlayImage(overlayImg);
                setIsLoading(false);
              }
            };
            
            baseImg.onload = checkComplete;
            overlayImg.onload = checkComplete;
            
            baseImg.src = baseCanvas.toDataURL("image/png");
            overlayImg.src = overlayCanvas.toDataURL("image/png");
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
    const fontSize = 12;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    // 5 Dimension lines - key performance dimensions
    const dimensionLines = [
      { label: "PHYSICAL", angle: -90, color: "rgba(255, 100, 100, 0.9)" },
      { label: "TECHNICAL", angle: -162, color: "rgba(100, 255, 100, 0.9)" },
      { label: "TACTICAL", angle: -234, color: "rgba(100, 100, 255, 0.9)" },
      { label: "MENTAL", angle: -306, color: "rgba(255, 200, 100, 0.9)" },
      { label: "SOCIAL", angle: -18, color: "rgba(200, 100, 255, 0.9)" },
    ];

    const animate = () => {
      // Clear with black
      ctx.fillStyle = "rgba(0, 0, 0, 0.92)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Matrix binary rain (subtle, in background)
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? "1" : "0";
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const distance = Math.sqrt(Math.pow(x - mousePos.x, 2) + Math.pow(y - mousePos.y, 2));
        const xrayRadius = 200;

        if (distance < xrayRadius) {
          const intensity = 1 - distance / xrayRadius;
          ctx.fillStyle = `rgba(200, 170, 90, ${0.1 + intensity * 0.5})`;
        } else {
          ctx.fillStyle = "rgba(200, 170, 90, 0.06)";
        }

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Draw player image
      if (baseImage) {
        const scale = Math.min(
          (canvas.height * 0.85) / baseImage.height,
          (canvas.width * 0.7) / baseImage.width
        );
        const imgWidth = baseImage.width * scale;
        const imgHeight = baseImage.height * scale;
        const imgX = (canvas.width - imgWidth) / 2;
        const imgY = (canvas.height - imgHeight) / 2 + 20;

        const playerCenterX = imgX + imgWidth / 2;
        const playerCenterY = imgY + imgHeight / 2;
        const xrayRadius = 200;

        // Draw base player image
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(baseImage, imgX, imgY, imgWidth, imgHeight);

        // Check if mouse is within x-ray range
        const distFromPlayer = Math.sqrt(
          Math.pow(mousePos.x - playerCenterX, 2) + 
          Math.pow(mousePos.y - playerCenterY, 2)
        );

        if (distFromPlayer < xrayRadius + imgWidth / 2 && overlayImage) {
          // Create circular reveal mask for overlay
          ctx.save();
          ctx.beginPath();
          ctx.arc(mousePos.x, mousePos.y, xrayRadius, 0, Math.PI * 2);
          ctx.clip();
          
          // Draw overlay image (gold tinted version)
          ctx.drawImage(overlayImage, imgX, imgY, imgWidth, imgHeight);
          
          // Add glow effect in the reveal area
          const gradient = ctx.createRadialGradient(
            mousePos.x, mousePos.y, 0,
            mousePos.x, mousePos.y, xrayRadius
          );
          gradient.addColorStop(0, "rgba(200, 170, 90, 0.15)");
          gradient.addColorStop(0.5, "rgba(200, 170, 90, 0.08)");
          gradient.addColorStop(1, "rgba(200, 170, 90, 0)");
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.restore();

          // Draw 5 dimension lines from player center
          const lineLength = 120;
          dimensionLines.forEach((dim, index) => {
            const angleRad = (dim.angle * Math.PI) / 180;
            const endX = playerCenterX + Math.cos(angleRad) * lineLength;
            const endY = playerCenterY + Math.sin(angleRad) * lineLength;

            // Calculate opacity based on distance from mouse to line endpoint
            const distToEnd = Math.sqrt(
              Math.pow(mousePos.x - endX, 2) + 
              Math.pow(mousePos.y - endY, 2)
            );
            const alpha = Math.max(0, Math.min(1, (1 - distToEnd / (xrayRadius * 1.5)) * 1.2));

            if (alpha > 0.1) {
              // Draw line
              ctx.strokeStyle = dim.color.replace("0.9", String(alpha * 0.9));
              ctx.lineWidth = 2;
              ctx.shadowColor = dim.color;
              ctx.shadowBlur = 10 * alpha;
              
              ctx.beginPath();
              ctx.moveTo(playerCenterX, playerCenterY);
              ctx.lineTo(endX, endY);
              ctx.stroke();

              // Draw endpoint node
              ctx.fillStyle = dim.color.replace("0.9", String(alpha));
              ctx.beginPath();
              ctx.arc(endX, endY, 6, 0, Math.PI * 2);
              ctx.fill();

              // Draw label
              ctx.font = "bold 10px 'Bebas Neue', sans-serif";
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
              ctx.textAlign = "center";
              
              const labelX = playerCenterX + Math.cos(angleRad) * (lineLength + 20);
              const labelY = playerCenterY + Math.sin(angleRad) * (lineLength + 20);
              ctx.fillText(dim.label, labelX, labelY);

              ctx.shadowBlur = 0;
            }
          });

          // Draw center node
          const centerDist = Math.sqrt(
            Math.pow(mousePos.x - playerCenterX, 2) + 
            Math.pow(mousePos.y - playerCenterY, 2)
          );
          const centerAlpha = Math.max(0, 1 - centerDist / xrayRadius);
          
          if (centerAlpha > 0.1) {
            ctx.fillStyle = `rgba(200, 170, 90, ${centerAlpha * 0.8})`;
            ctx.shadowColor = "rgba(200, 170, 90, 0.8)";
            ctx.shadowBlur = 15 * centerAlpha;
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // Draw subtle x-ray cursor circle
        ctx.strokeStyle = "rgba(200, 170, 90, 0.3)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, xrayRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
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
  }, [baseImage, overlayImage, mousePos]);

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