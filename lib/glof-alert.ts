import { DecisionResult } from './glof-decision';

export interface GenerateAlertOptions {
  model?: string;
  apiKey?: string;
}

export interface AlertResult {
  alert_text: string;
  status: string;
  spike_minute: number | null;
  model_used: string;
}

export const DEFAULT_FEATHERLESS_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
export const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions';

/**
 * Calls Featherless AI chat completions endpoint (OpenAI-compatible format)
 * to generate a short, urgent-but-calm SMS/broadcast emergency alert based on GLOF decision data.
 */
export async function generateFloodAlertMessage(
  decision: DecisionResult,
  options: GenerateAlertOptions = {}
): Promise<AlertResult> {
  const apiKey = options.apiKey || process.env.FEATHERLESS_API_KEY;

  if (!apiKey) {
    throw new Error('FEATHERLESS_API_KEY is not configured in the environment');
  }

  const model = options.model || DEFAULT_FEATHERLESS_MODEL;

  const systemPrompt =
    'You are an emergency response broadcast system for Himalayan glacial lake outburst flood (GLOF) early warnings. ' +
    'Your duty is to generate short, clear, urgent-but-calm emergency alerts for SMS and public broadcast. ' +
    'Keep the alert strictly under 160 characters (1-2 sentences). ' +
    'Include the alert level, brief hazard situation, and immediate action (e.g. evacuate immediately to higher ground for FLOOD_IMMINENT, stay vigilant and prepare for WATCH, or no action required for NORMAL). ' +
    'Do not use markdown formatting, conversational filler, or quotation marks.';

  const userPrompt =
    `Generate an emergency SMS/broadcast alert based on the following decision:\n` +
    `- Alert Status: ${decision.status}\n` +
    `- Detection Reason: ${decision.reason}\n` +
    `- Seismic Spike Minute: ${decision.spike_minute !== null ? `Minute ${decision.spike_minute}` : 'None'}\n\n` +
    `Output ONLY the final alert message.`;

  const response = await fetch(FEATHERLESS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    let errorDetails = response.statusText;
    try {
      const errorBody = await response.json();
      errorDetails = errorBody.error?.message || JSON.stringify(errorBody);
    } catch {
      // ignore json parse error
    }
    throw new Error(`Featherless API error (${response.status}): ${errorDetails}`);
  }

  const result = await response.json();
  const alertText = result.choices?.[0]?.message?.content?.trim();

  if (!alertText) {
    throw new Error('Featherless API returned an empty response');
  }

  // Strip enclosing quotes if model returned them
  const cleanedAlertText = alertText.replace(/^["']|["']$/g, '');

  return {
    alert_text: cleanedAlertText,
    status: decision.status,
    spike_minute: decision.spike_minute,
    model_used: model,
  };
}
