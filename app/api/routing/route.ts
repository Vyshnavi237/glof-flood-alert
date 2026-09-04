import { NextResponse } from 'next/server';
import { calculateEvacuationRouting } from '@/lib/glof-routing';

/**
 * GET /api/routing
 *
 * Models a chain of downstream valley settlements affected by a GLOF outburst:
 * Langtang (source) -> Lama Hotel -> Syabrubesi -> Trishuli Bazar (furthest downstream).
 *
 * Computes:
 * - estimated_arrival_minutes based on distance from glacial lake and flood wave velocity (~30 km/h)
 * - priority_score combining rapid arrival urgency and population exposure
 * - priority_rank (1 = highest urgency)
 *
 * Returns an ordered JSON list (highest priority first):
 * [
 *   {
 *     "village_name": "Langtang",
 *     "priority_rank": 1,
 *     "estimated_arrival_minutes": 12,
 *     "population": 450,
 *     "priority_score": 60.3
 *   },
 *   ...
 * ]
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const speedParam = searchParams.get('speed');
    const urgencyWeightParam = searchParams.get('urgencyWeight');
    const popWeightParam = searchParams.get('popWeight');

    const routingList = calculateEvacuationRouting(undefined, {
      floodWaveSpeedKmh: speedParam ? parseFloat(speedParam) : 30.0,
      urgencyWeight: urgencyWeightParam ? parseFloat(urgencyWeightParam) : 0.6,
      populationWeight: popWeightParam ? parseFloat(popWeightParam) : 0.4,
    });

    // Ensure the output matches the exact requested fields:
    // village_name, priority_rank, estimated_arrival_minutes, population, priority_score
    const result = routingList.map((v) => ({
      village_name: v.village_name,
      priority_rank: v.priority_rank,
      estimated_arrival_minutes: v.estimated_arrival_minutes,
      population: v.population,
      priority_score: v.priority_score,
    }));

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: 'Routing Calculation Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
