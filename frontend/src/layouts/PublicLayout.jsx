import { Outlet, Link } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="font-secondary text-text-secondary overflow-x-hidden min-h-screen flex flex-col w-full relative">
      <main className="flex-grow relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
