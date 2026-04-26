import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { TextureLoader } from "three";
import playerImg1 from "@/assets/intro3d/player.png";
import depthImg1 from "@/assets/intro3d/depth.png";
import roughnessImg1 from "@/assets/intro3d/roughness.png";
import alphaImg1 from "@/assets/intro3d/alpha.png";
import playerImg2 from "@/assets/intro3d/player2.png";
import depthImg2 from "@/assets/intro3d/depth2.png";
import roughnessImg2 from "@/assets/intro3d/roughness2.png";
import homePlayerImg from "@/assets/intro3d/home-base.png";
import homeRoughnessImg from "@/assets/intro3d/home-roughness.png";
import homeAlphaImg from "@/assets/intro3d/home-alpha.png";

/**
 * Stationary 3D "pop" of a player image. Modeled after the landing
 * page Player3DEffect: the plane stays locked to the centre of its
 * container and only the shader does the work — depth-driven
 * parallax samples the colour map at an offset that drifts gently
 * over time, so the figure appears to bend / breathe / catch light
 * on the spot rather than physically travelling across the screen.
 */
const SETS = {
  one:  { player: playerImg1,  depth: depthImg1,  rough: roughnessImg1,  alpha: alphaImg1     as string | null },
  two:  { player: playerImg2,  depth: depthImg2,  rough: roughnessImg2,  alpha: null          as string | null },
  home: { player: homePlayerImg, depth: homeRoughnessImg, rough: homeRoughnessImg, alpha: homeAlphaImg as string | null },
} as const;

type Player3DVariant = keyof typeof SETS;

const getSetUrls = (variant: Player3DVariant) => {
  const set = SETS[variant];
  return set.alpha
    ? [set.player, set.depth, set.rough, set.alpha]
    : [set.player, set.depth, set.rough];
};

export const preloadPlayer3DVariant = (variant: Player3DVariant) => {
  useLoader.preload(TextureLoader, getSetUrls(variant));
};

/* ============================================================
 * Shader: depth-driven parallax with subtle rim light.
 * - Plane never moves; only the UV sample point inside the shader
 *   shifts based on a slow oscillating "virtual cursor".
 * - Depth map drives per-pixel parallax strength so foreground
 *   features shift slightly more than background ones, creating the
 *   "bend on the spot" 3D feel.
 * - Optional alpha map cuts the silhouette out of the plane so the
 *   page background shows through.
 * ============================================================ */
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uColor;
  uniform sampler2D uDepth;
  uniform sampler2D uRough;
  uniform sampler2D uAlpha;
  uniform float uHasAlpha;
  uniform vec2  uTarget;       // virtual cursor in 0..1
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    // Sample depth (RGB or grayscale) and derive a 0..1 mask.
    float depth = dot(texture2D(uDepth, vUv).rgb, vec3(0.299, 0.587, 0.114));
    // Subtle parallax: stronger on near features, weaker on far ones.
    float parallaxStrength = mix(0.012, 0.026, depth);
    vec2 offset = (uTarget - vec2(0.5)) * parallaxStrength;
    vec2 sampleUV = vUv - offset;

    vec4 color = texture2D(uColor, sampleUV);
    float alpha = color.a;
    if (uHasAlpha > 0.5) {
      alpha *= texture2D(uAlpha, sampleUV).a;
    }
    if (alpha < 0.01) discard;

    // Roughness map adds soft micro-shading.
    float rough = dot(texture2D(uRough, sampleUV).rgb, vec3(0.299, 0.587, 0.114));
    float shade = mix(0.92, 1.06, rough);
    vec3 rgb = color.rgb * shade;

    // Gentle rim light driven by the virtual cursor — adds the
    // "catch-the-light" feel without moving the player.
    float rim = smoothstep(0.85, 1.0, max(vUv.x, 1.0 - vUv.x))
              * (0.18 + 0.12 * sin(uTime * 0.8));
    rgb += vec3(0.78, 0.66, 0.32) * rim * 0.25;

    gl_FragColor = vec4(rgb, alpha * uOpacity);
  }
`;

const PlayerMesh = ({ variant }: { variant: Player3DVariant }) => {
  const set = SETS[variant];
  const urls = getSetUrls(variant);
  const maps = useLoader(TextureLoader, urls);
  const [colorMap, depthMap, roughMap, alphaMap] = [maps[0], maps[1], maps[2], maps[3]];
  colorMap.colorSpace = THREE.SRGBColorSpace;
  if (alphaMap) alphaMap.colorSpace = THREE.NoColorSpace;

  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uColor:    { value: colorMap },
    uDepth:    { value: depthMap },
    uRough:    { value: roughMap },
    uAlpha:    { value: alphaMap ?? colorMap },
    uHasAlpha: { value: set.alpha ? 1.0 : 0.0 },
    uTarget:   { value: new THREE.Vector2(0.5, 0.5) },
    uTime:     { value: 0 },
    uOpacity:  { value: 1 },
  }), [colorMap, depthMap, roughMap, alphaMap, set.alpha]);

  // Plane is sized to the 9:16 source ratio (1080x1920). Position is
  // FIXED at the origin — no translation, ever. Rotation is also
  // locked. All apparent motion comes from the shader's UV sampling.
  const geometry = useMemo(() => new THREE.PlaneGeometry(1.8, 3.2, 1, 1), []);

  useFrame((state) => {
    if (!matRef.current) return;
    const t = state.clock.getElapsedTime();
    // Lissajous-style virtual cursor — keeps the parallax target
    // gliding through a small region around the centre so the
    // figure appears to bend / breathe.
    const cx = 0.5 + Math.sin(t * 0.45) * 0.18 + Math.sin(t * 0.21) * 0.05;
    const cy = 0.5 + Math.cos(t * 0.37) * 0.14 + Math.cos(t * 0.18) * 0.04;
    matRef.current.uniforms.uTarget.value.set(cx, cy);
    matRef.current.uniforms.uTime.value = t;
  });

  return (
    <mesh geometry={geometry} position={[0, 0, 0]}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};

export const Player3DPop = ({
  className = "",
  variant = "one",
}: {
  className?: string;
  variant?: Player3DVariant;
}) => (
  <div className={`pointer-events-none ${className}`}>
    <Canvas
      orthographic
      camera={{ position: [0, 0, 5], zoom: 220, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <PlayerMesh variant={variant} />
      </Suspense>
    </Canvas>
  </div>
);

export default Player3DPop;