import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import pb from '../lib/pocketbase';

export default function DailyView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [selectedDate]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      const records = await pb.collection('entries').getList(1, 50, {
        filter: `timestamp >= "${start}" && timestamp <= "${end}"`,
        sort: '-timestamp'
      });

      setEntries(records.items);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = entries
    .slice()
    .reverse()
    .map(entry => ({
      time: format(new Date(entry.timestamp), 'HH:mm'),
      mood: entry.mood,
      energy: entry.energy === 'H' ? 3 : entry.energy === 'M' ? 2 : entry.energy === 'L' ? 1 : null
    }));

  const getMoodColor = (mood) => {
    if (!mood) return 'bg-gray-200';
    if (mood >= 4) return 'bg-green-500';
    if (mood >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getEnergyLabel = (energy) => {
    if (energy === 'H') return 'High';
    if (energy === 'M') return 'Medium';
    if (energy === 'L') return 'Low';
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Date picker */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Chart */}
      {entries.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Mood & Energy Trends</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="mood" stroke="#3b82f6" name="Mood" />
              <Line type="monotone" dataKey="energy" stroke="#10b981" name="Energy" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            Loading...
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No entries for this day
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    {format(new Date(entry.timestamp), 'h:mm a')}
                  </span>
                  {entry.mood && (
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${getMoodColor(entry.mood)} flex items-center justify-center text-white font-bold text-sm`}>
                        {entry.mood}
                      </div>
                    </div>
                  )}
                  {entry.energy && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                      Energy: {getEnergyLabel(entry.energy)}
                    </span>
                  )}
                </div>
                {entry.doing_category && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {entry.doing_category}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {entry.doing && (
                  <p className="text-gray-700">
                    <span className="font-medium">Doing:</span> {entry.doing}
                  </p>
                )}
                {entry.intention && (
                  <p className="text-gray-700">
                    <span className="font-medium">Next:</span> {entry.intention}
                  </p>
                )}
                {entry.location && (
                  <p className="text-gray-500 text-xs">
                    📍 {entry.location}
                  </p>
                )}
                {entry.social_context && (
                  <p className="text-gray-500 text-xs">
                    👥 {entry.social_context}
                  </p>
                )}
              </div>

              {entry.insights && Object.keys(entry.insights).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
                    {entry.insights.observation || entry.insights.notable_change || entry.insights.energy_mood_mismatch}
                  </div>
                </div>
              )}

              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Raw message
                </summary>
                <p className="mt-2 text-xs text-gray-500 italic">{entry.raw_text}</p>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
