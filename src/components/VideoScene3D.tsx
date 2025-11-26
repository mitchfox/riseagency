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
      <planeGeometry args={[4, 2.25]} />
      <meshStandardMaterial 
        color={hovered ? "#e8c168" : "#ffffff"} 
        side={THREE.DoubleSide}
        emissive={hovered ? "#e8c168" : "#000000"}
        emissiveIntensity={hovered ? 0.3 : 0}
      />
      <Html
        transform
        distanceFactor={1.5}
        position={[0, 0, 0.01]}
        style={{
          width: '400px',
          height: '225px',
          pointerEvents: 'none',
        }}
      >
        <div className="w-full h-full rounded-lg overflow-hidden border-2 border-primary/40">
          <iframe
            src={url}
            className="w-full h-full scale-110"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`Video ${index + 1}`}
            style={{ pointerEvents: 'none' }}
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

  // Arrange videos in a circular formation
  const positions: [number, number, number][] = [
    [0, 0, 0],      // Center
    [5, 1, -3],     // Right upper
    [-5, -1, -3],   // Left lower
    [3, -2, 2],     // Right lower front
    [-3, 2, 2],     // Left upper front
    [0, -3, -5],    // Bottom back
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
    <div className="w-full h-[80vh] md:h-[90vh] bg-black">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
};
