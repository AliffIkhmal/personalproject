import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/ui/StatusBadge';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-8 max-w-7xl mx-auto">
      {/* Search Header */}
      <div className="mt-12 mb-16 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold font-[Plus_Jakarta_Sans] tracking-tight text-on-surface mb-4">Vehicle Registry</h2>
        <p className="text-on-surface-variant mb-8 font-medium">Instantly locate technical records and service history.</p>
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-sky-600 text-2xl">search</span>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-14 pr-24 py-5 bg-surface-container-low border-none rounded-xl text-lg font-medium text-on-surface placeholder-outline focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-sm"
            placeholder="Search by license plate or customer name"
          />
          <div className="absolute inset-y-0 right-4 flex items-center">
            <button type="submit" className="px-3 py-1 bg-surface-container-high rounded-lg text-[10px] font-bold text-sky-600 uppercase tracking-widest border border-sky-100 hover:bg-sky-50 transition-colors">
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Results Grid */}
      {results !== null && !loading && (
        results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 relative group overflow-hidden border border-transparent hover:border-sky-100">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  r.status === 'in_progress' ? 'bg-amber-500' : r.status === 'completed' ? 'bg-emerald-500' : 'bg-sky-500'
                }`} />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-[Plus_Jakarta_Sans] font-bold text-lg text-on-surface">{r.vehicle_name}</h3>
                    <code className="text-sm font-mono text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded">{r.license_plate}</code>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="space-y-3 mb-6">
                  {r.customer_name && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-outline text-lg">person</span>
                      <span className="text-sm font-medium text-on-surface-variant">{r.customer_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-outline text-lg">build</span>
                    <span className="text-sm font-medium text-on-surface-variant">{r.service_type}</span>
                  </div>
                </div>
                <button onClick={() => navigate(`/record/${r.id}`)} className="flex items-center justify-between group/link text-sky-600 font-bold text-sm w-full">
                  <span>View Details</span>
                  <span className="material-symbols-outlined text-lg transition-transform group-hover/link:translate-x-1">chevron_right</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-5xl text-outline">search_off</span>
            </div>
            <h3 className="text-xl font-[Plus_Jakarta_Sans] font-bold text-on-surface">No vehicles found</h3>
            <p className="text-on-surface-variant max-w-xs mt-2 font-medium">We couldn't find any results matching your search criteria.</p>
            <button onClick={() => { setQuery(''); setResults(null); }} className="mt-8 px-6 py-2 rounded-xl bg-sky-500 text-white font-bold text-sm indigo-pulse shadow-lg shadow-sky-200">
              Clear Search
            </button>
          </div>
        )
      )}
    </section>
  );
}
