"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { 
  Activity, 
  MessageSquare, 
  Volume2, 
  HardDrive, 
  TrendingUp, 
  Calendar 
} from "lucide-react";

export default function UsageDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/usage/stats?days=${days}`);
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (e) {
        console.error("Failed to fetch usage stats", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [days]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
        <>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-3xl" />
          ))}
        </>
        <div className="md:col-span-4 h-80 bg-slate-800/50 rounded-3xl" />
      </div>
    );
  }

  const metrics = [
    { label: "AI Responses", key: "ai_responses", icon: MessageSquare, color: "text-cyan-400" },
    { label: "TTS Seconds", key: "tts_seconds", icon: Volume2, color: "text-rose-400" },
    { label: "Storage (MB)", key: "storage_mb", icon: HardDrive, color: "text-amber-400" },
    { label: "Stream Hours", key: "stream_hours", icon: Activity, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8">
      {/* Time Filter */}
      <div className="flex justify-end">
        <div className="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-2xl">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                days === d ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-slate-400 hover:text-white"
              }`}
            >
              {d === 7 ? "WEEK" : d === 30 ? "MONTH" : "QUARTER"}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {metrics.map((m) => {
          const val = data?.totals[m.key] || 0;
          return (
            <div key={m.label} className="bg-slate-950 border border-slate-800 p-6 rounded-3xl group hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl bg-slate-900 ${m.color}`}>
                  <m.icon size={20} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">{m.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{Math.round(val).toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-600">Total</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Chart */}
      <div className="bg-slate-950 border border-slate-800 p-8 rounded-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <TrendingUp className="text-cyan-500" size={20} />
               Consumption Trends
            </h3>
            <p className="text-sm text-slate-500">Resource usage over the last {days} days</p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.stats || []}>
              <defs>
                <>
                  <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                    <>
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                    </>
                  </linearGradient>
                  <linearGradient id="colorTts" x1="0" y1="0" x2="0" y2="1">
                    <>
                      <stop offset="5%" stopColor="#fb7185" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                    </>
                  </linearGradient>
                </>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#475569" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val: string) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="ai_responses" 
                name="AI Responses"
                stroke="#22d3ee" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAi)" 
                key="ai-area"
              />
              <Area 
                type="monotone" 
                dataKey="tts_seconds" 
                name="TTS Seconds"
                stroke="#fb7185" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTts)" 
                key="tts-area"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
