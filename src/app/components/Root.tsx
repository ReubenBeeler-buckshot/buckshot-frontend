import { Outlet, Link, useLocation } from "react-router";

export default function Root() {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center space-x-8">
            <Link 
              to="/about" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === "/" || location.pathname === "/about" 
                  ? "text-foreground" 
                  : "text-muted-foreground"
              }`}
            >
              About
            </Link>
            <Link 
              to="/gallery" 
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === "/gallery" 
                  ? "text-foreground" 
                  : "text-muted-foreground"
              }`}
            >
              Gallery
            </Link>
          </div>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
