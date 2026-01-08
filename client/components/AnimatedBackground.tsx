export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Static gradient background - removed animations for performance */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background" />
    </div>
  );
}
