import { useEffect, useRef, useState } from "react";

// Track which ad slots have been used on the current page
const usedAdSlots = new Set<string>();

// Different ad slots for different placements
const AD_SLOTS = {
  landing: "6761041317",
  dashboard: "7861041317",
  conversations: "8861041317",
  messages: "9861041317",
  default: "6761041317",
};

interface GoogleAdSenseProps {
  placement?: keyof typeof AD_SLOTS;
  allowMultiple?: boolean;
}

export default function GoogleAdSense({
  placement = "default",
  allowMultiple = false,
}: GoogleAdSenseProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [hasRendered, setHasRendered] = useState(false);
  const adSlot = AD_SLOTS[placement] || AD_SLOTS.default;

  useEffect(() => {
    // Skip if already rendered and multiple not allowed
    if (hasRendered && !allowMultiple) {
      return;
    }

    // Check if slot already used on page (unless allowMultiple is true)
    if (usedAdSlots.has(adSlot) && !allowMultiple) {
      console.log(`⚠ Ad slot ${adSlot} already used on this page, skipping`);
      return;
    }

    usedAdSlots.add(adSlot);
    setHasRendered(true);

    // Wait for adsbygoogle to be available
    const pushAd = () => {
      if (typeof window !== "undefined") {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle !== undefined) {
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
  }, [adSlot, allowMultiple, hasRendered]);

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
