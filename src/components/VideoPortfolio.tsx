import { useState, useEffect } from "react";

const videos = [
  "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&loop=1&playlist=pWH2cdmzwVg",
  "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&loop=1&playlist=XtmRhHvXeyo",
  "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&loop=1&playlist=pWH2cdmzwVg",
  "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&loop=1&playlist=XtmRhHvXeyo",
];

export const VideoPortfolio = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % videos.length);
        setIsTransitioning(false);
      }, 600);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[60vh] md:h-[70vh] perspective-1000">
      <div className="relative w-full h-full">
        {videos.map((video, index) => {
          const position = (index - currentIndex + videos.length) % videos.length;
          
          return (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
              style={{
                transform: `
                  translateX(${position * 25}%)
                  translateZ(${position === 0 ? '0px' : `-${position * 150}px`})
                  rotateY(${position * -15}deg)
                  scale(${position === 0 ? 1 : 0.85 - position * 0.1})
                `,
                zIndex: videos.length - position,
                opacity: position === 0 ? 1 : 0.3 - position * 0.1,
                pointerEvents: position === 0 ? 'auto' : 'none',
                filter: position === 0 ? 'brightness(1)' : `brightness(${0.6 - position * 0.15})`,
              }}
            >
              <div className="w-full h-full rounded-xl overflow-hidden border-2 border-primary/20 shadow-2xl">
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
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-50">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setCurrentIndex(index);
                setIsTransitioning(false);
              }, 300);
            }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-primary w-8'
                : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
};
