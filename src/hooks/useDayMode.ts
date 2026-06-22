import { useEffect, useState } from "react";

/**
 * Returns true between 09:00 and 19:00 local time so the staff portal can
 * subtly brighten itself when bright daylight is hitting the screen.
 */
const isDay = () => {
  const h = new Date().getHours();
  return h >= 9 && h < 19;
};

export const useDayMode = (): boolean => {
  const [day, setDay] = useState<boolean>(isDay);
  useEffect(() => {
    const tick = () => setDay(isDay());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return day;
};
