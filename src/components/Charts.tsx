import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import { getLanguageColor } from '../utils/theme';
import { LanguageIcon } from './LanguageIcon';

interface ChartsProps {
    pieData: any[];
    languageStats: any[];
    starTrends: any[];
    hotTopics: any[];
    isSyncing: boolean;
}

const Charts: React.FC<ChartsProps> = ({ pieData, languageStats, starTrends, hotTopics, isSyncing }) => {
    // Custom legend renderer with Devicon icons
    const renderLegend = (props: any) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-6">
                {payload.map((entry: any, index: number) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                        <LanguageIcon name={entry.value} size={14} color={entry.color} />
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 text-[var(--text-primary)]">
                            {entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    // Custom X-axis tick renderer with Devicon icons
    const renderCustomTick = (props: any) => {
        const { x, y, payload } = props;
        const color = getLanguageColor(payload.value);
        return (
            <g transform={`translate(${x},${y + 10})`}>
                <foreignObject x={-12} y={0} width={24} height={24}>
                    <div className="flex items-center justify-center w-full h-full">
                        <LanguageIcon name={payload.value} size={18} color={color} />
                    </div>
                </foreignObject>
            </g>
        );
    };

    // Custom Y-axis tick renderer with Devicon icons for Hot Topics
    const renderYAxisTickWithIcon = (props: any) => {
        const { x, y, payload } = props;
        return (
            <g transform={`translate(${x - 90},${y - 12})`}>
                <foreignObject x={0} y={0} width={90} height={24}>
                    <div className="flex items-center justify-end gap-2 pr-2 h-full">
                        <span className="text-[9px] font-black uppercase tracking-tight opacity-70 truncate max-w-[60px]">
                            {payload.value}
                        </span>
                        <LanguageIcon name={payload.value} size={14} color="#ec4899" />
                    </div>
                </foreignObject>
            </g>
        );
    };

    const tooltipStyle = {
        background: 'var(--bg-glass)',
        backdropFilter: 'var(--glass-blur)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-glass)',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '12px 16px',
        fontWeight: '900',
        textTransform: 'uppercase' as const,
        fontSize: '10px',
        letterSpacing: '0.1em'
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. Language Distribution (Pie) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Distribution <span className="opacity-100 text-blue-500 ml-1">/ Language</span></h3>
                <div className="flex-1 min-h-0 min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={100}
                                paddingAngle={4}
                                stroke="none"
                                isAnimationActive={!isSyncing}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getLanguageColor(entry.name)} />
                                ))}
                            </Pie>
                            <RechartsTooltip contentStyle={tooltipStyle} />
                            <Legend content={renderLegend} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Star Trends (Area) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Growth <span className="opacity-100 text-indigo-500 ml-1">/ Star Trends</span></h3>
                <div className="flex-1 min-h-0 min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={starTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="var(--chart-grid)" />
                            <XAxis
                                dataKey="month"
                                stroke="var(--text-secondary)"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontWeight: 900, opacity: 0.4 }}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="var(--text-secondary)"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontWeight: 900, opacity: 0.4 }}
                            />
                            <RechartsTooltip
                                contentStyle={tooltipStyle}
                                labelStyle={{ color: '#6366f1', marginBottom: '4px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#6366f1"
                                strokeWidth={4}
                                fillOpacity={1}
                                fill="url(#colorTrend)"
                                isAnimationActive={!isSyncing}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Ranking (Bar) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Ranking <span className="opacity-100 text-purple-500 ml-1">/ Language Stack</span></h3>
                <div className="flex-1 min-h-0 min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={languageStats.slice(0, 8)} margin={{ top: 0, right: 0, left: -25, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="var(--chart-grid)" />
                            <XAxis
                                dataKey="name"
                                stroke="var(--text-secondary)"
                                tickLine={false}
                                axisLine={false}
                                height={40}
                                interval={0}
                                tick={renderCustomTick}
                            />
                            <YAxis
                                stroke="var(--text-secondary)"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontWeight: 900, opacity: 0.4 }}
                            />
                            <RechartsTooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 10 }} contentStyle={tooltipStyle} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} isAnimationActive={!isSyncing}>
                                {languageStats.slice(0, 8).map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={getLanguageColor(entry.name)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. Hot Topics (Horizontal Bar) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-pink-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Hot Topics <span className="opacity-100 text-pink-500 ml-1">/ Interest Area</span></h3>
                <div className="flex-1 min-h-0 min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            layout="vertical"
                            data={hotTopics}
                            margin={{ top: 0, right: 30, left: 60, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="8 8" horizontal={false} stroke="var(--chart-grid)" />
                            <XAxis type="number" hide />
                            <YAxis
                                type="category"
                                dataKey="name"
                                stroke="var(--text-primary)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                width={100}
                                tick={renderYAxisTickWithIcon}
                            />
                            <RechartsTooltip cursor={{ fill: 'rgba(236, 72, 153, 0.05)', radius: 10 }} contentStyle={tooltipStyle} />
                            <Bar
                                dataKey="value"
                                fill="#ec4899"
                                radius={[0, 6, 6, 0]}
                                barSize={20}
                                isAnimationActive={!isSyncing}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Charts;
