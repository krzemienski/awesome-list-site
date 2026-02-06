"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { DollarSign, TrendingUp, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface CostStats {
  today: number
  week: number
  month: number
  byModel: {
    haiku: number
    sonnet: number
    opus: number
  }
  daily: Array<{
    date: string
    cost: number
  }>
  budget?: {
    limit: number
    period: "daily" | "weekly" | "monthly"
  }
}

const modelColors = {
  haiku: "oklch(0.75 0.3225 328.3634)", // Primary pink
  sonnet: "oklch(0.75 0.1771 252.5546)", // Accent blue
  opus: "oklch(0.85 0.1485 79.1207)" // Warning yellow
}

export function CostDashboard() {
  const { data: costs, isLoading } = useQuery<CostStats>({
    queryKey: ["research-costs"],
    queryFn: async () => {
      const response = await fetch("/api/research/costs")
      if (!response.ok) throw new Error("Failed to fetch costs")
      return response.json()
    },
    refetchInterval: 30000 // Refresh every 30s
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground font-mono">Loading cost data...</div>
        </CardContent>
      </Card>
    )
  }

  if (!costs) return null

  const totalCost = costs.byModel.haiku + costs.byModel.sonnet + costs.byModel.opus
  const budgetPercentage = costs.budget
    ? (costs[costs.budget.period === "daily" ? "today" : costs.budget.period === "weekly" ? "week" : "month"] / costs.budget.limit) * 100
    : 0

  const isApproachingLimit = budgetPercentage >= 80
  const isOverLimit = budgetPercentage >= 100

  return (
    <div className="space-y-6 font-mono">
      {/* Budget Warning */}
      {costs.budget && isApproachingLimit && (
        <Card className={cn(
          "border-2",
          isOverLimit ? "border-destructive bg-destructive/5" : "border-accent bg-accent/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={cn(
                "h-5 w-5",
                isOverLimit ? "text-destructive" : "text-accent"
              )} />
              <div>
                <p className="font-bold">
                  {isOverLimit ? "Budget Exceeded" : "Approaching Budget Limit"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {budgetPercentage.toFixed(1)}% of {costs.budget.period} budget used
                  (${costs[costs.budget.period === "daily" ? "today" : costs.budget.period === "weekly" ? "week" : "month"].toFixed(2)} / ${costs.budget.limit.toFixed(2)})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Today</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary tabular-nums">
              ${costs.today.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current day spending
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent tabular-nums">
              ${costs.week.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">
              ${costs.month.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Model */}
      <Card>
        <CardHeader>
          <CardTitle>Cost by Model</CardTitle>
          <CardDescription>Total spending breakdown across AI models</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Haiku */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-primary">Haiku (Fast)</span>
              <span className="tabular-nums text-primary">${costs.byModel.haiku.toFixed(2)}</span>
            </div>
            <Progress
              value={(costs.byModel.haiku / totalCost) * 100}
              className="h-2 bg-primary/10"
            />
            <div className="text-xs text-muted-foreground text-right">
              {((costs.byModel.haiku / totalCost) * 100).toFixed(1)}% of total
            </div>
          </div>

          {/* Sonnet */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-accent">Sonnet (Balanced)</span>
              <span className="tabular-nums text-accent">${costs.byModel.sonnet.toFixed(2)}</span>
            </div>
            <Progress
              value={(costs.byModel.sonnet / totalCost) * 100}
              className="h-2 bg-accent/10"
            />
            <div className="text-xs text-muted-foreground text-right">
              {((costs.byModel.sonnet / totalCost) * 100).toFixed(1)}% of total
            </div>
          </div>

          {/* Opus */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold" style={{ color: modelColors.opus }}>Opus (Deep)</span>
              <span className="tabular-nums" style={{ color: modelColors.opus }}>${costs.byModel.opus.toFixed(2)}</span>
            </div>
            <Progress
              value={(costs.byModel.opus / totalCost) * 100}
              className="h-2"
              style={{ backgroundColor: `${modelColors.opus}20` }}
            />
            <div className="text-xs text-muted-foreground text-right">
              {((costs.byModel.opus / totalCost) * 100).toFixed(1)}% of total
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="tabular-nums">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Cost Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending</CardTitle>
          <CardDescription>Cost trend over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costs.daily}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.2 0 0)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="oklch(0.5 0 0)"
                tick={{ fill: "oklch(0.5 0 0)", fontFamily: "monospace", fontSize: 11 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke="oklch(0.5 0 0)"
                tick={{ fill: "oklch(0.5 0 0)", fontFamily: "monospace", fontSize: 11 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0 0 0)",
                  border: "1px solid oklch(0.3 0 0)",
                  borderRadius: "0",
                  fontFamily: "monospace"
                }}
                labelStyle={{ color: "oklch(1 0 0)" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Cost"]}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Bar
                dataKey="cost"
                fill="oklch(0.75 0.3225 328.3634)"
                radius={[0, 0, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
