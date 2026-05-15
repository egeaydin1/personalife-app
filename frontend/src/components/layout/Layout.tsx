import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import Sidebar from "./Sidebar";

export default function Layout() {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  return (
    <>
      <div className="app-bg" />
      <div className="app">
        <Sidebar />
        <main className="main">
          <div className="main-scroll" ref={scrollRef} key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
}
