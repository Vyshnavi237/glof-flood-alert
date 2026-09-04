import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'GLOF Flood Alert System',
  description: 'Glacial Lake Outburst Flood Early Warning Sensor Telemetry & Simulation',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        margin: 0,
        padding: 0,
        backgroundColor: '#0b1120',
        color: '#f1f5f9'
      }}>
        {children}
      </body>
    </html>
  );
}
