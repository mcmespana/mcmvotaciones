import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
      <div className="admin-shell w-full max-w-xl px-6 py-10 text-center">
        <h1 className="font-headline text-6xl font-black tracking-tight text-foreground mb-3">404</h1>
        <p className="text-lg text-muted-foreground mb-5">No se encontro la pagina solicitada.</p>
        <a href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Volver al inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
