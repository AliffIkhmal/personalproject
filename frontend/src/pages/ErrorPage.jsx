import { useNavigate } from 'react-router-dom';

export default function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-24 h-24 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl text-outline">explore_off</span>
        </div>
        <h1 className="text-6xl font-headline font-extrabold text-on-surface mb-2">404</h1>
        <h2 className="text-xl font-headline font-bold text-on-surface mb-4">Page Not Found</h2>
        <p className="text-on-surface-variant mb-8 max-w-sm mx-auto">The page you are looking for doesn't exist or has been moved.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 indigo-pulse text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
