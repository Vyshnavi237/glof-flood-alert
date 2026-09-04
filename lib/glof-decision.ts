import { SensorReading } from './glof-simulation';

export type DecisionStatus = 'NORMAL' | 'WATCH' | 'FLOOD_IMMINENT';

export interface DecisionResult {
  status: DecisionStatus;
  reason: string;
  spike_minute: number | null;
}

export interface DecisionOptions {
  /**
   * Seismic amplitude threshold to qualify as a spike.
   * Default: 5.0 (ambient noise is ~0.1 - 0.3, spike reaches ~8.0+)
   */
  seismicThreshold?: number;

  /**
   * Time window in minutes after the seismic spike to monitor for water sensor silence (null).
   * Default: 5 minutes (user specifies "within a few minutes after that spike", e.g. 2-3 mins).
   */
  silenceWindowMinutes?: number;
}

export const DEFAULT_SEISMIC_THRESHOLD = 5.0;
export const DEFAULT_SILENCE_WINDOW_MINUTES = 5;

/**
 * Evaluates a GLOF sensor timeline using rule-based decision logic:
 *
 * 1. NORMAL: No seismic spike above threshold detected.
 * 2. WATCH: Seismic spike detected, but water sensor continues reporting normally.
 * 3. FLOOD_IMMINENT: Seismic spike detected AND water-level sensor goes silent (null)
 *    shortly after (within the silence window).
 */
export function evaluateFloodDecision(
  timeline: SensorReading[],
  options: DecisionOptions = {}
): DecisionResult {
  const {
    seismicThreshold = DEFAULT_SEISMIC_THRESHOLD,
    silenceWindowMinutes = DEFAULT_SILENCE_WINDOW_MINUTES,
  } = options;

  // 1. Check if a seismic spike above threshold occurs
  // Find the onset/peak minute where seismic reading crosses the threshold
  const spikeReading = timeline.find((r) => r.seismic_reading >= seismicThreshold);

  if (!spikeReading) {
    return {
      status: 'NORMAL',
      reason: `No seismic activity above threshold (${seismicThreshold}) detected. Ambient seismic noise and lake levels are within normal parameters.`,
      spike_minute: null,
    };
  }

  const spikeMinute = spikeReading.minute;

  // 2. Check whether water_level sensor goes silent (null) within a few minutes after the spike
  const postSpikeWindow = timeline.filter(
    (r) => r.minute >= spikeMinute && r.minute <= spikeMinute + silenceWindowMinutes
  );

  const silentSensorReading = postSpikeWindow.find((r) => r.water_level === null);

  if (silentSensorReading) {
    const delay = silentSensorReading.minute - spikeMinute;
    return {
      status: 'FLOOD_IMMINENT',
      reason: `High risk: Severe seismic spike detected at minute ${spikeMinute} (amplitude: ${spikeReading.seismic_reading}), followed by water-level sensor failure (null reading) ${delay} minute(s) later at minute ${silentSensorReading.minute}. Indicates catastrophic moraine breach and glacial outburst flood wave.`,
      spike_minute: spikeMinute,
    };
  }

  // 3. Spike detected, but water sensor is still reporting normally
  return {
    status: 'WATCH',
    reason: `Elevated alert: Seismic tremor spike detected at minute ${spikeMinute} (amplitude: ${spikeReading.seismic_reading}), but lake water-level sensors remain operational and reporting valid telemetry. Monitoring for potential dam destabilization.`,
    spike_minute: spikeMinute,
  };
}
