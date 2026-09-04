export interface SensorReading {
  minute: number;
  seismic_reading: number;
  water_level: number | null;
}

export interface SimulationOptions {
  totalMinutes?: number;
  spikeMinute?: number | null;
  sensorFailureDelayMinutes?: number;
  sensorFails?: boolean;
  seed?: number;
}

/**
 * Simple deterministic pseudo-random number generator (Mulberry32)
 * Ensures reproducible readings if a seed is provided, or uses Math.random if omitted.
 */
function createRandomGenerator(seed?: number) {
  if (seed === undefined) {
    return () => Math.random();
  }
  let s = Math.floor(seed);
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a 3-hour (180-minute) GLOF (Glacial Lake Outburst Flood) sensor timeline.
 *
 * Timeline behavior:
 * - Seismic sensor: Low baseline noise (0.08 - 0.25) across most of the timeline,
 *   with a sharp high-amplitude spike around minute 90 (simulating ice/rock avalanche or moraine breach).
 * - Water-level sensor: Normal lake level readings (~25m) with wave oscillations up to minute 92,
 *   then goes silent (`null`) starting at minute 93 (2-3 minutes post-spike) simulating sensor destruction.
 */
export function generateGLOFTimeline(options: SimulationOptions = {}): SensorReading[] {
  const {
    totalMinutes = 180,
    spikeMinute = 90,
    sensorFailureDelayMinutes = 3,
    sensorFails = true,
    seed = 42,
  } = options;

  const rand = createRandomGenerator(seed);
  const timeline: SensorReading[] = [];
  const failureMinute =
    sensorFails && spikeMinute !== null && spikeMinute !== undefined && spikeMinute > 0
      ? spikeMinute + sensorFailureDelayMinutes
      : Infinity;

  const hasSpike = spikeMinute !== null && spikeMinute !== undefined && spikeMinute > 0;

  for (let minute = 1; minute <= totalMinutes; minute++) {
    // 1. Calculate Seismic Reading
    let seismic: number;

    if (hasSpike) {
      const distFromSpike = minute - (spikeMinute as number);

      if (distFromSpike === 0) {
        // Peak shock event
        seismic = 7.8 + rand() * 0.9;
      } else if (distFromSpike === -1) {
        // Immediate foreshock
        seismic = 1.4 + rand() * 0.4;
      } else if (distFromSpike === -2) {
        // Precursory acoustic noise
        seismic = 0.5 + rand() * 0.25;
      } else if (distFromSpike > 0 && distFromSpike <= 8) {
        // Coda / aftershock decay
        const decayFactor = Math.exp(-0.45 * distFromSpike);
        const aftershockNoise = rand() * 0.3;
        seismic = 0.25 + 6.0 * decayFactor + aftershockNoise;
      } else {
        // Normal background ambient seismic noise
        seismic = 0.08 + rand() * 0.16;
      }
    } else {
      // Normal background ambient seismic noise throughout
      seismic = 0.08 + rand() * 0.16;
    }

    // 2. Calculate Water Level
    let waterLevel: number | null = null;

    if (minute < failureMinute) {
      const baselineWaterLevel = 25.0; // meters

      if (!hasSpike || minute < (spikeMinute as number)) {
        // Normal lake surface with minor natural wave fluctuations (±0.15m)
        const waveFluctuation = Math.sin(minute * 0.3) * 0.08 + (rand() - 0.5) * 0.12;
        waterLevel = baselineWaterLevel + waveFluctuation;
      } else {
        // Minute spike to failure: Displacement wave surge
        const surgeProgress = minute - (spikeMinute as number);
        const surgeOffset = (surgeProgress + 1) * 1.8 + rand() * 0.4;
        waterLevel = baselineWaterLevel + surgeOffset;
      }

      waterLevel = Math.round(waterLevel * 100) / 100;
    } else {
      // Sensor destroyed / telemetry connection lost -> null
      waterLevel = null;
    }

    timeline.push({
      minute,
      seismic_reading: Math.round(seismic * 100) / 100,
      water_level: waterLevel,
    });
  }

  return timeline;
}
