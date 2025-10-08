import { useState } from 'react';
import pb from '../lib/pocketbase';
import DailyView from './DailyView';
import WeeklyView from './WeeklyView';

export default function Dashboard() {
  const [view, setView] = useState('daily');

  const handleLogout = () => {
    pb.authStore.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Mood Intel</h1>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setView('daily')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  view === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setView('weekly')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  view === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Weekly
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'daily' ? <DailyView /> : <WeeklyView />}
      </main>
    </div>
  );
}
