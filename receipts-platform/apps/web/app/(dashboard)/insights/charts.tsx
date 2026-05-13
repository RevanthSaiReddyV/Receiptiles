"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const COLORS = [
  "#18181b", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
  "#10b981", "#06b6d4", "#6366f1", "#d946ef", "#eab308",
];

interface CategoryData {
  name: string;
  value: number;
  count: number;
}

interface MerchantData {
  name: string;
  total: number;
  visits: number;
}

interface DailyData {
  date: string;
  total: number;
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#fff",
    border: "1px solid #e4e4e7",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    fontSize: "12px",
    padding: "8px 12px",
  },
  itemStyle: { color: "#18181b" },
};

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} (${(percent * 100).toFixed(0)}%)`
            }
            labelLine={false}
            strokeWidth={2}
            stroke="#fff"
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
            {...tooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MerchantBarChart({ data }: { data: MerchantData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v}`}
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={{ stroke: "#e4e4e7" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={80}
            tick={{ fontSize: 12, fill: "#3f3f46" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
            {...tooltipStyle}
          />
          <Bar dataKey="total" fill="#18181b" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailySpendChart({ data }: { data: DailyData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={{ stroke: "#e4e4e7" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${v}`}
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Spent"]}
            {...tooltipStyle}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#18181b"
            strokeWidth={2}
            dot={{ r: 3, fill: "#18181b", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#18181b", strokeWidth: 2, stroke: "#fff" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
