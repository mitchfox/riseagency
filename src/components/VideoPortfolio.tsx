import { useState, useEffect } from "react";

const videos = [
  "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&controls=0&loop=1&playlist=pWH2cdmzwVg&modestbranding=1&rel=0",
  "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&controls=0&loop=1&playlist=XtmRhHvXeyo&modestbranding=1&rel=0",
  "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&controls=0&loop=1&playlist=pWH2cdmzwVg&modestbranding=1&rel=0",
  "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&controls=0&loop=1&playlist=XtmRhHvXeyo&modestbranding=1&rel=0",
];

export const VideoPortfolio = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, 6000); // Change video every 6 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[50vh] md:h-[70vh] overflow-visible">
      {/* 3D Container */}
      <div 
        className="relative w-full h-full"
        style={{
          perspective: "2000px",
          perspectiveOrigin: "center center",
        }}
      >
        {videos.map((video, index) => {
          // Calculate position relative to current index
          const position = (index - currentIndex + videos.length) % videos.length;
          const isCurrent = position === 0;
          const isPrevious = position === videos.length - 1;
          
          // 3D transformation based on position
          let transform = "";
          let opacity = 0;
          let zIndex = 0;
          
          if (isCurrent) {
            // Current video: center, front, full opacity
            transform = "translateX(0%) translateZ(0px) rotateY(0deg) scale(1)";
            opacity = 1;
            zIndex = 30;
          } else if (position === 1) {
            // Next video: slightly right and back
            transform = "translateX(40%) translateZ(-400px) rotateY(-25deg) scale(0.75)";
            opacity = 0.4;
            zIndex = 20;
          } else if (position === 2) {
            // Further right and more back
            transform = "translateX(70%) translateZ(-700px) rotateY(-35deg) scale(0.5)";
            opacity = 0.2;
            zIndex = 10;
          } else if (isPrevious) {
            // Previous video: slightly left and back (for smooth transition)
            transform = "translateX(-40%) translateZ(-400px) rotateY(25deg) scale(0.75)";
            opacity = 0.4;
            zIndex = 5;
          }
          
          return (
            <div
              key={index}
              className="absolute inset-0 transition-all duration-1000 ease-in-out"
              style={{
                transform,
                opacity,
                zIndex,
                transformStyle: "preserve-3d",
              }}
            >
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/30">
                <iframe
                  src={video}
                  title={`Video ${index + 1}`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation dots */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 flex gap-3 z-50">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all duration-300 rounded-full ${
              index === currentIndex
                ? 'bg-primary w-10 h-3'
                : 'bg-white/40 hover:bg-white/60 w-3 h-3'
            }`}
            aria-label={`Go to video ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
