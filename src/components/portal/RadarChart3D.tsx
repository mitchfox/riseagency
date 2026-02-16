import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

interface MetricData {
  label: string;
  value: number; // 0-100 percentile
}

interface RadarChart3DProps {
  metrics: MetricData[];
  playerName: string;
}

const RadarMesh = ({ metrics }: { metrics: MetricData[] }) => {
  const meshRef = useRef<THREE.Group>(null);
  const n = metrics.length;

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  const { outerPoints, valuePoints, labelPositions } = useMemo(() => {
    const radius = 2.5;
    const outerPts: THREE.Vector3[] = [];
    const valuePts: THREE.Vector3[] = [];
    const labelPos: { position: THREE.Vector3; label: string }[] = [];

    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      outerPts.push(new THREE.Vector3(x, 0, z));

      const pct = metrics[i].value / 100;
      const vx = Math.cos(angle) * radius * pct;
      const vz = Math.sin(angle) * radius * pct;
      // Lift value points slightly for 3D effect
      const vy = pct * 0.4;
      valuePts.push(new THREE.Vector3(vx, vy, vz));

      const lx = Math.cos(angle) * (radius + 0.5);
      const lz = Math.sin(angle) * (radius + 0.5);
      labelPos.push({ position: new THREE.Vector3(lx, 0, lz), label: metrics[i].label });
    }

    return { outerPoints: outerPts, valuePoints: valuePts, labelPositions: labelPos };
  }, [metrics, n]);

  // Build shape geometry from value points
  const shape = useMemo(() => {
    if (valuePoints.length < 3) return null;
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];

    // Centre vertex
    vertices.push(0, 0.2, 0);

    valuePoints.forEach(p => {
      vertices.push(p.x, p.y, p.z);
    });

    for (let i = 1; i <= n; i++) {
      const next = i === n ? 1 : i + 1;
      indices.push(0, i, next);
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [valuePoints, n]);

  return (
    <group ref={meshRef}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <lineLoop key={scale}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={n}
              array={new Float32Array(
                outerPoints.flatMap(p => [p.x * scale, 0, p.z * scale])
              )}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#4d4d4d" transparent opacity={0.3} />
        </lineLoop>
      ))}

      {/* Axis lines */}
      {outerPoints.map((p, i) => (
        <line key={`axis-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([0, 0, 0, p.x, 0, p.z])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#404040" transparent opacity={0.4} />
        </line>
      ))}

      {/* Value shape */}
      {shape && (
        <mesh geometry={shape}>
          <meshStandardMaterial
            color="#c4a84d"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
            emissive="#9a7d2e"
            emissiveIntensity={0.2}
          />
        </mesh>
      )}

      {/* Value outline */}
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={valuePoints.length}
            array={new Float32Array(valuePoints.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#d4be76" linewidth={2} />
      </lineLoop>

      {/* Vertex dots */}
      {valuePoints.map((p, i) => (
        <mesh key={`dot-${i}`} position={p}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#ddd0a0" emissive="#c4a84d" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Labels */}
      {labelPositions.map((lp, i) => (
        <Text
          key={`label-${i}`}
          position={lp.position}
          fontSize={0.22}
          color="white"
          anchorX="center"
          anchorY="middle"
          rotation={[-(Math.PI / 2) * 0.01, 0, 0]}
        >
          {lp.label}
        </Text>
      ))}
    </group>
  );
};

export const RadarChart3D = ({ metrics, playerName }: RadarChart3DProps) => {
  if (metrics.length < 3) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        At least 3 metrics are needed for the radar view
      </div>
    );
  }

  return (
    <div className="w-full h-[350px] md:h-[400px] rounded-lg overflow-hidden bg-black/50">
      <Canvas camera={{ position: [0, 3.5, 4], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <RadarMesh metrics={metrics} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          autoRotate={false}
        />
      </Canvas>
      <div className="text-center -mt-6 relative z-10">
        <span className="text-xs text-muted-foreground bg-black/60 px-3 py-1 rounded-full">
          Drag to rotate
        </span>
      </div>
    </div>
  );
};
