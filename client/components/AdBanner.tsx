import { useEffect, useRef, useState } from "react";

interface AdBannerProps {
  width: number;
  height: number;
  slot?: string;
}

export default function AdBanner({
  width,
  height,
  slot = "ca-pub-8199077937393778",
}: AdBannerProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [loadAttempted, setLoadAttempted] = useState(false);

  useEffect(() => {
    // Don't block on ad loading - just try to render if available
    const timer = setTimeout(() => {
      if (window.adsbygoogle && !loadAttempted) {
        try {
          window.adsbygoogle.push({});
          setLoadAttempted(true);
        } catch (err) {
          // Silent fail - ads not critical for functionality
        }
      }
    }, 3000); // Lazy load after 3 seconds

    return () => clearTimeout(timer);
  }, [loadAttempted]);

  return (
    <div
      ref={adContainerRef}
      className="flex items-center justify-center bg-muted rounded-lg overflow-hidden"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        minHeight: `${height}px`,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: "inline-block",
          width: `${width}px`,
          height: `${height}px`,
        }}
        data-ad-client={slot}
        data-ad-slot={slot}
      />
    </div>
  );
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
