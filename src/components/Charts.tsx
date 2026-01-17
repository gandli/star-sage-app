import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { CHART_PALETTE, getLanguageColor } from '../utils/theme';
import { LanguageIcon } from './LanguageIcon';

interface ChartsProps {
    pieData: any[];
    languageStats: any[];
    pieData: any[];
    languageStats: any[];
    isSyncing: boolean;
}

const Charts: React.FC<ChartsProps> = ({ pieData, languageStats, isSyncing }) => {
    // Custom legend renderer with Devicon icons
    const renderLegend = (props: any) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 pt-10">
                {payload.map((entry: any, index: number) => (
                    <div key={`legend-${index}`} className="flex items-center gap-3">
                        {/* 移除颜色点,图标颜色与切片保持一致 */}
                        <LanguageIcon name={entry.value} size={16} color={entry.color} />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--text-primary)]">
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
            <g transform={`translate(${x},${y + 12})`}>
                <foreignObject x={-15} y={0} width={30} height={30}>
                    <div className="flex items-center justify-center w-full h-full">
                        <LanguageIcon name={payload.value} size={20} color={color} />
                    </div>
                </foreignObject>
            </g>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="premium-glass p-10 h-[500px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 opacity-30">Distribution <span className="opacity-100 text-blue-500 ml-1">/ Language</span></h3>
                <div className="flex-1 min-h-[300px] min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={4}
                                stroke="none"
                                isAnimationActive={!isSyncing}
                                animationDuration={600}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getLanguageColor(entry.name)}
                                    />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{
                                    background: 'var(--bg-glass)',
                                    backdropFilter: 'var(--glass-blur)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                    padding: '12px 16px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    fontSize: '10px',
                                    letterSpacing: '0.1em'
                                }}
                            />
                            <Legend content={renderLegend} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="premium-glass p-10 h-[500px] flex flex-col rounded-[2.5rem] hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-10 opacity-30">Ranking <span className="opacity-100 text-purple-500 ml-1">/ Stack</span></h3>
                <div className="flex-1 min-h-[300px] min-w-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={languageStats.slice(0, 8)} margin={{ top: 0, right: 0, left: -20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="var(--chart-grid)" />
                            <XAxis
                                dataKey="name"
                                stroke="var(--text-secondary)"
                                tickLine={false}
                                axisLine={false}
                                height={45}
                                interval={0}
                                tick={renderCustomTick}
                            />
                            <YAxis
                                stroke="var(--text-secondary)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontWeight: 900, opacity: 0.5 }}
                            />
                            <RechartsTooltip
                                cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 10 }}
                                contentStyle={{
                                    background: 'var(--bg-glass)',
                                    backdropFilter: 'var(--glass-blur)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '16px',
                                    padding: '12px 16px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    fontSize: '10px',
                                    letterSpacing: '0.1em'
                                }}
                            />
                            <Bar
                                name="Repositories"
                                dataKey="value"
                                radius={[8, 8, 4, 4]}
                                barSize={36}
                                isAnimationActive={!isSyncing}
                            >
                                {languageStats.slice(0, 8).map((entry: any, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getLanguageColor(entry.name)}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Charts;
