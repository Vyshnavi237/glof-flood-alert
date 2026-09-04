import { NextResponse } from 'next/server';
import { generateGLOFTimeline, SensorReading } from '@/lib/glof-simulation';
import {
  evaluateFloodDecision,
  DEFAULT_SEISMIC_THRESHOLD,
  DEFAULT_SILENCE_WINDOW_MINUTES,
} from '@/lib/glof-decision';

/**
 * GET /api/decision
 *
 * Implements rule-based flood decision logic that consumes sensor timeline data:
 * - Checks for a seismic spike above threshold (default: 5.0).
 * - If found, checks if water-level sensor goes silent (null) within a few minutes.
 * - Returns decision object with status, reason, spike_minute:
 *   - NORMAL: No seismic spike detected
 *   - WATCH: Seismic spike detected, but water sensor still reporting normally
 *   - FLOOD_IMMINENT: Seismic spike detected AND water sensor goes silent shortly after
 */
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);

    const thresholdParam = searchParams.get('threshold');
    const windowParam = searchParams.get('window');
    const scenarioParam = searchParams.get('scenario'); // 'normal' | 'watch' | 'flood_imminent'
    const shouldFetch = searchParams.get('fetch') === 'true';

    const seismicThreshold = thresholdParam ? parseFloat(thresholdParam) : DEFAULT_SEISMIC_THRESHOLD;
    const silenceWindowMinutes = windowParam ? parseInt(windowParam, 10) : DEFAULT_SILENCE_WINDOW_MINUTES;

    let timeline: SensorReading[];

    if (shouldFetch) {
      // Consume sensor timeline by fetching from the /api/sensor-data endpoint
      const response = await fetch(`${origin}/api/sensor-data`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch sensor data: ${response.statusText}`);
      }
      timeline = await response.json();
    } else if (scenarioParam === 'normal') {
      // Scenario with no seismic spike
      timeline = generateGLOFTimeline({ spikeMinute: null });
    } else if (scenarioParam === 'watch') {
      // Scenario with seismic spike, but water sensor stays healthy
      timeline = generateGLOFTimeline({ spikeMinute: 90, sensorFails: false });
    } else {
      // Default GLOF timeline (spike at minute 90, water sensor fails at minute 93)
      timeline = generateGLOFTimeline({ spikeMinute: 90, sensorFails: true });
    }

    const decision = evaluateFloodDecision(timeline, {
      seismicThreshold,
      silenceWindowMinutes,
    });

    return NextResponse.json(decision, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to evaluate flood decision',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
