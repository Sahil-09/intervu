import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class InterviewApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Sets up a new interview session by uploading a candidate's resume PDF
   */
  setupSession(
    file: File,
    setupData: {
      email: string;
      firstName?: string;
      lastName?: string;
      targetRole: string;
      experienceLevel: string;
      interviewType: string;
    },
  ): Observable<{ session: any; firstQuestion: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('email', setupData.email);
    if (setupData.firstName) formData.append('firstName', setupData.firstName);
    if (setupData.lastName) formData.append('lastName', setupData.lastName);
    formData.append('targetRole', setupData.targetRole);
    formData.append('experienceLevel', setupData.experienceLevel);
    formData.append('interviewType', setupData.interviewType);

    return this.http.post<{ session: any; firstQuestion: string }>(
      `${this.baseUrl}/setup`,
      formData,
    );
  }

  /**
   * Submits a candidate's verbal or typed answer, getting feedback and the next question
   */
  submitTurn(
    sessionId: string,
    answer: string,
  ): Observable<{
    feedback: { score: number; critique: string; suggestedAnswer: string };
    nextQuestion?: string;
    isCompleted: boolean;
  }> {
    return this.http.post<{
      feedback: { score: number; critique: string; suggestedAnswer: string };
      nextQuestion?: string;
      isCompleted: boolean;
    }>(`${this.baseUrl}/${sessionId}/turn`, { answer });
  }

  /**
   * Retrieves a completed or active interview session (for transcripts and final evaluations)
   */
  getSession(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${sessionId}`);
  }
}
