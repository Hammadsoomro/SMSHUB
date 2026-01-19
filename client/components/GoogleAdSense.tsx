import { useEffect, useRef, useState } from "react";

// Track which page we're on to prevent duplicate ads
const pageAdInstances = new Map<string, number>();

// Only the verified ad slot from your Google AdSense account
const VERIFIED_AD_SLOT = "6761041317";

interface GoogleAdSenseProps {
  placement?: string;
}

export default function GoogleAdSense({
  placement = "default",
}: GoogleAdSenseProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [hasRendered, setHasRendered] = useState(false);

  // Track instances per placement
  const instanceKey = `${placement}`;
  const instanceNumber = (pageAdInstances.get(instanceKey) || 0) + 1;

  // Only render the first instance per placement
  const shouldRender = instanceNumber === 1;

  useEffect(() => {
    // Update instance count
    pageAdInstances.set(instanceKey, instanceNumber);

    if (!shouldRender || hasRendered) {
      return;
    }

    setHasRendered(true);

    // Wait for adsbygoogle to be available
    const pushAd = () => {
      if (typeof window !== "undefined") {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle !== undefined && Array.isArray(adsbygoogle)) {
          try {
            adsbygoogle.push({});
            console.log(
              `✓ Google AdSense ad loaded (${placement})`
            );
          } catch (error) {
            console.warn(
              `⚠ Google AdSense error (${placement}):`,
              error
            );
            // Non-critical error - ads are optional
          }
        } else {
          // Retry if script not ready
          setTimeout(pushAd, 500);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(pushAd, 50);
    return () => clearTimeout(timeoutId);
  }, [placement, hasRendered, shouldRender, instanceNumber]);

  // Don't render if this isn't the first instance
  if (!shouldRender) {
    return null;
  }

  return (
    <div className="my-8 flex justify-center w-full">
      <div
        ref={adRef}
        className="w-full max-w-4xl"
        style={{
          minHeight: "250px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "transparent",
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minHeight: "250px",
          }}
          data-ad-client="ca-pub-8199077937393778"
          data-ad-slot={VERIFIED_AD_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  );
}
