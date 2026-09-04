'use client';

import { useState, useEffect } from 'react';
import type { SensorReading } from '@/lib/glof-simulation';

export default function Home() {
  const [data, setData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sensor-data')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((readings: SensorReading[]) => {
        setData(readings);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const spikePoint = data.reduce<SensorReading | null>(
    (max, curr) => (!max || curr.seismic_reading > max.seismic_reading ? curr : max),
    null
  );

  const failurePoint = data.find((d) => d.minute > 80 && d.water_level === null);

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #1e293b', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', margin: '0 0 8px 0', color: '#38bdf8' }}>
          GLOF Early Warning Sensor Telemetry
        </h1>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '1.05rem', lineHeight: '1.6' }}>
          Glacial Lake Outburst Flood (GLOF) simulation monitor. Tracking seismic amplitude tremors and
          lake water-level gauge telemetry over a 180-minute window.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', color: '#e2e8f0', marginBottom: '16px' }}>
          API Endpoint
        </h2>
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '16px',
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
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              marginRight: '12px'
            }}>
              GET
            </span>
            <code style={{ color: '#38bdf8', fontSize: '1rem' }}>/api/sensor-data</code>
          </div>
          <a
            href="/api/sensor-data"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#38bdf8',
              textDecoration: 'none',
              border: '1px solid #0284c7',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Open JSON in New Tab &rarr;
          </a>
        </div>
      </section>

      {/* Metrics Summary */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Timeline Span</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>
            {data.length > 0 ? `${data.length} minutes (3 hrs)` : 'Loading...'}
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Seismic Spike Peak</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f43f5e', marginTop: '4px' }}>
            {spikePoint ? `${spikePoint.seismic_reading} amp (Min ${spikePoint.minute})` : 'Loading...'}
          </div>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Water Sensor Cutoff</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308', marginTop: '4px' }}>
            {failurePoint ? `Min ${failurePoint.minute} (null)` : 'Loading...'}
          </div>
        </div>
      </section>

      {/* Sensor Data Preview Table */}
      <section>
        <h2 style={{ fontSize: '1.25rem', color: '#e2e8f0', marginBottom: '16px' }}>
          Key Timeline Events Preview (around Minute 90)
        </h2>
        {loading && <p style={{ color: '#94a3b8' }}>Loading simulation data...</p>}
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
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Water Level (m)</th>
                  <th style={{ padding: '12px 16px', color: '#94a3b8' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data
                  .filter((d) => (d.minute >= 87 && d.minute <= 96) || d.minute === 1 || d.minute === 180)
                  .map((row) => {
                    const isSpike = row.minute === 90;
                    const isCutoff = row.minute === 93;
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
                          {row.water_level !== null ? `${row.water_level} m` : 'null (offline)'}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                          {isSpike && <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>⚠️ Sharp Seismic Spike</span>}
                          {isCutoff && <span style={{ color: '#eab308', fontWeight: 'bold' }}>⚡ Sensor Silent (Washout)</span>}
                          {row.minute > 93 && <span style={{ color: '#64748b' }}>Outburst flood in progress</span>}
                          {row.minute < 88 && <span style={{ color: '#64748b' }}>Normal baseline telemetry</span>}
                          {row.minute === 88 || row.minute === 89 ? <span style={{ color: '#fb923c' }}>Foreshock tremor buildup</span> : null}
                          {row.minute === 91 || row.minute === 92 ? <span style={{ color: '#38bdf8' }}>Water surge / displacement</span> : null}
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
