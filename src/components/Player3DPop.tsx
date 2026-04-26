import { useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { TextureLoader } from "three";
import playerImg from "@/assets/intro3d/player.png";
import depthImg from "@/assets/intro3d/depth.png";
import roughnessImg from "@/assets/intro3d/roughness.png";
import alphaImg from "@/assets/intro3d/alpha.png";

/**
 * Subtle 3D pop of the player image. Plane is displaced by the depth
 * map so the figure feels embossed; the image acts as the colour map,
 * the roughness map drives lighting micro-detail and the alpha map
 * cuts the silhouette so the background black shows through.
 *
 * Auto-drifts up and to the right while on screen.
 */
const PlayerMesh = () => {
  const [colorMap, depthMap, roughMap, alphaMap] = useLoader(TextureLoader, [
    playerImg, depthImg, roughnessImg, alphaImg,
  ]);
  // Keep maps colour-correct on lit material.
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const ref = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    if (start.current === null) start.current = t;
    const e = t - start.current;
    // Slow drift up + right plus the tiniest yaw breath.
    ref.current.position.x = -0.4 + e * 0.06;
    ref.current.position.y = -0.2 + e * 0.05;
    ref.current.rotation.y = Math.sin(e * 0.4) * 0.06;
    ref.current.rotation.x = Math.sin(e * 0.3) * 0.03;
  });

  // Plane sized to the 1080x1920 source ratio (9:16).
  const geometry = useMemo(() => new THREE.PlaneGeometry(2.25, 4, 200, 360), []);

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial
        map={colorMap}
        displacementMap={depthMap}
        displacementScale={0.45}
        displacementBias={-0.05}
        roughnessMap={roughMap}
        roughness={0.85}
        alphaMap={alphaMap}
        transparent
        alphaTest={0.05}
        metalness={0.05}
      />
    </mesh>
  );
};

export const Player3DPop = ({ className = "" }: { className?: string }) => (
  <div className={`pointer-events-none ${className}`}>
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 38 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 4]} intensity={1.2} color={"#fff5d4"} />
      <directionalLight position={[-3, -1, 2]} intensity={0.4} color={"#c6a332"} />
      <PlayerMesh />
    </Canvas>
  </div>
);

export default Player3DPop;