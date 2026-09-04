'use client';

import { useState, useEffect } from 'react';
import type { SensorReading } from '@/lib/glof-simulation';
import type { DecisionResult } from '@/lib/glof-decision';
import type { AlertResult } from '@/lib/glof-alert';
import type { EvacuationPriorityItem } from '@/lib/glof-routing';

export default function Home() {
  const [data, setData] = useState<SensorReading[]>([]);
  const [decision, setDecision] = useState<DecisionResult | null>(null);
  const [routing, setRouting] = useState<EvacuationPriorityItem[]>([]);
  const [alertResult, setAlertResult] = useState<AlertResult | null>(null);
  const [alertLoading, setAlertLoading] = useState<boolean>(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<string>('flood_imminent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const scenarioQuery = scenario === 'flood_imminent' ? '' : `?scenario=${scenario}`;

    Promise.all([
      fetch(`/api/sensor-data${scenario === 'normal' ? '?spikeMinute=0' : ''}`).then((r) => r.json()),
      fetch(`/api/decision${scenarioQuery}`).then((r) => r.json()),
      fetch('/api/routing').then((r) => r.json()),
    ])
      .then(([readings, dec, routeItems]: [SensorReading[], DecisionResult, EvacuationPriorityItem[]]) => {
        setData(readings);
        setDecision(dec);
        setRouting(routeItems);
        setAlertResult(null); // reset alert for new scenario
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [scenario]);

  const handleGenerateAlert = async () => {
    if (!decision) return;
    setAlertLoading(true);
    setAlertError(null);
    try {
      const res = await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.details || json.error || 'Failed to generate alert');
      }
      setAlertResult(json);
    } catch (err: unknown) {
      setAlertError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAlertLoading(false);
    }
  };

  const spikePoint = data.reduce<SensorReading | null>(
    (max, curr) => (!max || curr.seismic_reading > max.seismic_reading ? curr : max),
    null
  );

  const failurePoint = data.find((d) => d.minute > 80 && d.water_level === null);

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case 'FLOOD_IMMINENT':
        return { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#fca5a5' };
      case 'WATCH':
        return { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308', text: '#fde047' };
      case 'NORMAL':
        return { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#86efac' };
      default:
        return { bg: '#1e293b', border: '#475569', text: '#94a3b8' };
    }
  };

  const badgeColors = getStatusBadgeColor(decision?.status);

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #1e293b', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#38bdf8' }}>
          GLOF Early Warning & Evacuation System
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '1.05rem', lineHeight: '1.6' }}>
          Himalayan Glacial Lake Outburst Flood (GLOF) monitoring, rule-based decision logic,
          Featherless AI SMS alerts, and valley evacuation routing priority rankings.
        </p>
      </header>

      {/* Decision Status Banner */}
      <section style={{
        backgroundColor: badgeColors.bg,
        border: `2px solid ${badgeColors.border}`,
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              Decision Engine Status
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: badgeColors.text, marginTop: '4px' }}>
              {decision ? decision.status : 'Evaluating...'}
            </div>
          </div>
          {decision?.spike_minute !== null && decision?.spike_minute !== undefined && (
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `1px solid ${badgeColors.border}`,
              fontSize: '0.95rem'
            }}>
              Spike Detected: <strong>Minute {decision.spike_minute}</strong>
            </div>
          )}
        </div>

        <p style={{ marginTop: '16px', marginBottom: 0, color: '#e2e8f0', lineHeight: '1.6', fontSize: '1.05rem' }}>
          {decision ? decision.reason : 'Loading telemetry and evaluating logic...'}
        </p>

        {/* Scenario Switcher for Verification */}
        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Test Decision Scenarios:</span>
          <button
            onClick={() => setScenario('flood_imminent')}
            style={{
              background: scenario === 'flood_imminent' ? '#ef4444' : '#1e293b',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            FLOOD_IMMINENT (Default)
          </button>
          <button
            onClick={() => setScenario('watch')}
            style={{
              background: scenario === 'watch' ? '#eab308' : '#1e293b',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            WATCH (Spike, No Washout)
          </button>
          <button
            onClick={() => setScenario('normal')}
            style={{
              background: scenario === 'normal' ? '#22c55e' : '#1e293b',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            NORMAL (No Spike)
          </button>
        </div>
      </section>

      {/* AI Emergency Broadcast Alert Card */}
      <section style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#38bdf8', margin: 0 }}>
              AI Broadcast Alert Generator
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Featherless AI (Qwen/Qwen2.5-7B-Instruct) generates concise, urgent SMS/radio alerts based on decision state.
            </p>
          </div>
          <button
            onClick={handleGenerateAlert}
            disabled={alertLoading || loading}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '6px',
              cursor: alertLoading ? 'wait' : 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {alertLoading ? 'Generating Alert...' : 'Generate SMS Alert with AI'}
          </button>
        </div>

        {alertError && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', color: '#fca5a5', fontSize: '0.9rem' }}>
            <strong>Alert Error:</strong> {alertError}
          </div>
        )}

        {alertResult && (
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 600 }}>
                DISPATCHED SMS PAYLOAD ({alertResult.alert_text.length} chars):
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Model: {alertResult.model_used}
              </span>
            </div>
            <div style={{
              fontSize: '1.1rem',
              color: '#f8fafc',
              fontFamily: 'monospace',
              backgroundColor: '#0b1120',
              padding: '14px',
              borderRadius: '6px',
              borderLeft: '4px solid #38bdf8',
              lineHeight: '1.5'
            }}>
              &ldquo;{alertResult.alert_text}&rdquo;
            </div>
          </div>
        )}
      </section>

      {/* Evacuation Routing Section */}
      <section style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#e2e8f0', margin: 0 }}>
              Valley Evacuation Priority Routing
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Downstream river settlements ranked by flood wave arrival time and population vulnerability.
            </p>
          </div>
          <a
            href="/api/routing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#38bdf8',
              textDecoration: 'none',
              border: '1px solid #0284c7',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}
          >
            Open /api/routing JSON &rarr;
          </a>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', backgroundColor: '#1e293b' }}>
                <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Priority Rank</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Village Name</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Estimated Wave Arrival</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Population</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Priority Score</th>
              </tr>
            </thead>
            <tbody>
              {routing.map((item) => {
                const isTopPriority = item.priority_rank === 1;
                return (
                  <tr
                    key={item.village_name}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      backgroundColor: isTopPriority ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        backgroundColor: isTopPriority ? '#ef4444' : item.priority_rank === 2 ? '#ea580c' : '#334155',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        #{item.priority_rank}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: isTopPriority ? 'bold' : 'normal', color: '#f8fafc' }}>
                      {item.village_name}
                      {isTopPriority && <span style={{ color: '#f87171', fontSize: '0.75rem', marginLeft: '8px' }}>[Immediate Action]</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: item.estimated_arrival_minutes <= 20 ? '#f43f5e' : item.estimated_arrival_minutes <= 60 ? '#fb923c' : '#38bdf8' }}>
                      <strong>{item.estimated_arrival_minutes} mins</strong>
                      <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '6px' }}>post-breach</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>
                      {item.population.toLocaleString()} residents
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          flex: 1,
                          height: '8px',
                          backgroundColor: '#1e293b',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          maxWidth: '100px'
                        }}>
                          <div style={{
                            width: `${Math.min(100, item.priority_score)}%`,
                            height: '100%',
                            backgroundColor: isTopPriority ? '#ef4444' : item.priority_score > 50 ? '#ea580c' : '#0284c7'
                          }} />
                        </div>
                        <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{item.priority_score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* API Endpoints */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#e2e8f0', marginBottom: '16px' }}>
          API Endpoints
        </h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {/* /api/routing */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginRight: '12px'
              }}>
                GET
              </span>
              <code style={{ color: '#38bdf8', fontSize: '0.95rem' }}>/api/routing</code>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '12px' }}>
                Evacuation routing chain ranked by priority score
              </span>
            </div>
            <a
              href="/api/routing"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8',
                textDecoration: 'none',
                border: '1px solid #0284c7',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            >
              Open JSON &rarr;
            </a>
          </div>

          {/* /api/alert */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                marginRight: '6px'
              }}>
                POST
              </span>
              <span style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                marginRight: '12px'
              }}>
                GET
              </span>
              <code style={{ color: '#38bdf8', fontSize: '0.95rem' }}>/api/alert</code>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '12px' }}>
                Generates AI broadcast alert via Featherless AI
              </span>
            </div>
            <a
              href={`/api/alert${scenario === 'flood_imminent' ? '' : `?scenario=${scenario}`}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8',
                textDecoration: 'none',
                border: '1px solid #0284c7',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            >
              Open GET in New Tab &rarr;
            </a>
          </div>

          {/* /api/decision */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginRight: '12px'
              }}>
                GET
              </span>
              <code style={{ color: '#38bdf8', fontSize: '0.95rem' }}>/api/decision</code>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '12px' }}>
                Rule-based flood warning status evaluation
              </span>
            </div>
            <a
              href={`/api/decision${scenario === 'flood_imminent' ? '' : `?scenario=${scenario}`}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8',
                textDecoration: 'none',
                border: '1px solid #0284c7',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            >
              Open JSON &rarr;
            </a>
          </div>

          {/* /api/sensor-data */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginRight: '12px'
              }}>
                GET
              </span>
              <code style={{ color: '#38bdf8', fontSize: '0.95rem' }}>/api/sensor-data</code>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '12px' }}>
                180-minute raw seismic & water-level sensor telemetry
              </span>
            </div>
            <a
              href="/api/sensor-data"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8',
                textDecoration: 'none',
                border: '1px solid #0284c7',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            >
              Open JSON &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* Metrics Summary */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Timeline Span</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>
            {data.length > 0 ? `${data.length} mins (3 hrs)` : 'Loading...'}
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Peak Seismic Amplitude</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f43f5e', marginTop: '4px' }}>
            {spikePoint ? `${spikePoint.seismic_reading} amp` : 'Loading...'}
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Water Sensor Offline</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308', marginTop: '4px' }}>
            {failurePoint ? `Minute ${failurePoint.minute}` : 'Active / Operational'}
          </div>
        </div>
      </section>

      {/* Sensor Data Preview Table */}
      <section>
        <h2 style={{ fontSize: '1.25rem', color: '#e2e8f0', marginBottom: '16px' }}>
          Timeline Key Windows Preview
        </h2>
        {loading && <p style={{ color: '#94a3b8' }}>Loading telemetry data...</p>}
        {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}
        {!loading && !error && (
          <div style={{
            overflowX: 'auto',
            border: '1px solid #334155',
            borderRadius: '8px',
            backgroundColor: '#0f172a'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', backgroundColor: '#1e293b' }}>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Minute</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Seismic Reading</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Water Level</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Event State</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .filter((d) => (d.minute >= 88 && d.minute <= 95) || d.minute === 1 || d.minute === 180)
                  .map((row) => {
                    const isSpike = row.minute === 90;
                    const isCutoff = row.minute === 93 && row.water_level === null;
                    return (
                      <tr
                        key={row.minute}
                        style={{
                          borderBottom: '1px solid #1e293b',
                          backgroundColor: isSpike ? 'rgba(244, 63, 94, 0.15)' : isCutoff ? 'rgba(234, 179, 8, 0.15)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '10px 16px', fontWeight: isSpike ? 'bold' : 'normal' }}>
                          Min {row.minute}
                        </td>
                        <td style={{
                          padding: '10px 16px',
                          color: row.seismic_reading > 5 ? '#f43f5e' : row.seismic_reading > 1 ? '#fb923c' : '#a7f3d0',
                          fontWeight: isSpike ? 'bold' : 'normal'
                        }}>
                          {row.seismic_reading}
                        </td>
                        <td style={{ padding: '10px 16px', color: row.water_level === null ? '#ef4444' : '#38bdf8' }}>
                          {row.water_level !== null ? `${row.water_level} m` : 'null (silent)'}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                          {isSpike && <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>⚠️ Primary Shock / Spike</span>}
                          {isCutoff && <span style={{ color: '#eab308', fontWeight: 'bold' }}>⚡ Sensor Loss (Flood Breach)</span>}
                          {row.water_level === null && !isCutoff && <span style={{ color: '#64748b' }}>Sensor offline</span>}
                          {row.water_level !== null && !isSpike && row.seismic_reading < 1 && <span style={{ color: '#64748b' }}>Normal telemetry</span>}
                          {row.minute === 88 || row.minute === 89 ? <span style={{ color: '#fb923c' }}>Foreshock tremor</span> : null}
                          {row.minute === 91 || row.minute === 92 ? <span style={{ color: '#38bdf8' }}>Displacement wave</span> : null}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
