import { useEffect, useState } from "react";

/**
 * Returns true between 19:00 and 07:00 local time so the staff portal can
 * apply a subtle "night light" treatment after hours.
 */
const isNight = () => {
  const h = new Date().getHours();
  return h >= 19 || h < 7;
};

export const useNightMode = (): boolean => {
  const [night, setNight] = useState<boolean>(isNight);
  useEffect(() => {
    const tick = () => setNight(isNight());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return night;
};