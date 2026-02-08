import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="app-layout">
        <nav className="app-nav">
          <div className="nav-brand">
            <h1>📝 Notes App</h1>
          </div>
          <div className="nav-links">
            <Link to="/" className="nav-link" activeProps={{ className: 'active' }}>
              Home
            </Link>
            <Link to="/notes" className="nav-link" activeProps={{ className: 'active' }}>
              All Notes
            </Link>
            <Link to="/new" className="nav-link" activeProps={{ className: 'active' }}>
              New Note
            </Link>
            <Link to="/about" className="nav-link" activeProps={{ className: 'active' }}>
              About
            </Link>
          </div>
        </nav>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <TanStackRouterDevtools />
    </>
  ),
});
