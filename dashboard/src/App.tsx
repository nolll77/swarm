import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import TaskList from "./pages/TaskList";
import TaskDetail from "./pages/TaskDetail";
import Audit from "./pages/Audit";
import Settings from "./pages/Settings";

export type Page = "overview" | "tasks" | "task-detail" | "audit" | "settings";

export default function App() {
  const [page, setPage] = useState<Page>("overview");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  function navigateTo(p: Page, taskId?: string) {
    setPage(p);
    if (taskId) setSelectedTaskId(taskId);
  }

  return (
    <div className="app">
      <Sidebar activePage={page} onNavigate={navigateTo} />
      <main className="main-content">
        {page === "overview" && <Overview onViewTask={(id) => navigateTo("task-detail", id)} />}
        {page === "tasks" && <TaskList onViewTask={(id) => navigateTo("task-detail", id)} />}
        {page === "task-detail" && <TaskDetail taskId={selectedTaskId} onBack={() => setPage("tasks")} />}
        {page === "audit" && <Audit />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
