import { useState } from "react";

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

  return (
    <div className="w-full bg-black py-8 md:py-12 relative z-0">
      <div className="container mx-auto px-4">
        {/* Asymmetric grid layout */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Large video - spans 8 cols */}
          <div 
            className="col-span-12 md:col-span-8 aspect-video relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:scale-[1.02]"
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
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}
          </div>

          {/* Medium video - spans 4 cols */}
          <div 
            className="col-span-12 md:col-span-4 aspect-video relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:scale-[1.02]"
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
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}
          </div>

          {/* Small video - spans 3 cols */}
          <div 
            className="col-span-6 md:col-span-3 aspect-video relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:scale-[1.02]"
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
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}
          </div>

          {/* Medium video - spans 5 cols */}
          <div 
            className="col-span-6 md:col-span-5 aspect-video relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:scale-[1.02]"
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
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}
          </div>

          {/* Small video - spans 4 cols */}
          <div 
            className="col-span-12 md:col-span-4 aspect-video relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:scale-[1.02]"
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
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}
          </div>

          {/* Large video - spans 7 cols */}
          <div 
            className="col-span-12 md:col-span-7 aspect-video relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:scale-[1.02]"
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
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}
          </div>

          {/* Medium video - spans 5 cols */}
          <div 
            className="col-span-12 md:col-span-5 aspect-video relative overflow-hidden rounded-lg border-2 border-primary/30 transition-all duration-300 hover:border-primary hover:scale-[1.02]"
            onMouseEnter={() => setHoveredIndex(5)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <iframe
              src={videos[0]}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video 7"
            />
            {hoveredIndex === 5 && (
              <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
