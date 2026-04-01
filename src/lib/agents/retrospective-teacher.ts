/**
 * retrospective-teacher.ts
 * 
 * The Final Cognitive Layer.
 * Function: Audits the Analyst's results vs the Market's actual outcome.
 * Goal: Generate 'Institutional-Grade' Market Lessons for the Vault.
 */

import { runQuery, ExternalEventRecord } from '../db-service';
import { correlateEventWithMarket } from '../event-correlator';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

class RetrospectiveTeacher {
  private isProcessing = false;

  public async startCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    console.log('[AI Teacher] 🎓 Commencing Retrospect Review Cycle...');

    try {
      // 1. Find 'Significant' events from the last hour that haven't been 'graded' yet.
      // We look for events that were level 1 (Macro) or level 2 (High News).
      const events = await runQuery(`
        SELECT * FROM external_events 
        WHERE level <= 2 
        AND timestamp < ? 
        AND timestamp > ?
        ORDER BY timestamp DESC
      `, [Date.now() - 15 * 60 * 1000, Date.now() - 90 * 60 * 1000]); // 15m to 90m old

      if (!events || events.length === 0) {
        console.log('[AI Teacher] No mature events for grading.');
        return;
      }

      for (const event of events) {
        await this.teachLesson(event);
      }

    } catch (err) {
      console.error('[AI Teacher] Teaching cycle failed:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async teachLesson(event: ExternalEventRecord) {
    // 2. Correlate 'Effect'
    const context = await correlateEventWithMarket(event.event_id);
    if (!context || context.microstructure_events.length === 0) return;

    console.log(`[AI Teacher] 🕵️ Analyzing Causal Link: "${event.headline}"`);

    // 3. Prepare Prompt for Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      As a Lead Quant & Market Psychologist, analyze this market event.
      NEWS EVENT: "${event.headline}" (Source: ${event.source})
      MARKET REACTION: Detected ${context.microstructure_events.length} high-IQ anomalies (Whales/Liquidations) in a ±5m window.
      
      TASK:
      1. Determine if the Market Reaction was "Aggressive", "Delayed", or "Noise".
      2. Write a 1-sentence "Learning Lesson" for a predictive trading bot.
      3. Rate the Event Significance (1-10).
      
      JSON OUTPUT FORMAT ONLY:
      { "outcome": "string", "lesson": "string", "true_significance": number }
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const lessonJson = response.text().replace(/```json|```/g, "").trim();

      // 4. Update the Vault with the "Lesson Learned"
      await runQuery(`
        UPDATE external_events 
        SET metadata = ? 
        WHERE event_id = ?
      `, [JSON.stringify({ lesson: JSON.parse(lessonJson) }), event.event_id]);

      console.log(`[AI Teacher] ✅ Master Lesson Stored for: ${event.event_id}`);
    } catch (err) {
      console.warn('[AI Teacher] Gemini generation failed:', err);
    }
  }
}

export const retrospectiveTeacher = new RetrospectiveTeacher();
