import { useEffect, useRef } from "react";

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

  useEffect(() => {
    // Push adsbygoogle script to render ads
    if (window.adsbygoogle) {
      try {
        window.adsbygoogle.push({});
      } catch (err) {
        console.log("AdSense render error:", err);
      }
    }
  }, [width, height, slot]);

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
