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

interface LinkHealthTrendChartProps {
  data: LinkHealthTrendPoint[];
}

export default function LinkHealthTrendChart({ data }: LinkHealthTrendChartProps) {
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
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis dataKey="date" stroke={CHART_GRID} tick={AXIS_TICK} />
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
            />
            <Legend wrapperStyle={{ color: "var(--text-2)", fontSize: 12 }} />
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
      </CardContent>
    </Card>
  );
}