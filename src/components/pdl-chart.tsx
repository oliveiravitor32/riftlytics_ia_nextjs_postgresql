/**
 * PdlChart Component
 * Line chart of daily PDL snapshots (needs at least 2 points)
 */

'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export type PdlHistoryPoint = { capturedAt: string; leaguePoints: number };

function formatChartLabel(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    month: 'short',
    day: 'numeric',
  });
}

export function PdlChart({
  data,
  height = 112,
}: {
  data: PdlHistoryPoint[];
  height?: number;
}): React.ReactElement {
  if (data.length < 2) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-muted-foreground"
      >
        Ainda não há registros de PDL suficientes (um por dia)
      </div>
    );
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      minWidth={0}
      minHeight={height}
    >
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="capturedAt"
          tickFormatter={formatChartLabel}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          minTickGap={18}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            // Floats above the card: the lighter popover surface
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            color: 'var(--foreground)',
          }}
          labelFormatter={(label) => formatChartLabel(String(label))}
          formatter={(value) => [`${value} PDL`, 'Pontos de liga']}
        />
        <Line
          type="monotone"
          dataKey="leaguePoints"
          stroke="var(--primary)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
          activeDot={{
            r: 5,
            fill: 'var(--background)',
            stroke: 'var(--primary)',
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
