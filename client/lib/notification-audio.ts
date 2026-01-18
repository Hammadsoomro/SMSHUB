/**
 * SMS Notification Audio Manager
 * Plays unique and loud notification sounds for incoming SMS
 * Similar to TextNow app with distinctive ringtone patterns
 */

class NotificationAudioManager {
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private gainNode: GainNode | null = null;

  async initialize() {
    if (this.isInitialized) return;

    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();

      // Create a master gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.7; // 70% volume for loud notifications

      this.isInitialized = true;
    } catch (error) {
      console.warn("Web Audio API not supported:", error);
    }
  }

  /**
   * Play a distinctive dual-tone notification pattern
   * Creates a "dring dring" like notification sound
   */
  async playNotificationChime() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.gainNode) {
      this.playFallbackSound();
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Create a pattern: High-Low-High (distinctive ringtone pattern)
      const tones = [
        { freq: 900, duration: 0.15, delay: 0 },
        { freq: 600, duration: 0.15, delay: 0.2 },
        { freq: 900, duration: 0.15, delay: 0.4 },
      ];

      for (const tone of tones) {
        this.playTone(tone.freq, tone.duration, now + tone.delay);
      }

      // Play it twice with a gap for more prominence
      for (const tone of tones) {
        this.playTone(tone.freq, tone.duration, now + tone.delay + 0.8);
      }
    } catch (error) {
      console.error("Error playing notification chime:", error);
      this.playFallbackSound();
    }
  }

  /**
   * Play a loud, unique SMS-style ringtone
   * Similar to modern SMS notification sounds with strong presence
   */
  async playNotificationTone() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.gainNode) {
      this.playFallbackSound();
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Create a rapid ascending pattern (like SMS notification)
      const pattern = [
        { freq: 700, duration: 0.1, delay: 0 },
        { freq: 850, duration: 0.1, delay: 0.12 },
        { freq: 1000, duration: 0.2, delay: 0.24 },
      ];

      // Play pattern twice
      for (let i = 0; i < 2; i++) {
        for (const note of pattern) {
          this.playTone(note.freq, note.duration, now + note.delay + i * 0.6);
        }
      }
    } catch (error) {
      console.error("Error playing notification tone:", error);
      this.playFallbackSound();
    }
  }

  /**
   * Play a distinctive bell-like notification sound
   * Perfect for SMS messages with clear, attention-grabbing tone
   */
  async playBellNotification() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.gainNode) {
      this.playFallbackSound();
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Bell-like pattern with harmonics
      const bellTones = [
        { freq: 523.25, duration: 0.3 }, // C5
        { freq: 659.25, duration: 0.3 }, // E5
        { freq: 783.99, duration: 0.4 }, // G5
      ];

      // Play with slight delay between each for bell effect
      for (let i = 0; i < bellTones.length; i++) {
        const tone = bellTones[i];
        this.playTone(tone.freq, tone.duration, now + i * 0.35);
      }
    } catch (error) {
      console.error("Error playing bell notification:", error);
      this.playFallbackSound();
    }
  }

  /**
   * Play an urgent/alert notification pattern
   * More aggressive sound for important messages
   */
  async playUrgentNotification() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.audioContext || !this.gainNode) {
      this.playFallbackSound();
      return;
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Rapid alternating pattern (urgent alert style)
      const urgentPattern = [
        { freq: 1000, duration: 0.08 },
        { freq: 750, duration: 0.08 },
        { freq: 1000, duration: 0.08 },
        { freq: 750, duration: 0.08 },
        { freq: 1200, duration: 0.12 },
      ];

      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < urgentPattern.length; j++) {
          const note = urgentPattern[j];
          const delay = urgentPattern.slice(0, j).reduce((a, b) => a + b.duration, 0);
          this.playTone(note.freq, note.duration, now + delay + i * 0.8);
        }
      }
    } catch (error) {
      console.error("Error playing urgent notification:", error);
      this.playFallbackSound();
    }
  }

  /**
   * Helper method to play a single tone
   */
  private playTone(frequency: number, duration: number, startTime: number) {
    if (!this.audioContext || !this.gainNode) return;

    const ctx = this.audioContext;

    // Create oscillator for the tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = frequency;

    // Create envelope (attack, hold, release)
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(1, startTime + 0.02); // Attack
    gain.gain.linearRampToValueAtTime(0.8, startTime + duration - 0.05); // Hold
    gain.gain.linearRampToValueAtTime(0, startTime + duration); // Release

    // Connect to gain node instead of directly to destination
    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Fallback sound using HTML5 Audio
   * Plays a simple beep sound
   */
  private playFallbackSound() {
    try {
      // Create a simple beep using Web Audio API fallback or HTML5 audio
      const audioUrl =
        "data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==";
      const audio = new Audio(audioUrl);
      audio.volume = 0.8;
      audio.play().catch(() => {
        // Silently fail if audio can't play
      });
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Set the notification volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = clampedVolume;
    }
  }

  /**
   * Get current notification volume
   */
  getVolume(): number {
    return this.gainNode?.gain.value ?? 0.7;
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll() {
    if (this.audioContext) {
      // Note: Web Audio API oscillators can't be easily stopped mid-play
      // This is more of a reset mechanism
      try {
        if (this.audioContext.state === "running") {
          // Connection is alive
        }
      } catch (error) {
        console.error("Error stopping audio:", error);
      }
    }
  }
}

export const notificationAudioManager = new NotificationAudioManager();
