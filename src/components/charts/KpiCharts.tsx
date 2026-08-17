"use client";
// ============================================================
//  GRAFICE KPI (Recharts) — bare pe departamente, trend 6 luni,
//  sparkline per card. Stil: dark navy, marcaje subțiri, etichete
//  de valoare direct pe bare (statusul nu e transmis doar prin culoare).
// ============================================================
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MUTED = "#8a94c4";
const GRID = "rgba(255,255,255,.06)";
const TURQ = "#19c8db";

const statusColor = (p: number) => (p >= 80 ? "#3fd9a0" : p >= 50 ? TURQ : "#ff5c7a");

const tooltipStyle = {
  background: "#0a1245",
  border: "1px solid rgba(25,200,219,.16)",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 600,
  color: "#fff",
} as const;

export interface DeptDatum {
  name: string;
  full: string;
  pct: number;
}

/** Realizare KPI pe departamente, luna selectată. */
export function DeptBars({ data }: { data: DeptDatum[] }) {
  if (!data.length) return <div className="empty">Fără date pentru luna selectată.</div>;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 22, right: 6, left: 6, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: MUTED, fontSize: 10.5, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis hide domain={[0, 100]} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,.04)" }}
          contentStyle={tooltipStyle}
          labelStyle={{ color: MUTED, fontWeight: 700 }}
          formatter={(v) => [v + "%", "realizare"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
        />
        <Bar dataKey="pct" barSize={26} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.full} fill={statusColor(d.pct)} />
          ))}
          <LabelList
            dataKey="pct"
            position="top"
            formatter={(v) => `${v}%`}
            fill="#ffffff"
            fontSize={11}
            fontWeight={700}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface TrendDatum {
  m: string;
  pct: number | null;
}

/** Trend realizare medie KPI — ultimele 6 luni. */
export function TrendLine({ data }: { data: TrendDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 14, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TURQ} stopOpacity={0.28} />
            <stop offset="100%" stopColor={TURQ} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="m"
          tick={{ fill: MUTED, fontSize: 10.5, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis hide domain={[0, 100]} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: MUTED, fontWeight: 700 }}
          formatter={(v) => [v + "%", "realizare medie"]}
        />
        <Area
          type="monotone"
          dataKey="pct"
          stroke={TURQ}
          strokeWidth={2}
          fill="url(#trendFill)"
          connectNulls={false}
          isAnimationActive={false}
          dot={{ r: 3, fill: "#050a30", stroke: TURQ, strokeWidth: 2 }}
          activeDot={{ r: 4, fill: TURQ }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface SparkDatum {
  m: string;
  v: number;
}

/** Sparkline discret — evoluția valorii unui KPI pe ultimele luni. */
export function Spark({ data }: { data: SparkDatum[] }) {
  if (!data.some((d) => d.v > 0)) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <ResponsiveContainer width="100%" height={34}>
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TURQ} stopOpacity={0.22} />
              <stop offset="100%" stopColor={TURQ} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={TURQ}
            strokeWidth={1.6}
            fill="url(#sparkFill)"
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
