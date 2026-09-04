export interface VillageNode {
  name: string;
  distance_from_source: number; // in kilometers
  estimated_population: number;
}

export interface EvacuationPriorityItem {
  village_name: string;
  priority_rank: number;
  estimated_arrival_minutes: number;
  population: number;
  priority_score: number;
  distance_km?: number;
}

export interface RoutingOptions {
  /**
   * Average speed of the GLOF outburst flood wave down the steep valley (km/h).
   * Himalayan outburst floods typically propagate between 25 - 40 km/h.
   * Default: 30 km/h (0.5 km/minute).
   */
  floodWaveSpeedKmh?: number;

  /**
   * Relative weight assigned to time urgency (0 to 1).
   * Shorter arrival time = less evacuation window = higher urgency.
   * Default: 0.6
   */
  urgencyWeight?: number;

  /**
   * Relative weight assigned to population exposure (0 to 1).
   * Default: 0.4
   */
  populationWeight?: number;
}

/**
 * Realistic valley settlement chain along the Langtang River to Trishuli basin.
 * Langtang (closest to glacial moraine lake) -> Lama Hotel -> Syabrubesi -> Trishuli Bazar.
 */
export const DEFAULT_VILLAGE_CHAIN: VillageNode[] = [
  {
    name: 'Langtang',
    distance_from_source: 6.0,
    estimated_population: 450,
  },
  {
    name: 'Lama Hotel',
    distance_from_source: 18.0,
    estimated_population: 220,
  },
  {
    name: 'Syabrubesi',
    distance_from_source: 35.0,
    estimated_population: 1800,
  },
  {
    name: 'Trishuli Bazar',
    distance_from_source: 65.0,
    estimated_population: 8500,
  },
];

/**
 * Computes estimated flood wave arrival times and ranks downstream villages
 * by evacuation priority.
 *
 * Scoring Formula:
 * - Urgency Score (0 - 100): Inverse arrival time. Villages closest to the source have
 *   the smallest escape window, yielding maximum urgency.
 *   urgencyScore = max(0, 1 - (arrival_time / max_window)) * 100
 *
 * - Population Score (0 - 100): Proportional to population exposure.
 *   popScore = (population / max_population) * 100
 *
 * - Priority Score = round(urgencyWeight * urgencyScore + populationWeight * popScore)
 */
export function calculateEvacuationRouting(
  villages: VillageNode[] = DEFAULT_VILLAGE_CHAIN,
  options: RoutingOptions = {}
): EvacuationPriorityItem[] {
  const {
    floodWaveSpeedKmh = 30.0,
    urgencyWeight = 0.6,
    populationWeight = 0.4,
  } = options;

  if (!villages || villages.length === 0) {
    return [];
  }

  // 1. Calculate estimated flood arrival time for each village
  // arrival_minutes = (distance_km / speed_kmh) * 60 minutes
  const enriched = villages.map((village) => {
    const arrivalMinutes = Math.max(
      1,
      Math.round((village.distance_from_source / floodWaveSpeedKmh) * 60)
    );
    return {
      ...village,
      estimated_arrival_minutes: arrivalMinutes,
    };
  });

  // Reference maximums for normalization
  const maxArrivalMinutes = Math.max(...enriched.map((v) => v.estimated_arrival_minutes), 180);
  const maxPopulation = Math.max(...enriched.map((v) => v.estimated_population), 1);

  // 2. Compute priority score for each village
  const scored = enriched.map((v) => {
    // Shorter arrival time -> higher urgency score (up to 100)
    const urgencyScore = Math.max(0, 1 - v.estimated_arrival_minutes / maxArrivalMinutes) * 100;

    // Higher population -> higher vulnerability score (up to 100)
    const populationScore = (v.estimated_population / maxPopulation) * 100;

    const totalScore = urgencyWeight * urgencyScore + populationWeight * populationScore;

    return {
      village_name: v.name,
      estimated_arrival_minutes: v.estimated_arrival_minutes,
      population: v.estimated_population,
      priority_score: Math.round(totalScore * 10) / 10,
      distance_km: v.distance_from_source,
    };
  });

  // 3. Sort descending by priority_score (highest priority first)
  scored.sort((a, b) => b.priority_score - a.priority_score);

  // 4. Assign priority_rank (1 = highest priority)
  return scored.map((item, index) => ({
    village_name: item.village_name,
    priority_rank: index + 1,
    estimated_arrival_minutes: item.estimated_arrival_minutes,
    population: item.population,
    priority_score: item.priority_score,
    distance_km: item.distance_km,
  }));
}
