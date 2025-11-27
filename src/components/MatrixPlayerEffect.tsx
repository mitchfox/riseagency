import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";

interface MatrixPlayerEffectProps {
  className?: string;
}

export const MatrixPlayerEffect = ({ className = "" }: MatrixPlayerEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerImage, setPlayerImage] = useState<HTMLImageElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<number>();

  // Load images from zip and composite them
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
        
        // Composite all images into one
        if (images.length > 0) {
          const maxWidth = Math.max(...images.map(img => img.width));
          const maxHeight = Math.max(...images.map(img => img.height));
          
          const compositeCanvas = document.createElement("canvas");
          compositeCanvas.width = maxWidth;
          compositeCanvas.height = maxHeight;
          const ctx = compositeCanvas.getContext("2d");
          
          if (ctx) {
            // Draw all images overlayed
            images.forEach(img => {
              const x = (maxWidth - img.width) / 2;
              const y = (maxHeight - img.height) / 2;
              ctx.drawImage(img, x, y);
            });
            
            // Create final composite image
            const compositeImg = new Image();
            compositeImg.onload = () => {
              setPlayerImage(compositeImg);
              setIsLoading(false);
            };
            compositeImg.src = compositeCanvas.toDataURL("image/png");
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

  // Matrix animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
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

    // Key points on player for trajectory lines (relative to player center/size)
    const trajectoryPoints = [
      { x: 0, y: -0.35, angle: -90, label: "head" },      // Head
      { x: -0.15, y: -0.15, angle: -135, label: "shoulder_l" }, // Left shoulder
      { x: 0.15, y: -0.15, angle: -45, label: "shoulder_r" },  // Right shoulder
      { x: -0.25, y: 0, angle: -160, label: "elbow_l" },    // Left elbow
      { x: 0.25, y: 0, angle: -20, label: "elbow_r" },     // Right elbow
      { x: -0.1, y: 0.15, angle: -170, label: "hip_l" },    // Left hip
      { x: 0.1, y: 0.15, angle: -10, label: "hip_r" },     // Right hip
      { x: -0.15, y: 0.35, angle: 200, label: "knee_l" },   // Left knee
      { x: 0.15, y: 0.35, angle: -20, label: "knee_r" },    // Right knee
      { x: -0.2, y: 0.48, angle: 220, label: "foot_l" },    // Left foot
      { x: 0.2, y: 0.48, angle: -40, label: "foot_r" },     // Right foot
    ];

    // Animation loop
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

        // Calculate distance from mouse
        const distance = Math.sqrt(Math.pow(x - mousePos.x, 2) + Math.pow(y - mousePos.y, 2));
        const xrayRadius = 250;

        if (distance < xrayRadius) {
          const intensity = 1 - distance / xrayRadius;
          ctx.fillStyle = `rgba(200, 170, 90, ${0.1 + intensity * 0.5})`;
        } else {
          ctx.fillStyle = "rgba(200, 170, 90, 0.08)";
        }

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Draw player image
      if (playerImage) {
        const scale = Math.min(
          (canvas.height * 0.85) / playerImage.height,
          (canvas.width * 0.7) / playerImage.width
        );
        const imgWidth = playerImage.width * scale;
        const imgHeight = playerImage.height * scale;
        const imgX = (canvas.width - imgWidth) / 2;
        const imgY = (canvas.height - imgHeight) / 2 + 20;

        // Draw player
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(playerImage, imgX, imgY, imgWidth, imgHeight);

        // X-ray effect - only draw trajectory lines when mouse is near
        const playerCenterX = imgX + imgWidth / 2;
        const playerCenterY = imgY + imgHeight / 2;
        const xrayRadius = 250;

        // Check if mouse is within x-ray range of player
        const distFromPlayer = Math.sqrt(
          Math.pow(mousePos.x - playerCenterX, 2) + 
          Math.pow(mousePos.y - playerCenterY, 2)
        );

        if (distFromPlayer < xrayRadius + imgWidth / 2) {
          // Draw trajectory lines from key body points
          trajectoryPoints.forEach((point) => {
            const pointX = playerCenterX + point.x * imgWidth;
            const pointY = playerCenterY + point.y * imgHeight;
            
            const distFromMouse = Math.sqrt(
              Math.pow(mousePos.x - pointX, 2) + 
              Math.pow(mousePos.y - pointY, 2)
            );

            if (distFromMouse < xrayRadius) {
              const alpha = (1 - distFromMouse / xrayRadius) * 0.9;
              const lineLength = 60 + alpha * 60;
              
              // Calculate end point
              const angleRad = (point.angle * Math.PI) / 180;
              const endX = pointX + Math.cos(angleRad) * lineLength;
              const endY = pointY + Math.sin(angleRad) * lineLength;

              // Draw glowing line
              ctx.strokeStyle = `rgba(200, 170, 90, ${alpha})`;
              ctx.lineWidth = 2;
              ctx.shadowColor = "rgba(200, 170, 90, 0.8)";
              ctx.shadowBlur = 8 * alpha;
              
              ctx.beginPath();
              ctx.moveTo(pointX, pointY);
              ctx.lineTo(endX, endY);
              ctx.stroke();

              // Draw node point at origin
              ctx.fillStyle = `rgba(200, 170, 90, ${alpha})`;
              ctx.beginPath();
              ctx.arc(pointX, pointY, 4, 0, Math.PI * 2);
              ctx.fill();

              // Draw arrow head
              const arrowSize = 8;
              const arrowAngle = Math.PI / 6;
              
              ctx.beginPath();
              ctx.moveTo(endX, endY);
              ctx.lineTo(
                endX - arrowSize * Math.cos(angleRad - arrowAngle),
                endY - arrowSize * Math.sin(angleRad - arrowAngle)
              );
              ctx.moveTo(endX, endY);
              ctx.lineTo(
                endX - arrowSize * Math.cos(angleRad + arrowAngle),
                endY - arrowSize * Math.sin(angleRad + arrowAngle)
              );
              ctx.stroke();

              // Draw end node
              ctx.beginPath();
              ctx.arc(endX, endY, 3, 0, Math.PI * 2);
              ctx.fill();

              ctx.shadowBlur = 0;
            }
          });

          // Draw subtle green x-ray overlay on player area near mouse
          const gradient = ctx.createRadialGradient(
            mousePos.x, mousePos.y, 0,
            mousePos.x, mousePos.y, xrayRadius
          );
          gradient.addColorStop(0, "rgba(200, 170, 90, 0.08)");
          gradient.addColorStop(0.7, "rgba(200, 170, 90, 0.02)");
          gradient.addColorStop(1, "rgba(200, 170, 90, 0)");

          ctx.globalCompositeOperation = "overlay";
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = "source-over";
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
  }, [playerImage, mousePos]);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
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
