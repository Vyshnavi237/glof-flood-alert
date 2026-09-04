import { NextResponse } from 'next/server';
import { generateGLOFTimeline } from '@/lib/glof-simulation';
import { evaluateFloodDecision, DecisionResult, DecisionStatus } from '@/lib/glof-decision';
import { generateFloodAlertMessage, DEFAULT_FEATHERLESS_MODEL } from '@/lib/glof-alert';

/**
 * Validates whether an object matches the DecisionResult shape.
 */
function isValidDecision(obj: unknown): obj is DecisionResult {
  if (!obj || typeof obj !== 'object') return false;
  const d = obj as Record<string, unknown>;
  const validStatuses: DecisionStatus[] = ['NORMAL', 'WATCH', 'FLOOD_IMMINENT'];
  return (
    typeof d.status === 'string' &&
    validStatuses.includes(d.status as DecisionStatus) &&
    typeof d.reason === 'string' &&
    (d.spike_minute === null || typeof d.spike_minute === 'number')
  );
}

/**
 * Computes an internal decision object based on scenario.
 */
function getInternalDecision(scenario?: string | null): DecisionResult {
  if (scenario === 'normal') {
    const timeline = generateGLOFTimeline({ spikeMinute: null });
    return evaluateFloodDecision(timeline);
  }
  if (scenario === 'watch') {
    const timeline = generateGLOFTimeline({ spikeMinute: 90, sensorFails: false });
    return evaluateFloodDecision(timeline);
  }
  // Default: FLOOD_IMMINENT
  const timeline = generateGLOFTimeline({ spikeMinute: 90, sensorFails: true });
  return evaluateFloodDecision(timeline);
}

/**
 * POST /api/alert
 *
 * Accepts a decision object in JSON request body:
 * {
 *   "status": "FLOOD_IMMINENT",
 *   "reason": "...",
 *   "spike_minute": 90,
 *   "model": "Qwen/Qwen2.5-7B-Instruct" (optional)
 * }
 *
 * Calls Featherless AI chat completions to generate a short broadcast/SMS alert text.
 * Returns: { "alert_text": "...", "status": "...", "spike_minute": 90, "model_used": "..." }
 */
export async function POST(request: Request) {
  try {
    if (!process.env.FEATHERLESS_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration Error',
          message: 'FEATHERLESS_API_KEY is not defined in environment variables.',
        },
        { status: 500 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty, in which case we fall back to internal decision
    }

    let decision: DecisionResult;

    if (isValidDecision(body)) {
      decision = {
        status: body.status,
        reason: body.reason,
        spike_minute: body.spike_minute,
      };
    } else {
      // Fall back to generating the decision from the internal GLOF timeline
      decision = getInternalDecision(typeof body.scenario === 'string' ? body.scenario : null);
    }

    const model = typeof body.model === 'string' ? body.model : DEFAULT_FEATHERLESS_MODEL;
    const result = await generateFloodAlertMessage(decision, { model });

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isUpstream = message.includes('Featherless API error');
    return NextResponse.json(
      {
        error: isUpstream ? 'Upstream AI Provider Error' : 'Alert Generation Error',
        details: message,
      },
      { status: isUpstream ? 502 : 500 }
    );
  }
}

/**
 * GET /api/alert
 *
 * Consumes the GLOF decision status internally and generates the emergency alert.
 * Supports query parameters:
 * - scenario: 'flood_imminent' (default) | 'watch' | 'normal'
 * - model: open-source model name on Featherless (default: 'Qwen/Qwen2.5-7B-Instruct')
 */
export async function GET(request: Request) {
  try {
    if (!process.env.FEATHERLESS_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration Error',
          message: 'FEATHERLESS_API_KEY is not defined in environment variables.',
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const scenario = searchParams.get('scenario');
    const model = searchParams.get('model') || DEFAULT_FEATHERLESS_MODEL;

    const decision = getInternalDecision(scenario);
    const result = await generateFloodAlertMessage(decision, { model });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isUpstream = message.includes('Featherless API error');
    return NextResponse.json(
      {
        error: isUpstream ? 'Upstream AI Provider Error' : 'Alert Generation Error',
        details: message,
      },
      { status: isUpstream ? 502 : 500 }
    );
  }
}
