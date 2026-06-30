import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private recognition: any;
  private isListeningActive = false;

  constructor() {
    this.initSpeechRecognition();
  }

  /**
   * Initializes SpeechRecognition API with standard browser compatibility fallbacks
   */
  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    } else {
      console.warn('Web Speech Recognition API is not supported in this browser.');
    }
  }

  /**
   * Speaks out loud the given text using SpeechSynthesis (TTS)
   */
  speak(text: string, onEnd?: () => void): void {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speaking turns
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0; // Normal rate
      utterance.pitch = 1.0;

      if (onEnd) {
        utterance.onend = () => {
          onEnd();
        };
      }

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech Synthesis API is not supported in this browser.');
      if (onEnd) onEnd();
    }
  }

  /**
   * Cancels any active speech synthesis output
   */
  cancelSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Starts capturing microphone input and feeds transcripts back via callback (STT)
   */
  startListening(onResult: (text: string) => void, onEnd?: () => void): void {
    if (!this.recognition) {
      console.warn('Speech recognition is not available.');
      return;
    }

    if (this.isListeningActive) {
      return;
    }

    this.isListeningActive = true;

    this.recognition.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript;
      onResult(transcript);
    };

    this.recognition.onend = () => {
      this.isListeningActive = false;
      if (onEnd) onEnd();
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.stopListening();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }

  /**
   * Stops capturing microphone input
   */
  stopListening(): void {
    if (this.recognition && this.isListeningActive) {
      this.recognition.stop();
      this.isListeningActive = false;
    }
  }

  /**
   * Returns whether SpeechRecognition is actively listening
   */
  isListening(): boolean {
    return this.isListeningActive;
  }

  /**
   * Checks browser compatibility
   */
  isSupported(): boolean {
    return !!this.recognition;
  }
}
