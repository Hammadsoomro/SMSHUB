/**
 * SMS Notification Audio Manager
 * Plays notification sounds for incoming SMS
 */

class NotificationAudioManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create Web Audio API context
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.isInitialized = true;
    } catch (error) {
      console.warn("Web Audio API not supported:", error);
    }
  }

  /**
   * Play a simple notification tone using Web Audio API
   * Generates a professional double-tone notification sound
   */
  async playNotificationTone() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext) {
      // Fallback: try to play system sound
      this.playFallbackSound();
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Create two oscillators for a nice notification tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // Set frequencies for a pleasant notification tone
      osc1.frequency.value = 800; // Hz
      osc2.frequency.value = 1000; // Hz
      osc1.type = "sine";
      osc2.type = "sine";

      // Volume envelope
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      // Connect nodes
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      // Play for 500ms
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (error) {
      console.error("Error playing notification tone:", error);
      this.playFallbackSound();
    }
  }

  /**
   * Fallback sound using HTML5 Audio
   * Creates a simple beep sound
   */
  private playFallbackSound() {
    try {
      // Use a data URL for a simple beep sound
      const audioUrl =
        "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==";
      const audio = new Audio(audioUrl);
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silently fail if audio can't play
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Play a longer notification chime with multiple tones
   */
  async playNotificationChime() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext) {
      this.playFallbackSound();
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const tones = [
        { freq: 523.25, time: 0 }, // C5
        { freq: 659.25, time: 0.15 }, // E5
        { freq: 783.99, time: 0.3 }, // G5
      ];

      for (const tone of tones) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = tone.freq;
        osc.type = "sine";

        gain.gain.setValueAtTime(0.25, now + tone.time);
        gain.gain.exponentialRampToValueAtTime(0.01, now + tone.time + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + tone.time);
        osc.stop(now + tone.time + 0.2);
      }
    } catch (error) {
      console.error("Error playing notification chime:", error);
    }
  }
}

export const notificationAudioManager = new NotificationAudioManager();
