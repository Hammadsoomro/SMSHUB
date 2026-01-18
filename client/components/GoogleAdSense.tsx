import { useEffect } from "react";

export default function GoogleAdSense() {
  useEffect(() => {
    // Push the ad configuration to the Google AdSense array
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error("Error loading Google AdSense:", error);
    }
  }, []);

  return (
    <div className="my-4 flex justify-center">
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8199077937393778"
        crossOrigin="anonymous"
      ></script>
      <ins
        className="adsbygoogle"
        style={{
          display: "block",
        }}
        data-ad-format="fluid"
        data-ad-layout-key="-ef+6k-30-ac+ty"
        data-ad-client="ca-pub-8199077937393778"
        data-ad-slot="6761041317"
      ></ins>
    </div>
  );
}
