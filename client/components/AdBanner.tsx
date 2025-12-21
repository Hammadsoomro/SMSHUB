import { useEffect, useRef } from "react";

interface AdBannerProps {
  width: number;
  height: number;
}

export default function AdBanner({ width, height }: AdBannerProps) {
  const adContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Try to load Google AdSense if available
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    script.onload = () => {
      if (window.adsbygoogle) {
        try {
          window.adsbygoogle.push({});
        } catch (err) {
          console.log("AdSense error:", err);
        }
      }
    };

    if (!document.querySelector('script[src*="pagead2.googlesyndication"]')) {
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div
      ref={adContainerRef}
      className="flex items-center justify-center bg-muted rounded-lg overflow-hidden"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Placeholder for ads */}
      <div className="text-center text-muted-foreground text-xs p-4">
        <p>Advertisement Space</p>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
