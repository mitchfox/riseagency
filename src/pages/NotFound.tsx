import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.log("404 Error: Redirecting to home from:", location.pathname);
  }, [location.pathname]);

  // Redirect to homepage for any 404 errors
  return <Navigate to="/" replace />;
};

export default NotFound;
