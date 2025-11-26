import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

// Video card component that floats in 3D space
function VideoCard({ position, rotation, url, index }: { position: [number, number, number], rotation: [number, number, number], url: string, index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <mesh
        position={position}
        rotation={rotation}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.3 : 1}
      >
        <planeGeometry args={[10, 5.625]} />
        <meshStandardMaterial 
          color="#000000"
          side={THREE.DoubleSide}
          emissive={hovered ? "#e8c168" : "#000000"}
          emissiveIntensity={hovered ? 0.5 : 0}
          transparent
          opacity={0}
        />
        <Html
          transform
          distanceFactor={1.5}
          position={[0, 0, 0.01]}
          style={{
            width: '1200px',
            height: '675px',
            pointerEvents: 'none',
          }}
        >
          <div className="w-full h-full rounded-lg overflow-hidden shadow-2xl" style={{ border: hovered ? '3px solid #e8c168' : '3px solid rgba(232, 193, 104, 0.3)' }}>
            <iframe
              src={url}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={`Video ${index + 1}`}
              style={{ 
                pointerEvents: 'none',
                display: 'block',
                margin: 0,
                padding: 0,
              }}
            />
          </div>
        </Html>
      </mesh>
    </>
  );
}

// Main 3D Scene
function Scene() {
  const videos = [
    "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&controls=0&loop=1&playlist=pWH2cdmzwVg&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&controls=0&loop=1&playlist=XtmRhHvXeyo&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&controls=0&loop=1&playlist=pWH2cdmzwVg&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&controls=0&loop=1&playlist=XtmRhHvXeyo&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/pWH2cdmzwVg?autoplay=1&mute=1&controls=0&loop=1&playlist=pWH2cdmzwVg&modestbranding=1&rel=0",
    "https://www.youtube.com/embed/XtmRhHvXeyo?autoplay=1&mute=1&controls=0&loop=1&playlist=XtmRhHvXeyo&modestbranding=1&rel=0",
  ];

  // Base positions for videos - they'll move relative to these
  const basePositions: [number, number, number][] = [
    [0, 0, 0],      // Center
    [7, 1, -3],     // Right upper
    [-7, -1, -3],   // Left lower
    [5, -2, 1],     // Right lower front
    [-5, 2, 1],     // Left upper front
    [0, -3, -4],    // Bottom back
  ];

  const rotations: [number, number, number][] = [
    [0, 0, 0],
    [0.2, -0.5, 0],
    [-0.2, 0.5, 0],
    [0.3, -0.3, 0.1],
    [-0.3, 0.3, -0.1],
    [0.4, 0, 0],
  ];

  // Store animated positions
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  // Animate the video cards with crossover movement
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    meshRefs.current.forEach((mesh, index) => {
      if (mesh) {
        // Create circular orbital motion for crossover effect
        const radius = 2;
        const speed = 0.2 + index * 0.05;
        const angle = time * speed + index * (Math.PI * 2 / videos.length);
        
        // Apply animated offset to base position
        const basePos = basePositions[index];
        mesh.position.x = basePos[0] + Math.cos(angle) * radius;
        mesh.position.y = basePos[1] + Math.sin(angle * 0.7) * (radius * 0.5);
        mesh.position.z = basePos[2] + Math.sin(angle) * (radius * 0.3);
      }
    });
  });

  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.5} />
      
      {/* Directional light for depth */}
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      
      {/* Spot light for dramatic effect */}
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={0.5} castShadow />

      {/* Video cards with refs for animation */}
      {videos.map((url, index) => (
        <mesh
          key={index}
          ref={(el) => (meshRefs.current[index] = el)}
          position={basePositions[index]}
          rotation={rotations[index]}
        >
          <VideoCard
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            url={url}
            index={index}
          />
        </mesh>
      ))}

      {/* Orbit controls for user interaction - rotation only, no zoom */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export const VideoScene3D = () => {
  return (
    <div className="w-full h-[70vh] md:h-[75vh] bg-black relative z-0">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
