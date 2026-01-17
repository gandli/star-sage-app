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

    // Stable color generator for non-language tags
    // Stable color generator for non-language tags
    const getTopicColor = (name: string) => {
        const brandColor = getLanguageColor(name);
        // '#8b949e' is the default grey returned by getLanguageColor for unknown languages
        if (brandColor !== '#8b949e') return brandColor;

        // Fallback: Stable HSL color based on name hash
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Use a more vibrant range for interest areas
        return `hsl(${Math.abs(hash) % 360}, 65%, 60%)`;
    };

    // Custom Y-axis tick renderer with Devicon icons for Hot Topics
    const renderYAxisTickWithIcon = (props: any) => {
        const { x, y, payload } = props;
        const color = getTopicColor(payload.value);
        return (
            <g transform={`translate(${x - 90},${y - 12})`}>
                <foreignObject x={0} y={0} width={90} height={24}>
                    <div className="flex items-center justify-end gap-2 pr-2 h-full">
                        <span className="text-[9px] font-black uppercase tracking-tight opacity-70 truncate max-w-[60px]" style={{ color }}>
                            {payload.value}
                        </span>
                        <LanguageIcon name={payload.value} size={14} color={color} />
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

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const color = payload[0].payload.fill || payload[0].color || '#6366f1';
            return (
                <div
                    style={{ ...tooltipStyle, borderColor: color }}
                    className="flex flex-col gap-1"
                >
                    <p className="font-black" style={{ color }}>{label}</p>
                    <p className="opacity-60">Value: {payload[0].value}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 1. Language Distribution (Pie) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Distribution <span className="opacity-100 text-blue-500 ml-1">/ Language</span></h3>
                <div className="flex-1 w-full relative">
                    {pieData && pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" aspect={1.5} debounce={100} minWidth={1} minHeight={1} initialDimension={{ width: 400, height: 266 }}>
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
                                    cornerRadius={8}
                                    stroke="none"
                                    isAnimationActive={!isSyncing}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getLanguageColor(entry.name)} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend content={renderLegend} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 font-black uppercase tracking-widest text-[10px]">
                            No data available
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Star Trends (Area) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Growth <span className="opacity-100 text-indigo-500 ml-1">/ Star Trends</span></h3>
                <div className="flex-1 w-full relative">
                    {starTrends && starTrends.length > 0 ? (
                        <ResponsiveContainer width="100%" aspect={1.5} debounce={100} minWidth={1} minHeight={1} initialDimension={{ width: 400, height: 266 }}>
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
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 font-black uppercase tracking-widest text-[10px]">
                            Preparing growth insights...
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Ranking (Bar) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Ranking <span className="opacity-100 text-purple-500 ml-1">/ Language Stack</span></h3>
                <div className="flex-1 w-full relative">
                    {languageStats && languageStats.length > 0 ? (
                        <ResponsiveContainer width="100%" aspect={1.5} debounce={100} minWidth={1} minHeight={1} initialDimension={{ width: 400, height: 266 }}>
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
                                <RechartsTooltip cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 10 }} content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} isAnimationActive={!isSyncing}>
                                    {languageStats.slice(0, 8).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={getTopicColor(entry.name)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 font-black uppercase tracking-widest text-[10px]">
                            Analyzing stack distribution...
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Hot Topics (Horizontal Bar) */}
            <div className="premium-glass p-8 h-[450px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-pink-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-30">Hot Topics <span className="opacity-100 text-pink-500 ml-1">/ Interest Area</span></h3>
                <div className="flex-1 w-full relative">
                    {hotTopics && hotTopics.length > 0 ? (
                        <ResponsiveContainer width="100%" aspect={1.5} debounce={100} minWidth={1} minHeight={1} initialDimension={{ width: 400, height: 266 }}>
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
                                <RechartsTooltip cursor={{ fill: 'rgba(236, 72, 153, 0.05)', radius: 10 }} content={<CustomTooltip />} />
                                <Bar
                                    dataKey="value"
                                    radius={[0, 6, 6, 0]}
                                    barSize={20}
                                    isAnimationActive={!isSyncing}
                                >
                                    {hotTopics.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={getTopicColor(entry.name)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 font-black uppercase tracking-widest text-[10px]">
                            Mapping interest areas...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Charts;
