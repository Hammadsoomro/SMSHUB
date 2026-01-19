import { useEffect, useRef } from "react";

export default function GoogleAdSense() {
  const adRef = useRef<HTMLDivElement>(null);
  const adAttemptedRef = useRef(false);

  useEffect(() => {
    // Only attempt once per mount
    if (adAttemptedRef.current) {
      return;
    }
    adAttemptedRef.current = true;

    // Check if adsbygoogle is available
    const checkAndPushAd = () => {
      if (
        typeof window !== "undefined" &&
        (window as any).adsbygoogle !== undefined
      ) {
        try {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push(
            {}
          );
          console.log("✓ Google AdSense ad loaded successfully");
        } catch (error) {
          console.warn("⚠ Google AdSense error (non-critical):", error);
          // Don't throw - ads are optional
        }
      } else {
        // Script not ready yet, retry after a delay
        setTimeout(checkAndPushAd, 500);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(checkAndPushAd, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="my-8 flex justify-center w-full">
      <div
        ref={adRef}
        className="w-full max-w-4xl"
        style={{
          minHeight: "280px",
          display: "flex",
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minHeight: "280px",
          }}
          data-ad-client="ca-pub-8199077937393778"
          data-ad-slot="6761041317"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  );
}
