'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PricePoint } from '@/types';
import { motion } from 'framer-motion';

interface ChartComponentProps {
  userData: PricePoint[];
  botData: PricePoint[];
  userCrypto: string;
  botCrypto: string;
  userStartPrice?: number;
  botStartPrice?: number;
}

export default function ChartComponent({
  userData,
  botData,
  userCrypto,
  botCrypto,
  userStartPrice,
  botStartPrice,
}: ChartComponentProps) {
  const chartData = userData.map((point, index) => {
    const botPoint = botData[index];
    const userChange = userStartPrice 
      ? ((point.price - userStartPrice) / userStartPrice) * 100 
      : 0;
    const botChange = botStartPrice 
      ? ((botPoint.price - botStartPrice) / botStartPrice) * 100 
      : 0;

    return {
      time: `${index * 5}s`, // Clean time labels: 0s, 5s, 10s, etc.
      [`${userCrypto}%`]: parseFloat(userChange.toFixed(2)),
      [`${botCrypto}%`]: parseFloat(botChange.toFixed(2)),
    };
  });

  const userChange = chartData[chartData.length - 1]?.[`${userCrypto}%`] || 0;
  const botChange = chartData[chartData.length - 1]?.[`${botCrypto}%`] || 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-effect border border-white/20 rounded-lg p-3 shadow-xl"
        >
          <p className="text-xs text-gray-400 mb-2 border-b border-white/10 pb-2">
            {payload[0].payload.time}
          </p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-xs mt-1.5"
              style={{ color: entry.color }}
            >
              {entry.name}: <span className="font-semibold">{entry.value >= 0 ? '+' : ''}{entry.value?.toFixed(2)}%</span>
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full space-y-4"
    >
      {/* Chart */}
      <div className="h-80 glass-effect rounded-xl border border-white/10 p-6 hover-lift">
      <div className="relative z-10 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} />
            <XAxis 
              dataKey="time" 
              stroke="#666"
              style={{ fontSize: '10px' }}
              tick={{ fill: '#666' }}
            />
            <YAxis 
              stroke="#666"
              style={{ fontSize: '10px' }}
              tick={{ fill: '#666' }}
              tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value}%`}
              label={{ 
                value: 'Change %', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: '10px', fill: '#666' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '11px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey={`${userCrypto}%`}
              stroke="#00ffff" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#00ffff' }}
              activeDot={{ r: 5, fill: '#00ffff' }}
              name={userCrypto}
              animationDuration={500}
              animationEasing="ease-in-out"
              isAnimationActive={true}
            />
            <Line 
              type="monotone" 
              dataKey={`${botCrypto}%`}
              stroke="#ff00ff" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#ff00ff' }}
              activeDot={{ r: 5, fill: '#ff00ff' }}
              name={botCrypto}
              animationDuration={500}
              animationEasing="ease-in-out"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Percentage Display - Separated */}
      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
          className="glass-effect rounded-xl border border-white/10 p-4"
          >
          <div className="text-xs text-gray-400 mb-2 tracking-wide truncate" title={userCrypto}>
            {userCrypto}
          </div>
            <div
            className={`text-2xl font-bold text-center px-4 py-2 rounded-lg ${
                userChange >= 0
                ? 'text-neon-green bg-neon-green/10'
                : 'text-red-400 bg-red-500/10'
              }`}
            >
              {userChange >= 0 ? '+' : ''}{userChange.toFixed(2)}%
            </div>
          </motion.div>
        
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
          className="glass-effect rounded-xl border border-white/10 p-4"
          >
          <div className="text-xs text-gray-400 mb-2 tracking-wide truncate" title={botCrypto}>
            {botCrypto}
          </div>
            <div
            className={`text-2xl font-bold text-center px-4 py-2 rounded-lg ${
                botChange >= 0
                ? 'text-neon-green bg-neon-green/10'
                : 'text-red-400 bg-red-500/10'
              }`}
            >
              {botChange >= 0 ? '+' : ''}{botChange.toFixed(2)}%
            </div>
          </motion.div>
      </div>
    </motion.div>
  );
}
