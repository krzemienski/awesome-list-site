import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { CHART_ACCENT, CHART_AXIS_TEXT, CHART_DASH, CHART_GRID, CHART_INK } from "@/lib/charts/palette";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface LinkHealthTrendPoint {
  date: string;
  healthy: number;
  broken: number;
  redirect: number;
  timeout: number;
}

// Recharts' default dot fill is a literal white; hollow dots on the card
// surface keep each point readable in every design system.
const DOT = { fill: "var(--surface)", strokeWidth: 2 };
const AXIS_TICK = { fill: CHART_AXIS_TEXT, fontSize: 12 };
const TOOLTIP_STYLE = {
  background: "var(--surface-2)",
  border: "var(--hairline-w, 1px) solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
};

// Tick text drops the year ("Aug 4, 2026, 08:18 AM" -> "Aug 4, 08:18 AM"); the
// tooltip keeps the full label. Ticks sit level when each slot can hold the
// widest one, otherwise they stand upright, where their boxes never overlap.
const shortTick = (value: string) => value.replace(/,? ?\b20\d{2}\b,?/, "");
const TICK_CHAR_PX = 7;
const PLOT_INSET_PX = 60;
// Two rows of legend entries fit above the plot at phone width.
const LEGEND_HEIGHT = 44;

interface LinkHealthTrendChartProps {
  data: LinkHealthTrendPoint[];
}

export default function LinkHealthTrendChart({ data }: LinkHealthTrendChartProps) {
  const holder = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const widest = Math.max(0, ...data.map((point) => shortTick(point.date).length)) * TICK_CHAR_PX;
  const level = (width - PLOT_INSET_PX) / Math.max(data.length, 1) >= widest + 12;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Link Health Trends
        </CardTitle>
        <CardDescription>
          Health status trends across the last {data.length} completed {data.length === 1 ? "check" : "checks"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={holder}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            {/* interval={0}: every check gets a label (the default interval dropped
                the first of six). */}
            <XAxis
              dataKey="date"
              stroke={CHART_GRID}
              tick={AXIS_TICK}
              tickFormatter={shortTick}
              interval={0}
              angle={level ? 0 : -90}
              textAnchor={level ? "middle" : "end"}
              height={level ? 36 : widest + 16}
              tickMargin={6}
            />
            <YAxis
              stroke={CHART_GRID}
              tick={AXIS_TICK}
              label={{ value: "Percentage (%)", angle: -90, position: "insideLeft", fill: CHART_AXIS_TEXT, fontSize: 12 }}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "var(--text-2)" }}
              itemStyle={{ color: "var(--text)" }}
              cursor={{ stroke: CHART_GRID }}
              formatter={(value) => (typeof value === "number" ? `${value.toFixed(1)}%` : value)}
            />
            <Legend verticalAlign="top" height={LEGEND_HEIGHT} wrapperStyle={{ color: "var(--text-2)", fontSize: 12 }} />
            {/* Ink ramp + one accent (docs/07-color.md): Broken is the series
                an admin acts on, so it alone takes the accent; the others
                step down the ink ramp and differ by dash pattern too.
                DS-OK: strokeWidth={2} recharts data-viz exception — CC-12's 1.5
                default scopes lucide iconography only. */}
            <Line
              type="monotone"
              dataKey="healthy"
              stroke={CHART_INK.primary}
              strokeDasharray={CHART_DASH.solid}
              name="Healthy"
              strokeWidth={2}
              dot={DOT}
            />
            <Line
              type="monotone"
              dataKey="broken"
              stroke={CHART_ACCENT}
              strokeDasharray={CHART_DASH.solid}
              name="Broken"
              strokeWidth={2}
              dot={DOT}
            />
            <Line
              type="monotone"
              dataKey="redirect"
              stroke={CHART_INK.secondary}
              strokeDasharray={CHART_DASH.dashed}
              name="Redirects"
              strokeWidth={2}
              dot={DOT}
            />
            <Line
              type="monotone"
              dataKey="timeout"
              stroke={CHART_INK.tertiary}
              strokeDasharray={CHART_DASH.dotted}
              name="Timeouts"
              strokeWidth={2}
              dot={DOT}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}