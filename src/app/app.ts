import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceService } from './services/voice.service';
import { InterviewApiService } from './services/interview-api.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  // Navigation State
  currentScreen: 'setup' | 'interview' | 'report' = 'setup';
  baseUrl = environment.apiUrl;

  // Setup Form State
  email = '';
  firstName = '';
  lastName = '';
  targetRole = 'Senior Fullstack Engineer';
  experienceLevel = 'Senior';
  interviewType = 'Technical';
  selectedFile: File | null = null;
  dragOver = false;

  // Active Session State
  sessionId = '';
  session: any = null;
  currentQuestion = '';
  userInput = '';
  turnCount = 0;
  isAiSpeaking = false;
  isCompleted = false;

  // Active Transcription / Critiques
  turns: any[] = [];
  lastCritique: any = null;

  // UI Indicators
  isLoading = false;
  errorMessage = '';

  constructor(
    public voiceService: VoiceService,
    private apiService: InterviewApiService,
  ) {}

  ngOnInit() {
    // Clean up speaking turns on load
    this.voiceService.cancelSpeaking();
  }

  ngOnDestroy() {
    this.voiceService.cancelSpeaking();
    this.voiceService.stopListening();
  }

  // --- File Upload / Drag & Drop Handlers ---
  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Please select a valid PDF file.';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave() {
    this.dragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Only PDF resumes are supported.';
    }
  }

  // --- Flow Actions ---

  /**
   * Submits the resume setup to start the mock interview
   */
  startInterview() {
    if (!this.selectedFile || !this.email) {
      this.errorMessage = 'Please upload a PDF resume and provide your email.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.apiService
      .setupSession(this.selectedFile, {
        email: this.email,
        firstName: this.firstName,
        lastName: this.lastName,
        targetRole: this.targetRole,
        experienceLevel: this.experienceLevel,
        interviewType: this.interviewType,
      })
      .subscribe({
        next: (res) => {
          this.sessionId = res.session.id;
          this.session = res.session;
          this.currentQuestion = res.firstQuestion;
          this.turns = [{ speaker: 'AI', message: res.firstQuestion }];
          this.turnCount = 0;
          this.lastCritique = null;
          this.currentScreen = 'interview';
          this.isLoading = false;

          // AI speaks the first question
          this.speakAiQuestion(res.firstQuestion);
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'Failed to setup interview session. Please verify your Postgres database or AI service is connected.';
          this.isLoading = false;
        },
      });
  }

  /**
   * Submits the candidate's answer to get immediate critique & next question
   */
  submitAnswer() {
    if (!this.userInput || this.userInput.trim() === '') {
      return;
    }

    this.voiceService.stopListening();
    this.voiceService.cancelSpeaking();

    const answerToSubmit = this.userInput;
    this.userInput = '';
    this.isLoading = true;

    // Push local candidate turn instantly
    this.turns.push({ speaker: 'CANDIDATE', message: answerToSubmit });

    this.apiService.submitTurn(this.sessionId, answerToSubmit).subscribe({
      next: (res) => {
        this.lastCritique = res.feedback;
        // Attach feedback to the candidate's last turn
        const lastTurnIdx = this.turns.length - 1;
        if (this.turns[lastTurnIdx]) {
          this.turns[lastTurnIdx].feedback = res.feedback;
        }

        this.isLoading = false;

        if (res.isCompleted) {
          this.isCompleted = true;
          this.loadFinalReport();
        } else if (res.nextQuestion) {
          this.currentQuestion = res.nextQuestion;
          this.turns.push({ speaker: 'AI', message: res.nextQuestion });
          this.turnCount++;

          // AI speaks out the next question
          this.speakAiQuestion(res.nextQuestion);
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to submit answer turn.';
        this.isLoading = false;
      },
    });
  }

  /**
   * Loads the completed scorecard and redirects to the Report view
   */
  loadFinalReport() {
    this.isLoading = true;
    this.voiceService.cancelSpeaking();
    this.voiceService.stopListening();

    this.apiService.getSession(this.sessionId).subscribe({
      next: (res) => {
        this.session = res;
        this.turns = res.turns;
        this.currentScreen = 'report';
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'Failed to load the final report card.';
        this.isLoading = false;
      },
    });
  }

  /**
   * AI speaking turn logic (enforces visual wave states)
   */
  speakAiQuestion(question: string) {
    this.isAiSpeaking = true;
    this.voiceService.speak(question, () => {
      this.isAiSpeaking = false;
    });
  }

  /**
   * Microphone voice recording toggle (Speech-to-Text)
   */
  toggleMicrophone() {
    if (this.voiceService.isListening()) {
      this.voiceService.stopListening();
    } else {
      this.voiceService.cancelSpeaking();
      this.voiceService.startListening((text) => {
        this.userInput += (this.userInput ? ' ' : '') + text;
      });
    }
  }

  /**
   * Returns back to setup for another mock run
   */
  resetSession() {
    this.voiceService.cancelSpeaking();
    this.voiceService.stopListening();
    this.sessionId = '';
    this.session = null;
    this.turns = [];
    this.currentQuestion = '';
    this.userInput = '';
    this.lastCritique = null;
    this.isCompleted = false;
    this.selectedFile = null;
    this.currentScreen = 'setup';
  }
}
