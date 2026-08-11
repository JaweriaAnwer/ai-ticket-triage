import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Outlet } from "react-router-dom";
import { AuroraBackground } from "../AuroraBackground";

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent relative">
      <AuroraBackground />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
