import type { Page } from "../App";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: "overview", label: "Overview", icon: "grid" },
  { page: "tasks", label: "Tasks", icon: "list" },
  { page: "audit", label: "Audit Log", icon: "shield" },
  { page: "settings", label: "Settings", icon: "settings" },
];

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    list: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1" fill="currentColor" />
        <circle cx="4" cy="12" r="1" fill="currentColor" />
        <circle cx="4" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
    shield: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    settings: (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  };
  return icons[name] || null;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>AI Dev</span> Platform
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.page}
            className={`nav-item ${activePage === item.page ? "active" : ""}`}
            onClick={() => onNavigate(item.page)}
          >
            <NavIcon name={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="tenant-badge">
          <span className="tenant-name">Acme Corp</span>
          Team Plan
        </div>
      </div>
    </aside>
  );
}
