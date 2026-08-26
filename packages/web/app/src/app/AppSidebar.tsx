import { 
  BaseAppSidebar, 
  MenuSectionHeader,
  MenuItem,
} from "@/shell";
import { GridIcon } from "@/icons";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Logo = () => (
  <div className="flex items-center gap-2">
    <svg
      className="h-8 w-8 text-brand-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
    <span className="text-xl font-semibold text-gray-800 dark:text-white">
      Task Manager
    </span>
  </div>
);

const LogoCollapsed = () => (
  <svg
    className="h-8 w-8 text-brand-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// SIDEBAR CONTENT - Minimal menu for new applications
// ═══════════════════════════════════════════════════════════════════════════

const SidebarContent = () => {
  const isActive = (path: string) => window.location.pathname === path;

  return (
    <nav className="mb-6">
      <div className="flex flex-col gap-4">
        <div>
          <MenuSectionHeader title="Menu" />
          <ul className="flex flex-col gap-1">
            <MenuItem
              icon={<GridIcon />}
              name="Tasks"
              path="/"
              isActive={isActive}
            />
          </ul>
        </div>
      </div>
    </nav>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AppSidebar is a minimal sidebar for new applications.
 * Customize the Logo, LogoCollapsed, and SidebarContent to fit your needs.
 * 
 * For a full-featured demo with TailAdmin-style menu, see `demo/DemoSidebar`.
 * @kgId 8025fcb3eb97
 */
export const AppSidebar = () => (
  <BaseAppSidebar logo={<Logo />} logoCollapsed={<LogoCollapsed />}>
    <SidebarContent />
  </BaseAppSidebar>
);

export default AppSidebar;
