import { Link } from 'react-router-dom';
import { Orbit } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Orbit size={40} className="text-cyan" />
      <h1 className="font-display text-3xl font-bold text-white">Lost in orbit</h1>
      <p className="max-w-sm text-mist-dim">This page drifted out of range. Let&rsquo;s get you back on course.</p>
      <Link to="/" className="btn-primary">
        Return home
      </Link>
    </div>
  );
}
