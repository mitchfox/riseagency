import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

// Video card component that floats in 3D space
function VideoCard({ position, rotation, url, index }: { position: [number, number, number], rotation: [number, number, number], url: string, index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.1 : 1}
    >
      <planeGeometry args={[6, 3.375]} />
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
          width: '800px',
          height: '450px',
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

  // Arrange videos in a circular formation with closer spacing
  const positions: [number, number, number][] = [
    [0, 0, 0],      // Center
    [3, 0.5, -2],   // Right upper
    [-3, -0.5, -2], // Left lower
    [2, -1, 1],     // Right lower front
    [-2, 1, 1],     // Left upper front
    [0, -1.5, -3],  // Bottom back
  ];

  const rotations: [number, number, number][] = [
    [0, 0, 0],
    [0.2, -0.5, 0],
    [-0.2, 0.5, 0],
    [0.3, -0.3, 0.1],
    [-0.3, 0.3, -0.1],
    [0.4, 0, 0],
  ];

  return (
    <>
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.5} />
      
      {/* Directional light for depth */}
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />
      
      {/* Spot light for dramatic effect */}
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={0.5} castShadow />

      {/* Video cards */}
      {videos.map((url, index) => (
        <VideoCard
          key={index}
          position={positions[index]}
          rotation={rotations[index]}
          url={url}
          index={index}
        />
      ))}

      {/* Orbit controls for user interaction */}
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export const VideoScene3D = () => {
  return (
    <div className="w-full h-[40vh] md:h-[45vh] bg-black">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
