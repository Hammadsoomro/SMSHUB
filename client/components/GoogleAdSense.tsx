import { useEffect, useRef, useState } from "react";

// Track which ad instances have been created
let adInstanceCount = 0;

// Different ad slots for different placements and positions
const AD_SLOTS = {
  landing_1: "6761041317",
  landing_2: "6761041318",
  landing_3: "6761041319",
  dashboard: "7861041317",
  conversations: "8861041317",
  messages: "9861041317",
  default: "6761041317",
};

interface GoogleAdSenseProps {
  placement?: keyof typeof AD_SLOTS;
}

export default function GoogleAdSense({
  placement = "default",
}: GoogleAdSenseProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [hasRendered, setHasRendered] = useState(false);
  const [instanceId] = useState(() => ++adInstanceCount);

  // Determine the actual slot to use
  let adSlot = AD_SLOTS[placement] || AD_SLOTS.default;

  // For landing page, rotate through different slots
  if (placement === "landing") {
    const slotKey = (`landing_${(instanceId % 3) + 1}` as keyof typeof AD_SLOTS);
    adSlot = AD_SLOTS[slotKey];
  }

  useEffect(() => {
    // Skip if already rendered
    if (hasRendered) {
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
            console.log(`✓ Ad loaded for slot: ${adSlot}`);
          } catch (error) {
            console.warn(
              `⚠ Google AdSense error for slot ${adSlot}:`,
              error
            );
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
  }, [adSlot, hasRendered]);

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
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  );
}
