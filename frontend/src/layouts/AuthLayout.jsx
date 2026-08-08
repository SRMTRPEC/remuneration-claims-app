import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="font-secondary text-text-secondary overflow-hidden min-h-screen flex items-center justify-center relative p-4">

      <div className="relative z-10 w-full max-w-md bg-white rounded-md shadow-mega border border-black/5 overflow-hidden flex flex-col items-center">
        <div className="w-full bg-brand-primary p-8 flex justify-center">
          <Link to="/" className="font-primary text-3xl font-bold text-white tracking-tight">
            Remuneration Portal
          </Link>
        </div>
        <div className="w-full p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
