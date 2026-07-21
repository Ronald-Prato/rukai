import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross1Icon,
  FileTextIcon,
  GearIcon,
  HomeIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

const items = [
  { label: "Inicio", icon: HomeIcon, active: true },
  { label: "Mis clases", icon: FileTextIcon },
  { label: "Fuentes", icon: MagicWandIcon },
];

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex border-r border-border bg-card/95 backdrop-blur transition-[width,transform] duration-300 ${
        collapsed
          ? "-translate-x-full md:w-[76px] md:translate-x-0"
          : "w-60 translate-x-0"
      }`}
    >
      <div className="flex w-full flex-col p-3">
        <div className={`flex h-12 items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
          <a href="/" className="flex cursor-pointer items-center gap-3" aria-label="Rukai, inicio">
            <span className="brand-mark" aria-hidden="true" />
            {!collapsed && <span className="text-base font-semibold tracking-[-0.03em]">rukai</span>}
          </a>
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Cerrar menú" className="md:hidden">
              <Cross1Icon />
            </Button>
          )}
        </div>

        <nav className="mt-8 space-y-1" aria-label="Navegación principal">
          {items.map(({ label, icon: Icon, active }) => (
            <a
              key={label}
              href="#"
              title={collapsed ? label : undefined}
              className={`flex h-11 cursor-pointer items-center rounded-xl text-sm transition-colors ${
                collapsed ? "justify-center" : "gap-3 px-3"
              } ${active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && label}
            </a>
          ))}
        </nav>

        <div className="mt-auto space-y-2">
          <a
            href="#"
            title={collapsed ? "Ajustes" : undefined}
            className={`flex h-11 cursor-pointer items-center rounded-xl text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground ${collapsed ? "justify-center" : "gap-3 px-3"}`}
          >
            <GearIcon className="size-[18px]" />
            {!collapsed && "Ajustes"}
          </a>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={onToggle}
            className={`hidden text-muted-foreground md:flex ${collapsed ? "mx-auto" : "w-full justify-start gap-3"}`}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            {!collapsed && "Contraer"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
