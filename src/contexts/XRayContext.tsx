import { createContext, useContext, useState, ReactNode } from "react";

interface XRayState {
  isActive: boolean;
  intensity: number; // 0-1 how much x-ray is visible
  position: { x: number; y: number };
}

interface XRayContextType {
  xrayState: XRayState;
  setXrayState: (state: XRayState) => void;
}

const XRayContext = createContext<XRayContextType | undefined>(undefined);

export const XRayProvider = ({ children }: { children: ReactNode }) => {
  const [xrayState, setXrayState] = useState<XRayState>({
    isActive: false,
    intensity: 0,
    position: { x: 0.5, y: 0.5 }
  });

  return (
    <XRayContext.Provider value={{ xrayState, setXrayState }}>
      {children}
    </XRayContext.Provider>
  );
};

export const useXRay = () => {
  const context = useContext(XRayContext);
  if (!context) {
    return {
      xrayState: { isActive: false, intensity: 0, position: { x: 0.5, y: 0.5 } },
      setXrayState: () => {}
    };
  }
  return context;
};
