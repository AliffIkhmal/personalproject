import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import StatusBadge from '../components/ui/StatusBadge';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Queued' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'Major Service', label: 'Major Service' },
  { value: 'Minor Service', label: 'Minor Service' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: '', service_type: '', date_from: '', date_to: '' });
  const navigate = useNavigate();

  const buildParams = (q, p, f) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q);
    params.set('page', p);
    params.set('per_page', 12);
    if (f.status) params.set('status', f.status);
    if (f.service_type) params.set('service_type', f.service_type);
    if (f.date_from) params.set('date_from', f.date_from);
    if (f.date_to) params.set('date_to', f.date_to);
    return params.toString();
  };

  const doSearch = async (q, p = 1, f = filters) => {
    if (!q.trim() && !f.status && !f.service_type && !f.date_from && !f.date_to) return;
    setLoading(true);
    try {
      const data = await api.get(`/search?${buildParams(q, p, f)}`);
      setResults(data.results);
      setPagination(data.pagination);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    doSearch(query, 1, filters);
  };

  const goToPage = (p) => {
    setPage(p);
    doSearch(query, p, filters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    doSearch(query, 1, newFilters);
  };

  const clearAll = () => {
    setQuery('');
    setFilters({ status: '', service_type: '', date_from: '', date_to: '' });
    setResults(null);
    setPage(1);
  };

  const hasActiveFilters = filters.status || filters.service_type || filters.date_from || filters.date_to;

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
            placeholder="Search by license plate, vehicle, customer or notes"
          />
          <div className="absolute inset-y-0 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters || hasActiveFilters ? 'bg-sky-100 text-sky-600' : 'text-slate-400 hover:text-sky-500 hover:bg-sky-50'}`}
              title="Toggle filters"
            >
              <span className="material-symbols-outlined text-lg">tune</span>
              {hasActiveFilters && <span className="absolute top-2 right-16 w-2 h-2 bg-sky-500 rounded-full" />}
            </button>
            <button type="submit" className="px-3 py-1 bg-surface-container-high rounded-lg text-[10px] font-bold text-sky-600 uppercase tracking-widest border border-sky-100 hover:bg-sky-50 transition-colors">
              Search
            </button>
          </div>
        </form>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-slate-100 text-left">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold"
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Service Type</label>
                <select
                  value={filters.service_type}
                  onChange={(e) => handleFilterChange('service_type', e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold"
                >
                  {SERVICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-sky-500/20 outline-none font-semibold"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={clearAll}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
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
            <button onClick={clearAll} className="mt-8 px-6 py-2 rounded-xl bg-sky-500 text-white font-bold text-sm indigo-pulse shadow-lg shadow-sky-200">
              Clear Search
            </button>
          </div>
        )
      )}

      {/* Pagination */}
      {results !== null && !loading && results.length > 0 && pagination.total_pages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-10">
          <button
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === pagination.total_pages || Math.abs(p - page) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="px-1 text-slate-400 text-xs">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                    page === p ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:bg-sky-50 hover:text-sky-600'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={page >= pagination.total_pages}
            onClick={() => goToPage(page + 1)}
            className="p-2 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      )}
    </section>
  );
}
