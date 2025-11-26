import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Video } from "lucide-react";

export const VideoScene3D = () => {
  const [videos, setVideos] = useState<string[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [videoWeights, setVideoWeights] = useState<number[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('homepage_videos')
        .select('video_url')
        .eq('is_active', true)
        .order('order_position', { ascending: true });

      if (data && !error) {
        const videoUrls = data.map(v => v.video_url);
        setVideos(videoUrls);
        setVideoWeights(videoUrls.map(() => 1));
      }
    };

    fetchVideos();
  }, []);

  // Continuous size animation using sine waves with different phases
  useEffect(() => {
    if (videos.length === 0) return;

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
    // Use continuous animation weights - map to predefined flex classes
    const weight = videoWeights[index] || 1;
    if (weight < 1.2) return "flex-[0.8]";
    if (weight < 1.4) return "flex-1";
    if (weight < 1.6) return "flex-[1.2]";
    if (weight < 1.8) return "flex-[1.5]";
    if (weight < 2.0) return "flex-[1.8]";
    return "flex-[2.2]";
  };

  return (
    <div className="w-full bg-black py-0 relative z-0 h-[80vh] md:h-[70vh]">
      {videos.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center text-white">
          <div className="text-center">
            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Loading videos...</p>
          </div>
        </div>
      ) : videos.length < 6 ? (
        <div className="w-full h-full flex items-center justify-center text-white">
          <div className="text-center">
            <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Loading videos... ({videos.length}/6)</p>
          </div>
        </div>
      ) : (
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
                <video
                  src={videos[0]}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
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
                <video
                  src={videos[1]}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
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
                <video
                  src={videos[2]}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
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
                <video
                  src={videos[3]}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
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
                <video
                  src={videos[4]}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
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
                <video
                  src={videos[5]}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
                />
                {hoveredIndex === 5 && (
                  <div className="absolute inset-0 border-4 border-primary pointer-events-none z-10" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
