import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";

interface MatrixPlayerEffectProps {
  className?: string;
}

export const MatrixPlayerEffect = ({ className = "" }: MatrixPlayerEffectProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerImages, setPlayerImages] = useState<HTMLImageElement[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<number>();
  const currentImageIndex = useRef(0);

  // Load images from zip
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
            const promise = file.async("blob").then((blob) => {
              return new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => {
                  images.push(img);
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = URL.createObjectURL(blob);
              });
            });
            imagePromises.push(promise);
          }
        });

        await Promise.all(imagePromises);
        setPlayerImages(images);
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
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Matrix animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || playerImages.length === 0) return;

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

    // Matrix characters
    const matrixChars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = new Array(columns).fill(1);

    // Animation loop
    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Matrix rain
      ctx.fillStyle = "#0F0";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Calculate distance from mouse for glow effect
        const mouseX = mousePos.x * canvas.width;
        const mouseY = mousePos.y * canvas.height;
        const distance = Math.sqrt(Math.pow(x - mouseX, 2) + Math.pow(y - mouseY, 2));
        const maxDistance = 200;

        if (distance < maxDistance) {
          const intensity = 1 - distance / maxDistance;
          ctx.fillStyle = `rgba(0, 255, 0, ${0.3 + intensity * 0.7})`;
          ctx.shadowColor = "#0F0";
          ctx.shadowBlur = 10 * intensity;
        } else {
          ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
          ctx.shadowBlur = 0;
        }

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Draw player image with x-ray effect
      if (playerImages.length > 0) {
        const img = playerImages[currentImageIndex.current % playerImages.length];
        const scale = Math.min(
          (canvas.height * 0.8) / img.height,
          (canvas.width * 0.6) / img.width
        );
        const imgWidth = img.width * scale;
        const imgHeight = img.height * scale;
        const imgX = (canvas.width - imgWidth) / 2;
        const imgY = (canvas.height - imgHeight) / 2;

        // Draw player
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);

        // X-ray spotlight effect around mouse
        const mouseX = mousePos.x * canvas.width;
        const mouseY = mousePos.y * canvas.height;
        const spotlightRadius = 150;

        // Create radial gradient for x-ray effect
        const gradient = ctx.createRadialGradient(
          mouseX, mouseY, 0,
          mouseX, mouseY, spotlightRadius
        );
        gradient.addColorStop(0, "rgba(0, 255, 0, 0.3)");
        gradient.addColorStop(0.5, "rgba(0, 255, 0, 0.1)");
        gradient.addColorStop(1, "rgba(0, 255, 0, 0)");

        ctx.globalCompositeOperation = "overlay";
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines around mouse (x-ray grid)
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
        ctx.lineWidth = 1;

        // Hexagonal grid pattern around mouse
        const gridSize = 30;
        for (let x = mouseX - spotlightRadius; x < mouseX + spotlightRadius; x += gridSize) {
          for (let y = mouseY - spotlightRadius; y < mouseY + spotlightRadius; y += gridSize) {
            const dist = Math.sqrt(Math.pow(x - mouseX, 2) + Math.pow(y - mouseY, 2));
            if (dist < spotlightRadius) {
              const alpha = 1 - dist / spotlightRadius;
              ctx.strokeStyle = `rgba(0, 255, 0, ${alpha * 0.6})`;
              
              // Draw movement vectors
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + gridSize * 0.5, y - gridSize * 0.5);
              ctx.stroke();
              
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + gridSize * 0.5, y + gridSize * 0.5);
              ctx.stroke();

              // Draw node points
              ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Draw movement trajectory lines from player center
        const playerCenterX = imgX + imgWidth / 2;
        const playerCenterY = imgY + imgHeight * 0.3;
        
        const distFromPlayer = Math.sqrt(
          Math.pow(mouseX - playerCenterX, 2) + 
          Math.pow(mouseY - playerCenterY, 2)
        );

        if (distFromPlayer < 300) {
          const trajectoryAlpha = 1 - distFromPlayer / 300;
          ctx.strokeStyle = `rgba(0, 255, 0, ${trajectoryAlpha * 0.8})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          
          // Draw multiple potential movement paths
          for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
            const endX = playerCenterX + Math.cos(angle) * 100;
            const endY = playerCenterY + Math.sin(angle) * 100;
            
            ctx.beginPath();
            ctx.moveTo(playerCenterX, playerCenterY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Arrow head
            ctx.beginPath();
            ctx.arc(endX, endY, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 0, ${trajectoryAlpha})`;
            ctx.fill();
          }
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
  }, [playerImages, mousePos]);

  // Cycle through images
  useEffect(() => {
    if (playerImages.length > 1) {
      const interval = setInterval(() => {
        currentImageIndex.current = (currentImageIndex.current + 1) % playerImages.length;
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [playerImages.length]);

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
