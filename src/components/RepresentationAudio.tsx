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
    // Many mobile browsers (notably iOS Safari) refuse to start
    // playback unless the <audio> element is created and called
    // synchronously inside a user gesture handler. We therefore
    // attempt an instant play, and ALSO arm a one-shot global
    // listener that resumes playback on the very first tap / click /
    // key press anywhere on the page. The listener self-removes once
    // audio is confirmed playing.
    a.setAttribute("playsinline", "true");
    (a as any).playsInline = true;
    audioRef.current = a;

    const playCurrent = () => {
      a.src = PLAYLIST[idx.current];
      a.play().catch(() => {
        // Autoplay blocked — wait for the next user gesture.
      });
    };

    const onEnded = () => {
      // After the intro (index 0), advance to Omotoye tracks and loop
      // between them.
      idx.current = idx.current + 1;
      if (idx.current >= PLAYLIST.length) idx.current = 1; // skip back to first Omotoye
      playCurrent();
    };

    const tryUnlock = () => {
      if (!a.paused) return;
      a.play()
        .then(() => {
          window.removeEventListener("pointerdown", tryUnlock, true);
          window.removeEventListener("touchstart", tryUnlock, true);
          window.removeEventListener("click", tryUnlock, true);
          window.removeEventListener("keydown", tryUnlock, true);
        })
        .catch(() => {});
    };
    window.addEventListener("pointerdown", tryUnlock, true);
    window.addEventListener("touchstart", tryUnlock, true);
    window.addEventListener("click", tryUnlock, true);
    window.addEventListener("keydown", tryUnlock, true);
    // Some flows (like the cinematic intro overlay) call
    // stopPropagation in their handlers. Listen for a synthetic
    // event the intro dispatches the moment it begins so we can
    // arm playback at the very start of the cinematic.
    const onIntroStart = () => tryUnlock();
    window.addEventListener("rep-intro-start", onIntroStart);

    a.addEventListener("ended", onEnded);
    playCurrent();

    return () => {
      a.removeEventListener("ended", onEnded);
      window.removeEventListener("pointerdown", tryUnlock, true);
      window.removeEventListener("touchstart", tryUnlock, true);
      window.removeEventListener("click", tryUnlock, true);
      window.removeEventListener("keydown", tryUnlock, true);
      window.removeEventListener("rep-intro-start", onIntroStart);
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
  }, []);

  return null;
};

export default RepresentationAudio;