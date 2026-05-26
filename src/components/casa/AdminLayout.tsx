import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useRoleGuard, type StaffRole } from "@/lib/auth/useRoleGuard";
import { useCallback, useEffect, type ComponentType } from "react";
import {
  ClipboardList,
  Calendar,
  BarChart3,
  Briefcase,
  Clock,
  Package,
  ShoppingBag,
  Receipt,
  Wallet,
  Tag,
  Settings,
  Tv,
  LogOut,
  Building,
  ChevronsUpDown,
  User,
  Users,
  Sparkles,
  ConciergeBell,
} from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { t, localePath } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/casa/LanguageSwitcher";
import { useAuth } from "@/lib/auth-context";
import { useBusinessContext, type BusinessSummary } from "@/lib/business-context";
import { useBusinessTerminology } from "@/lib/business-terminology";
import type { ModuleKey } from "@/lib/business-modules";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type MenuItem = {
  path: string;
  label: { en: string; ar: string };
  icon: ComponentType<{ className?: string }>;
  module?: ModuleKey;
  external?: boolean;
  roles?: StaffRole[];
};

type MenuGroup = {
  group: { en: string; ar: string };
  items: MenuItem[];
};

const MENU_ITEMS: MenuGroup[] = [
  {
    group: { en: "Operations", ar: "الأعمال التشغيلية" },
    items: [
      {
        path: "/admin/queue",
        label: { en: "Walk-in Queue", ar: "قائمة الانتظار" },
        icon: ClipboardList,
        module: "walk_in_queue",
        roles: [
          "admin",
          "business_owner",
          "business_admin",
          "business_manager",
          "reception",
          "cashier",
        ],
      },
      {
        path: "/admin/reception",
        label: { en: "Reception", ar: "الاستقبال" },
        icon: ConciergeBell,
        module: "reservations",
        roles: [
          "admin",
          "business_owner",
          "business_admin",
          "business_manager",
          "reception",
          "cashier",
        ],
      },
      {
        path: "/admin/bookings",
        label: { en: "Bookings", ar: "الحجوزات" },
        icon: Calendar,
        module: "reservations",
        roles: [
          "admin",
          "business_owner",
          "business_admin",
          "business_manager",
          "reception",
          "cashier",
        ],
      },
      {
        path: "/admin/barber-workspace",
        label: { en: "Barber Workspace", ar: "مساحة الحلاق" },
        icon: Briefcase,
        module: "barber_workspace",
        roles: ["admin", "business_owner", "business_admin", "business_manager", "barber"],
      },
      {
        path: "/admin/product-sales",
        label: { en: "Product Sales", ar: "مبيعات المنتجات" },
        icon: ShoppingBag,
        module: "products_pos",
        roles: ["admin", "business_owner", "business_admin", "business_manager", "cashier"],
      },
    ],
  },
  {
    group: { en: "Management & Finance", ar: "الإدارة والمالية" },
    items: [
      {
        path: "/admin/queue-analytics",
        label: { en: "Queue Analytics", ar: "تحليلات قائمة الانتظار" },
        icon: BarChart3,
        module: "queue_analytics",
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
      {
        path: "/admin/reports",
        label: { en: "Financial Reports", ar: "التقارير المالية" },
        icon: BarChart3,
        roles: ["admin", "business_owner", "business_admin", "business_manager", "cashier"],
      },
      {
        path: "/admin/schedules",
        label: { en: "Shift Schedules", ar: "جداول المناوبات" },
        icon: Clock,
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
      {
        path: "/admin/wallets",
        label: { en: "Prepaid Vouchers", ar: "قسائم الدفع المسبق" },
        icon: Wallet,
        module: "wallets",
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
      {
        path: "/admin/promotions",
        label: { en: "Promotions & Loyalty", ar: "العروض والولاء" },
        icon: Tag,
        module: "discounts",
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
      {
        path: "/admin/expenses",
        label: { en: "Expenses & Suppliers", ar: "المصاريف والموردين" },
        icon: Receipt,
        module: "suppliers_expenses",
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
      {
        path: "/admin/packages",
        label: { en: "Packages & Services", ar: "الباقات والخدمات" },
        icon: Package,
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
      {
        path: "/admin/businesses",
        label: { en: "Businesses", ar: "المنشآت" },
        icon: Building,
        roles: ["admin"],
      },
      {
        path: "/admin/business-settings",
        label: { en: "Business Settings", ar: "إعدادات النشاط" },
        icon: Settings,
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
      {
        path: "/admin/staff",
        label: { en: "Staff Management", ar: "إدارة الموظفين" },
        icon: Users,
        roles: ["admin", "business_owner", "business_admin", "business_manager"],
      },
    ],
  },
  {
    group: { en: "External Views", ar: "العروض الخارجية" },
    items: [
      {
        path: "/admin/queue-display",
        label: { en: "Queue Display", ar: "شاشة عرض الانتظار" },
        icon: Tv,
        module: "walk_in_queue",
        external: true,
        roles: [
          "admin",
          "business_owner",
          "business_admin",
          "business_manager",
          "reception",
          "cashier",
          "barber",
          "viewer",
        ],
      },
    ],
  },
];

export function AdminLayout({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const { user, isAdmin, loading: authLoading, mustChangePassword, signOut } = useAuth();
  const guard = useRoleGuard();
  const { role: staffRole, loading: roleLoading } = guard;
  const businessContext = useBusinessContext();
  const terminology = useBusinessTerminology(lang);
  const { business, businesses, setSelectedBusinessSlug, isModuleEnabled } = businessContext;
  const { pathname } = useLocation();
  const router = useRouter();
  const changePasswordPath = localePath(lang, "/admin/change-password");
  const isChangePasswordRoute = pathname === changePasswordPath;

  // Determine active route path by prefixing lang
  const getRoutePath = useCallback(
    (path: string) => {
      return lang === "ar" ? `/ar${path}` : path;
    },
    [lang],
  );

  const isActive = useCallback(
    (path: string) => {
      const fullPath = getRoutePath(path);
      return pathname === fullPath || pathname.startsWith(fullPath + "/");
    },
    [pathname, getRoutePath],
  );

  const canAccessMenuItem = useCallback(
    (item: MenuItem) => {
      if (item.module && !isModuleEnabled(item.module)) return false;
      if (!item.roles) return guard.isPlatformAdmin;
      if (guard.isPlatformAdmin) return item.roles.includes("admin");
      return !!staffRole && item.roles.includes(staffRole);
    },
    [guard.isPlatformAdmin, isModuleEnabled, staffRole],
  );

  const currentMenuItem = MENU_ITEMS.flatMap((group) => group.items).find((item) =>
    isActive(item.path),
  );
  const routeDenied = !!currentMenuItem && !canAccessMenuItem(currentMenuItem);
  const menuLabel = useCallback(
    (item: MenuItem) =>
      item.path === "/admin/barber-workspace"
        ? terminology.staffWorkspace
        : lang === "ar"
          ? item.label.ar
          : item.label.en,
    [lang, terminology.staffWorkspace],
  );

  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (mustChangePassword && !isChangePasswordRoute) {
      router.navigate({ to: changePasswordPath });
    }
  }, [
    authLoading,
    changePasswordPath,
    isChangePasswordRoute,
    mustChangePassword,
    roleLoading,
    router,
    user,
  ]);

  // If loading, let the route component show a spinner or skeleton.
  // If not admin/user, just render the child outlet directly (it has its own login forms / messages).
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        {t(lang).common.loading}
      </div>
    );
  }

  if (!user || (!isAdmin && !staffRole)) {
    return <>{children}</>;
  }

  if (mustChangePassword && !isChangePasswordRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        {t(lang).common.loading}
      </div>
    );
  }

  if (routeDenied) {
    return (
      <div className="min-h-screen bg-background px-6 py-24 text-center text-foreground">
        <div className="mx-auto max-w-md rounded-lg border border-border/60 bg-card p-6">
          <h1 className="font-serif text-2xl">
            {lang === "ar" ? "غير مصرح بالوصول" : "Access denied"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {lang === "ar"
              ? "لا تملك صلاحية الوصول إلى هذه الصفحة لهذا النشاط."
              : "You do not have permission to access this page for the selected business."}
          </p>
        </div>
      </div>
    );
  }

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "AD";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        {/* Dynamic Premium Sidebar */}
        <Sidebar className="border-e border-border/40 bg-card/60 backdrop-blur-lg">
          {/* Sidebar Header: Logo & Business Switcher */}
          <SidebarHeader className="p-4 border-b border-border/40">
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60 text-white shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg leading-none font-bold text-foreground">
                  Casa Admin
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  Dashboard
                </span>
              </div>
            </div>

            {/* Business Dropdown Switcher */}
            {businesses.length > 0 && business && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-background/40 hover:bg-background/80 transition-colors p-2 text-start text-xs font-medium focus:outline-none mt-2">
                    <div className="flex items-center gap-2 truncate">
                      <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {lang === "ar" ? business.name_ar : business.name_en}
                      </span>
                    </div>
                    <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0 ms-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-56 bg-card border-border/60 text-foreground"
                >
                  <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {lang === "ar" ? "اختر الفرع / النشاط" : "Select Branch / Business"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/60" />
                  {businesses.map((b) => (
                    <DropdownMenuItem
                      key={b.id}
                      onClick={() => setSelectedBusinessSlug(b.slug)}
                      className={`flex items-center justify-between cursor-pointer text-xs px-2 py-1.5 focus:bg-primary/10 focus:text-primary ${
                        business.id === b.id ? "bg-primary/5 text-primary font-semibold" : ""
                      }`}
                    >
                      <span>{lang === "ar" ? b.name_ar : b.name_en}</span>
                      {business.id === b.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarHeader>

          {/* Sidebar Content */}
          <SidebarContent className="px-2 py-3">
            <SidebarMenu>
              {MENU_ITEMS.map((group, groupIdx) => {
                // Filter items based on whether their corresponding module is enabled
                const filteredItems = group.items.filter((item) => {
                  return canAccessMenuItem(item);
                });

                if (filteredItems.length === 0) return null;

                return (
                  <SidebarGroup key={groupIdx} className="mb-4">
                    <SidebarGroupLabel className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 px-3 mb-1">
                      {lang === "ar" ? group.group.ar : group.group.en}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const routePath = getRoutePath(item.path);

                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive(item.path)}
                              tooltip={menuLabel(item)}
                              className={`w-full group/btn relative flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 border-l-2 border-transparent hover:bg-muted/40 hover:text-foreground hover:border-border/65 data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=true]:text-primary data-[active=true]:font-medium`}
                            >
                              {item.external ? (
                                <a
                                  href={routePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center w-full gap-3"
                                >
                                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover/btn:scale-105" />
                                  <span className="truncate">{menuLabel(item)}</span>
                                </a>
                              ) : (
                                <Link to={routePath} className="flex items-center w-full gap-3">
                                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover/btn:scale-105" />
                                  <span className="truncate">{menuLabel(item)}</span>
                                </Link>
                              )}
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarGroupContent>
                  </SidebarGroup>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Sidebar Footer: User details, logout, lang toggle */}
          <SidebarFooter className="p-4 border-t border-border/40 bg-card/40">
            <div className="flex items-center justify-between gap-2 px-1 mb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                {lang === "ar" ? "اللغة" : "Language"}
              </span>
              <LanguageSwitcher lang={lang} />
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 rounded-lg bg-muted text-foreground border border-border/40 shadow-sm shrink-0">
                <AvatarFallback className="rounded-lg text-xs font-bold bg-background-200">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate flex-1">
                <span className="text-xs font-medium text-foreground truncate leading-none mb-0.5">
                  {user?.email?.split("@")[0] || "Admin"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate leading-none">
                  {user?.email}
                </span>
                {staffRole && (
                  <span className="text-[9px] uppercase tracking-wider text-primary/70 mt-0.5">
                    {staffRole}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => signOut()}
                title={lang === "ar" ? "تسجيل الخروج" : "Sign out"}
                className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors shrink-0 focus:outline-none"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Sidebar Inset holds the main content */}
        <SidebarInset className="flex flex-col flex-1 min-h-screen bg-background overflow-hidden">
          {/* Header row in main section for toggle button, active screen label and header controls */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-md px-4 md:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 text-foreground border border-border/40 hover:bg-muted/40 transition-colors" />
              <div className="h-4 w-px bg-border/40 hidden md:block" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {lang === "ar" ? business?.name_ar : business?.name_en}
                </span>
                <span>/</span>
                <span className="capitalize">
                  {pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Admin"}
                </span>
              </div>
            </div>

            {/* Actions: Home page link or language switcher copy */}
            <div className="flex items-center gap-3">
              <Link
                to={localePath(lang, "/")}
                className="inline-flex items-center justify-center rounded-lg border border-border/40 bg-background/40 hover:bg-background/80 transition-colors px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                {lang === "ar" ? "عرض الموقع الإلكتروني" : "View Website"}
              </Link>
            </div>
          </header>

          {/* Page content scroll container */}
          <main className="flex-1 overflow-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
