export default function Sidebar({
  activePage,
  navigateToPage,
}) {
  const navigationItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: "⌂",
    },
    {
      key: "manuscripts",
      label: "Manuscripts",
      icon: "▤",
    },
    {
      key: "canon",
      label: "Canon Explorer",
      icon: "◈",
    },
    {
      key: "continuity",
      label: "Continuity",
      icon: "◌",
    },
    {
      key: "reviews",
      label: "Reviews",
      icon: "✓",
    },
  ];

  return (
    <aside className="app-sidebar">

      <div className="sidebar-brand">

        <div className="brand-icon">
          C
        </div>

        <div>
          <strong>
            Continuity
          </strong>

          <span>
            Canon Checker
          </span>
        </div>

      </div>

      <div className="sidebar-section-label">
        WORKSPACE
      </div>

      <nav className="sidebar-nav">

        {navigationItems.map(
          (item) => (
            <button
              type="button"
              key={item.key}
              className={
                activePage ===
                item.key
                  ? "sidebar-nav-item active"
                  : "sidebar-nav-item"
              }
              onClick={() =>
                navigateToPage(
                  item.key
                )
              }
            >

              <span className="sidebar-nav-icon">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

            </button>
          )
        )}

      </nav>

      <div className="sidebar-spacer" />

      <button
        type="button"
        className={
          activePage ===
          "settings"
            ? "sidebar-nav-item active"
            : "sidebar-nav-item"
        }
        onClick={() =>
          navigateToPage(
            "settings"
          )
        }
      >

        <span className="sidebar-nav-icon">
          ⚙
        </span>

        <span>
          Settings
        </span>

      </button>

      <div className="sidebar-footer">

        <span className="sidebar-status-dot" />

        <div>

          <strong>
            Local workspace
          </strong>

          <span>
            FastAPI development server
          </span>

        </div>

      </div>

    </aside>
  );
}