import { useEffect, useRef } from "react";
import introSong from "@/assets/RISE_intro.mp3";

/**
 * Background audio for /representation. Plays the RISE intro track
 * first, then loops between the two Omotoye tracks. Volume is held
 * at a courteous ~30%. Uses a single <audio> element so the browser
 * autoplay policy only needs to be satisfied once (which it is, by
 * the user's navigation gesture into the page).
 */

const OMOTOYE_PRIMARY =
  "https://qwethimbtaamlhbajmal.supabase.co/storage/v1/object/public/marketing-gallery/portal-music/music-b94fd8f6-ad14-4ad0-ba0b-6cace592ee8e-1772772613810-Goal_After_Goal.mp3";
const OMOTOYE_NUMBER_NINE =
  "https://qwethimbtaamlhbajmal.supabase.co/storage/v1/object/public/marketing-gallery/portal-music/music-b94fd8f6-ad14-4ad0-ba0b-6cace592ee8e-1772772621286-Omotoye__9.mp3";

const PLAYLIST = [introSong, OMOTOYE_PRIMARY, OMOTOYE_NUMBER_NINE];

export const RepresentationAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const idx = useRef(0);

  useEffect(() => {
    const a = new Audio();
    a.volume = 0.32;
    a.preload = "auto";
    audioRef.current = a;

    const playCurrent = () => {
      a.src = PLAYLIST[idx.current];
      // Best-effort autoplay; navigation is a user gesture so most
      // browsers will allow it. If it fails we still cycle silently.
      a.play().catch(() => {});
    };

    const onEnded = () => {
      // After the intro (index 0), advance to Omotoye tracks and loop
      // between them.
      idx.current = idx.current + 1;
      if (idx.current >= PLAYLIST.length) idx.current = 1; // skip back to first Omotoye
      playCurrent();
    };

    a.addEventListener("ended", onEnded);
    playCurrent();

    return () => {
      a.removeEventListener("ended", onEnded);
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
  }, []);

  return null;
};

export default RepresentationAudio;