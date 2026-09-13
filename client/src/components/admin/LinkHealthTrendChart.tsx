import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { CHART_PALETTE } from "@/lib/charts/palette";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface LinkHealthTrendPoint {
  date: string;
  healthy: number;
  broken: number;
  redirect: number;
  timeout: number;
}

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
          Health status trends across the last {data.length} {data.length === 1 ? "check" : "checks"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {/* MR-DS-07/08/09 — strokes sourced from centralized CHART_PALETTE
                (ok=[2], bad=[5], warn=[3], --accent-2=[1]).
                DS-OK: strokeWidth={2} recharts data-viz exception — CC-12's 1.5
                default scopes lucide iconography only. */}
            <Line
              type="monotone"
              dataKey="healthy"
              stroke={CHART_PALETTE[2]}
              name="Healthy"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="broken"
              stroke={CHART_PALETTE[5]}
              name="Broken"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="redirect"
              stroke={CHART_PALETTE[3]}
              name="Redirects"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="timeout"
              stroke={CHART_PALETTE[1]}
              name="Timeouts"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}