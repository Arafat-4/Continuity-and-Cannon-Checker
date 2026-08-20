export default function Topbar({
  activePage,
  navigationItems,
  result,
  navigateToPage,
}) {
  const currentPage =
    navigationItems.find(
      (item) =>
        item.key === activePage
    )?.label ||
    "Dashboard";

  return (
    <header className="topbar">

      <div>

        <span className="topbar-eyebrow">
          CONTINUITY & CANON CHECKER
        </span>

        <strong>
          {currentPage}
        </strong>

      </div>

      <div className="topbar-right">

        {result?.filename && (
          <div className="topbar-manuscript">

            <span className="sidebar-status-dot" />

            <span>
              {result.filename}
            </span>

          </div>
        )}

        <button
          type="button"
          className="topbar-settings"
          onClick={() =>
            navigateToPage(
              "settings"
            )
          }
          aria-label="Open settings"
        >
          ⚙
        </button>

      </div>

    </header>
  );
}