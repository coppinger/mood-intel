import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addDays, getHours, startOfDay } from 'date-fns';
import pb from '../lib/pocketbase';

export default function WeeklyView() {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [selectedWeek]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const start = startOfWeek(selectedWeek).toISOString();
      const end = endOfWeek(selectedWeek).toISOString();

      const records = await pb.collection('entries').getList(1, 500, {
        filter: `timestamp >= "${start}" && timestamp <= "${end}"`,
        sort: 'timestamp'
      });

      setEntries(records.items);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create heatmap data structure
  const heatmapData = {};
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(startOfWeek(selectedWeek), i);
    days.push(day);
    const dayKey = format(day, 'yyyy-MM-dd');
    heatmapData[dayKey] = {};
    for (let hour = 8; hour <= 22; hour++) {
      heatmapData[dayKey][hour] = null;
    }
  }

  // Fill in actual data
  entries.forEach(entry => {
    const date = new Date(entry.timestamp);
    const dayKey = format(startOfDay(date), 'yyyy-MM-dd');
    const hour = getHours(date);
    if (heatmapData[dayKey] && hour >= 8 && hour <= 22) {
      // Average if multiple entries in same hour
      if (heatmapData[dayKey][hour] === null) {
        heatmapData[dayKey][hour] = entry.mood;
      } else {
        heatmapData[dayKey][hour] = (heatmapData[dayKey][hour] + entry.mood) / 2;
      }
    }
  });

  // Calculate daily stats
  const dailyStats = days.map(day => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayEntries = entries.filter(e =>
      format(startOfDay(new Date(e.timestamp)), 'yyyy-MM-dd') === dayKey
    );

    const moods = dayEntries.filter(e => e.mood !== null).map(e => e.mood);
    const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

    return {
      day,
      dayKey,
      count: dayEntries.length,
      avgMood: avgMood ? avgMood.toFixed(1) : null
    };
  });

  const getMoodColor = (mood) => {
    if (mood === null) return 'bg-gray-100';
    if (mood >= 4) return 'bg-green-500';
    if (mood >= 3) return 'bg-yellow-500';
    if (mood >= 2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8am to 10pm

  const weekStart = format(startOfWeek(selectedWeek), 'MMM d');
  const weekEnd = format(endOfWeek(selectedWeek), 'MMM d, yyyy');

  return (
    <div className="space-y-6">
      {/* Week picker */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <button
          onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
        >
          ← Previous Week
        </button>
        <span className="font-semibold text-gray-900">
          {weekStart} - {weekEnd}
        </span>
        <button
          onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
        >
          Next Week →
        </button>
      </div>

      {/* Daily averages */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Daily Averages</h2>
        <div className="grid grid-cols-7 gap-2">
          {dailyStats.map(({ day, avgMood, count }) => (
            <div key={day.toISOString()} className="text-center">
              <div className="text-xs font-medium text-gray-600 mb-1">
                {format(day, 'EEE')}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {format(day, 'M/d')}
              </div>
              <div className={`h-16 rounded-lg flex items-center justify-center ${
                avgMood ? getMoodColor(parseFloat(avgMood)) : 'bg-gray-100'
              }`}>
                {avgMood && (
                  <div className="text-white font-bold">
                    {avgMood}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {count} {count === 1 ? 'entry' : 'entries'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Mood Heatmap</h2>
        <div className="inline-block min-w-full">
          <div className="flex">
            {/* Hour labels */}
            <div className="flex flex-col justify-around pr-2">
              <div className="h-8"></div> {/* Header spacer */}
              {hours.map(hour => (
                <div key={hour} className="h-8 flex items-center text-xs text-gray-600">
                  {hour <= 12 ? `${hour}am` : `${hour - 12}pm`}
                </div>
              ))}
            </div>

            {/* Days columns */}
            {days.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              return (
                <div key={dayKey} className="flex-1 min-w-[60px] mx-1">
                  {/* Day header */}
                  <div className="h-8 flex items-center justify-center text-xs font-medium text-gray-700">
                    {format(day, 'EEE')}
                  </div>
                  {/* Hour cells */}
                  {hours.map(hour => (
                    <div
                      key={hour}
                      className={`h-8 mb-1 rounded ${getMoodColor(heatmapData[dayKey][hour])}`}
                      title={
                        heatmapData[dayKey][hour]
                          ? `${format(day, 'EEE')} ${hour}:00 - Mood: ${heatmapData[dayKey][hour].toFixed(1)}`
                          : `${format(day, 'EEE')} ${hour}:00 - No data`
                      }
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>2-3</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>3-4</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>4-5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-100 rounded border border-gray-300"></div>
            <span>No data</span>
          </div>
        </div>
      </div>

      {/* Weekly summary placeholder */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-3">Weekly Summary</h2>
        <p className="text-gray-600 text-sm">
          Total entries: {entries.length}
        </p>
        {entries.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <p>
              Average mood:{' '}
              <span className="font-semibold">
                {(entries.filter(e => e.mood).reduce((sum, e) => sum + e.mood, 0) /
                  entries.filter(e => e.mood).length).toFixed(1)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
