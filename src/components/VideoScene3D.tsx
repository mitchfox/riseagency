import { useState, useEffect } from "react";

export const VideoScene3D = () => {
  const videos = [
    "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&controls=0&loop=1&playlist=pWH2cdmzwVg&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&controls=0&loop=1&playlist=XtmRhHvXeyo&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/N58wQGqq3vo?autoplay=1&mute=1&controls=0&loop=1&playlist=N58wQGqq3vo&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/kDPvZexzvkM?autoplay=1&mute=1&controls=0&loop=1&playlist=kDPvZexzvkM&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/6UWPH_TRGQc?autoplay=1&mute=1&controls=0&loop=1&playlist=6UWPH_TRGQc&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/eVx-VjNfb2A?autoplay=1&mute=1&controls=0&loop=1&playlist=eVx-VjNfb2A&modestbranding=1&rel=0",
  ];

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [videoWeights, setVideoWeights] = useState<number[]>(videos.map(() => 1));

  // Continuous size animation using sine waves with different phases
  useEffect(() => {
    let animationFrameId: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000; // Time in seconds
      
      const newWeights = videos.map((_, index) => {
        // Each video has a different phase offset for variation
        const phase = (index * Math.PI) / 3;
        // Sine wave oscillation between 0.8 and 2.2 for smooth size changes
        const weight = 1.5 + Math.sin(elapsed * 0.4 + phase) * 0.7;
        return weight;
      });

      setVideoWeights(newWeights);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [videos.length]);

  // Calculate sizes based on hover state or continuous animation
  const getVideoSize = (index: number) => {
    // Hover takes priority
    if (hoveredIndex !== null) {
      return hoveredIndex === index ? "flex-[2.5]" : "flex-[0.7]";
    }
    // Use continuous animation weights
    return `flex-[${videoWeights[index].toFixed(2)}]`;
  };

  return (
    <div className="w-full bg-black py-0 relative z-0 h-[80vh] md:h-[70vh]">
      <div className="w-full h-full">
        {/* Tight grid with no gaps - videos share borders */}
        <div className="flex flex-col h-full">
          {/* Top row */}
          <div className="flex flex-1">
            <div 
              className={`${getVideoSize(0)} relative overflow-hidden border-r-2 border-b-2 border-primary/20 transition-all duration-500 ease-in-out`}
              onMouseEnter={() => setHoveredIndex(0)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <iframe
                src={videos[0]}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video 1"
              />
              {hoveredIndex === 0 && (
                <div className="absolute inset-0 border-4 border-primary pointer-events-none z-10" />
              )}
            </div>

            <div 
              className={`${getVideoSize(1)} relative overflow-hidden border-r-2 border-b-2 border-primary/20 transition-all duration-500 ease-in-out`}
              onMouseEnter={() => setHoveredIndex(1)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <iframe
                src={videos[1]}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video 2"
              />
              {hoveredIndex === 1 && (
                <div className="absolute inset-0 border-4 border-primary pointer-events-none z-10" />
              )}
            </div>

            <div 
              className={`${getVideoSize(2)} relative overflow-hidden border-b-2 border-primary/20 transition-all duration-500 ease-in-out`}
              onMouseEnter={() => setHoveredIndex(2)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <iframe
                src={videos[2]}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video 3"
              />
              {hoveredIndex === 2 && (
                <div className="absolute inset-0 border-4 border-primary pointer-events-none z-10" />
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex flex-1">
            <div 
              className={`${getVideoSize(3)} relative overflow-hidden border-r-2 border-primary/20 transition-all duration-500 ease-in-out`}
              onMouseEnter={() => setHoveredIndex(3)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <iframe
                src={videos[3]}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video 4"
              />
              {hoveredIndex === 3 && (
                <div className="absolute inset-0 border-4 border-primary pointer-events-none z-10" />
              )}
            </div>

            <div 
              className={`${getVideoSize(4)} relative overflow-hidden border-r-2 border-primary/20 transition-all duration-500 ease-in-out`}
              onMouseEnter={() => setHoveredIndex(4)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <iframe
                src={videos[4]}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video 5"
              />
              {hoveredIndex === 4 && (
                <div className="absolute inset-0 border-4 border-primary pointer-events-none z-10" />
              )}
            </div>

            <div 
              className={`${getVideoSize(5)} relative overflow-hidden border-primary/20 transition-all duration-500 ease-in-out`}
              onMouseEnter={() => setHoveredIndex(5)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <iframe
                src={videos[5]}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video 6"
              />
              {hoveredIndex === 5 && (
                <div className="absolute inset-0 border-4 border-primary pointer-events-none z-10" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
