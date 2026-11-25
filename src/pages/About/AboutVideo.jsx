// Purpose: Implement the AboutVideo pages module, keeping this responsibility separate for maintainability.
import { forwardRef, useEffect, useState } from "react";

// The looping clip that replaces the old About photo.
export const ASSET_ABOUT_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4";

// Shown until the first video frame is ready (or if the video fails to load).
export const ASSET_ABOUT_POSTER =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=75&fm=webp";

export const ASSET_ABOUT_FALLBACK = "/case-study/hero-office.webp";

export const AboutVideo = forwardRef(function AboutVideo(
  { showPoster = true, style, ...props },
  ref
) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  // Defer both the 3rd-party poster and video until the visitor begins scrolling/interacting
  // (AboutVideo starts at opacity 0 below the hero, so initial LCP/PageSpeed stays 100% clean).
  const [activated, setActivated] = useState(
    () => typeof window !== "undefined" && window.scrollY > 10
  );
  useEffect(() => {
    if (activated) return undefined;
    const go = () => setActivated(true);
    const EVENTS = ["scroll", "wheel", "touchstart", "keydown", "pointerdown"];
    EVENTS.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, go));
    };
  }, [activated]);

  return (
    <>
      {showPoster && activated && (
        <img
          src={ASSET_ABOUT_POSTER}
          alt=""
          aria-hidden="true"
          width={1200}
          height={800}
          loading="lazy"
          fetchPriority="low"
          decoding="async"
          onError={(e) => {
            if (!e.currentTarget.dataset.fb) {
              e.currentTarget.dataset.fb = "1";
              e.currentTarget.src = ASSET_ABOUT_FALLBACK;
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "translateZ(0)",
            ...style,
          }}
        />
      )}
      {!videoError && activated && (
        <video
          ref={ref}
          src={ASSET_ABOUT_VIDEO}
          poster={showPoster ? ASSET_ABOUT_POSTER : undefined}
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
          onPlaying={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoError(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            opacity: videoReady ? 1 : 0,
            transition: "opacity 0.4s ease",
            transform: "translateZ(0)",
            ...style,
          }}
          {...props}
        />
      )}
    </>
  );
});

export default AboutVideo;
