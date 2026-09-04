import { NextResponse } from 'next/server';
import { generateGLOFTimeline } from '@/lib/glof-simulation';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

const ALLOWED_METHODS = 'GET, OPTIONS';

/**
 * OPTIONS /api/sensor-data
 * Handles CORS preflight requests.
 */
export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request, ALLOWED_METHODS);
}

/**
 * GET /api/sensor-data
 *
 * Simulates a GLOF (Glacial Lake Outburst Flood) sensor timeline:
 * - 180 readings at 1-minute intervals over a 3-hour window
 * - Seismic sensor: Low baseline noise, sharp spike around minute 90
 * - Water-level sensor: Normal readings, turns silent (null) starting 2-3 minutes
 *   after the seismic spike (minute 93), simulating sensor failure before flood surge
 *
 * Returns JSON array of objects:
 * [
 *   { "minute": 1, "seismic_reading": 0.15, "water_level": 25.02 },
 *   ...
 *   { "minute": 90, "seismic_reading": 8.24, "water_level": 26.85 },
 *   ...
 *   { "minute": 93, "seismic_reading": 2.41, "water_level": null }
 * ]
 */
export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request, ALLOWED_METHODS);

  try {
    const { searchParams } = new URL(request.url);

    const totalMinutesParam = searchParams.get('totalMinutes');
    const spikeMinuteParam = searchParams.get('spikeMinute');
    const seedParam = searchParams.get('seed');

    const timeline = generateGLOFTimeline({
      totalMinutes: totalMinutesParam ? parseInt(totalMinutesParam, 10) : 180,
      spikeMinute: spikeMinuteParam ? parseInt(spikeMinuteParam, 10) : 90,
      seed: seedParam !== null ? (seedParam ? parseInt(seedParam, 10) : undefined) : 42,
    });

    return NextResponse.json(timeline, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate sensor timeline', details: (error as Error).message },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
