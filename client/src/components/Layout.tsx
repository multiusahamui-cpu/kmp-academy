import React, { useState, useEffect } from "react";
import { UserRole, CartItem, WishlistItem } from "../types";
import NotificationBell from "./NotificationBell";
import {
  Receipt,
  ClipboardCheck,
  Menu,
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  ShieldAlert,
  LifeBuoy,
  LogOut,
  GraduationCap,
  Wallet,
  Activity,
  FileCheck,
  Compass,
  UserCircle,
  Moon,
  Sun,
  Banknote,
  ShoppingBag,
  Tags,
  Megaphone,
  BarChart,
  ShieldCheck,
  Gavel,
  LogIn,
  Info,
  SlidersHorizontal,
  UserMinus,
  Archive,
  Coins,
  CircleDollarSign,
} from "lucide-react";
import { CONTACT_INFO } from "../constants";
import CartDrawer from "./CartDrawer";
import InformationCenterModal from "./InformationCenterModal";
import { usePublicConfig } from "../services/publicConfig";

interface LayoutProps {
  children: React.ReactNode;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNavigate: (view: string) => void;
  currentView: string;
  // Cart & Wishlist Props
  cartItems?: CartItem[];
  wishlistItems?: WishlistItem[];
  isCartOpen?: boolean;
  setCartOpen?: (open: boolean) => void;
  removeFromCart?: (id: string) => void;
  updateCartQty?: (id: string, delta: number) => void;
  onMoveToCart?: (item: WishlistItem) => void;
  onRemoveFromWishlist?: (id: string) => void;
  // Auth
  onOpenAuth?: () => void;
}

// Define Menu Item Type locally
type MenuItem = {
  id?: string;
  label?: string;
  icon?: React.ElementType;
  isDivider?: boolean;
  sectionTitle?: string;
};

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentRole,
  onRoleChange,
  onNavigate,
  currentView,
  cartItems = [],
  wishlistItems = [],
  isCartOpen = false,
  setCartOpen = (_: boolean) => {},
  removeFromCart = (_: string) => {},
  updateCartQty = (_id: string, _delta: number) => {},
  onMoveToCart = (_: WishlistItem) => {},
  onRemoveFromWishlist = (_: string) => {},
  onOpenAuth,
}) => {
  // Halaman pengaturan notifikasi tetap menyorot menu Profil.
  const activeView = currentView === "profile-notifications" ? "profile" : currentView;
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false); // State for Info Modal

  // Initialize Dark Mode from LocalStorage or System Preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  // Function to handle smooth scrolling manually without changing URL hash
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault(); // CRITICAL: Prevents URL change and "refused to connect" error
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Nama situs & kontak bantuan mengikuti Konfigurasi Sistem
  const publicConfig = usePublicConfig();

  const getMenuItems = (role: UserRole): MenuItem[] => {
    // --- Common Items ---
    const dashboardItem = {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    };
    const profileItem = {
      id: "profile",
      label: "Profil & Role",
      icon: UserCircle,
    };

    // --- Student Items (Base Layer) ---
    const studentItems = [
      { id: "enrolled", label: "Kursus Diikuti", icon: BookOpen },
      { id: "catalog", label: "Etalase Kursus", icon: GraduationCap },
      { id: "classes", label: "Kelas", icon: Users },
      { id: "wallet", label: "Dompet", icon: Wallet },
      { isDivider: true, sectionTitle: "Program Node" },
      { id: "node-topup", label: "Beli / Top Up Node", icon: Coins },
      { id: "daily-bonus", label: "Bonus Harian Saya", icon: CircleDollarSign },
      { id: "bonus-withdrawal", label: "Cairkan Bonus", icon: Wallet },
    ];

    switch (role) {
      case UserRole.SUPERADMIN:
        return [
          dashboardItem,
          { isDivider: true, sectionTitle: "System Control" },
          { id: "users", label: "Manajemen User", icon: Users },
          { id: "system-config", label: "Konfigurasi Sistem", icon: SlidersHorizontal },
          { id: "settings", label: "Pengangkatan Jabatan", icon: Settings },
          { id: "policy", label: "Dokumen Hukum", icon: ShieldAlert },
          { isDivider: true },
          profileItem,
        ];

      case UserRole.DIRECTOR:
        return [
          dashboardItem,
          { isDivider: true, sectionTitle: "Executive Panel" },
          {
            id: "partner-governance",
            label: "Tata Kelola Partner",
            icon: Gavel,
          },
          {
            id: "quality-control",
            label: "Penjaminan Mutu",
            icon: ShieldCheck,
          },
          { id: "course-reviews", label: "Review Kursus", icon: ClipboardCheck },
          { id: "users", label: "Manajemen User", icon: Users },
          { id: "communication", label: "Komunikasi Publik", icon: Megaphone },
          { id: "payouts", label: "Pencairan Bagi Hasil", icon: Wallet },
          { id: "policy", label: "Dokumen Hukum", icon: ShieldAlert },
          { id: "account-deletions", label: "Penghapusan Akun", icon: UserMinus },
          { id: "archived-accounts", label: "Daftar Akun Archived", icon: Archive },
          {
            id: "strategic-report",
            label: "Laporan Strategis",
            icon: BarChart,
          },
          { isDivider: true },
          { id: "support", label: "Bantuan", icon: LifeBuoy },
          profileItem,
        ];

      case UserRole.ADMIN_SYSTEM:
        return [
          dashboardItem,
          { isDivider: true, sectionTitle: "Administration" },
          { id: "finance", label: "Keuangan & Settlement", icon: Banknote },
          { id: "kyc-review", label: "Verifikasi KYC", icon: ShieldCheck },
          { id: "payouts", label: "Pencairan Bagi Hasil", icon: Wallet },
          { id: "categories", label: "Manajemen Kategori", icon: Tags },
          { id: "proposals", label: "Approval Center", icon: FileCheck },
          { id: "users", label: "Manajemen User", icon: Users },
          { id: "payment-verification", label: "Verifikasi Pembayaran", icon: Receipt },
          { id: "node-topup-verif", label: "Konfirmasi Top Up Node", icon: Coins },
          { id: "node-withdrawals", label: "Pencairan Bonus Node", icon: CircleDollarSign },
          { id: "course-reviews", label: "Review Kursus", icon: ClipboardCheck },
          { id: "account-deletions", label: "Penghapusan Akun", icon: UserMinus },
          { id: "archived-accounts", label: "Daftar Akun Archived", icon: Archive },
          { id: "cron", label: "System Cron Jobs", icon: Activity },
          { id: "helpdesk", label: "Helpdesk Tickets", icon: LifeBuoy },
          { isDivider: true },
          profileItem,
        ];

      case UserRole.CREATOR:
        // Hybrid: Creator + Student
        return [
          dashboardItem,
          { isDivider: true, sectionTitle: "Area Creator" }, // Separator
          { id: "my-courses", label: "Kursus Saya", icon: BookOpen },
          { id: "create-course", label: "Buat Materi", icon: GraduationCap },
          { id: "my-payouts", label: "Bagi Hasil Saya", icon: Banknote },

          { isDivider: true, sectionTitle: "Area Student" }, // Separator
          ...studentItems,

          { isDivider: true },
          { id: "support", label: "Bantuan", icon: LifeBuoy },
          profileItem,
        ];

      case UserRole.MENTOR:
        // Hybrid: Mentor + Student
        return [
          dashboardItem,
          { isDivider: true, sectionTitle: "Area Mentor" }, // Separator
          { id: "explore-content", label: "Workshop", icon: Compass },
          { id: "my-classes", label: "Rombongan Belajar", icon: Users },
          { id: "my-payouts", label: "Bagi Hasil Saya", icon: Banknote },

          { isDivider: true, sectionTitle: "Area Student" }, // Separator
          ...studentItems,

          { isDivider: true },
          { id: "support", label: "Bantuan", icon: LifeBuoy },
          profileItem,
        ];

      case UserRole.STUDENT:
        // Pure Student
        return [
          dashboardItem,
          { isDivider: true, sectionTitle: "Learning Zone" },
          ...studentItems,
          { isDivider: true },
          { id: "support", label: "Bantuan", icon: LifeBuoy },
          profileItem,
        ];

      default:
        return [];
    }
  };

  // --- PUBLIC LAYOUT ---
  if (currentRole === UserRole.PUBLIC) {
    return (
      <div className="min-h-screen flex flex-col font-mono bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {/* Info Modal Component */}
        <InformationCenterModal
          isOpen={isInfoModalOpen}
          onClose={() => setInfoModalOpen(false)}
        />

        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => onNavigate("landing")}
            >
              <div className="bg-digitalcoop-900 dark:bg-digitalcoop-500 text-white p-2 rounded-lg group-hover:scale-105 transition">
                <GraduationCap size={24} />
              </div>
              <span className="font-sans font-extrabold text-xl text-digitalcoop-900 dark:text-white tracking-tight">
                {publicConfig.siteName}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-slate-300">
              {/* Corrected Href Links with preventDefault */}
              <a
                href="#home"
                onClick={(e) => handleScroll(e, "home")}
                className="hover:text-digitalcoop-600 dark:hover:text-digitalcoop-400 transition cursor-pointer"
              >
                Beranda
              </a>
              <a
                href="#courses"
                onClick={(e) => handleScroll(e, "courses")}
                className="hover:text-digitalcoop-600 dark:hover:text-digitalcoop-400 transition cursor-pointer"
              >
                Kursus
              </a>
              <a
                href="#about"
                onClick={(e) => handleScroll(e, "about")}
                className="hover:text-digitalcoop-600 dark:hover:text-digitalcoop-400 transition cursor-pointer"
              >
                Tentang Kami
              </a>

              <div className="flex items-center gap-2 border-l border-gray-200 dark:border-slate-700 pl-4">
                {/* Information Center Button */}
                <button
                  onClick={() => setInfoModalOpen(true)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition"
                  title="Pusat Informasi"
                >
                  <Info size={20} />
                </button>

                <button
                  onClick={() => toggleTheme()}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition"
                >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>

              {/* Login Button */}
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-digitalcoop-600 hover:bg-digitalcoop-700 text-white font-bold rounded-full text-sm shadow-lg hover:shadow-digitalcoop-500/30 transition transform hover:-translate-y-0.5 flex items-center"
              >
                <LogIn size={16} className="mr-2" /> Masuk / Daftar
              </button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setInfoModalOpen(true)}
                className="p-2 text-gray-600 dark:text-slate-300"
              >
                <Info size={20} />
              </button>
              <button
                onClick={() => toggleTheme()}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => toggleSidebar()}
                className="text-gray-600 dark:text-slate-300"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    );
  }

  // --- DASHBOARD LAYOUT (Logged In) ---
  const menuItems = getMenuItems(currentRole);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex font-mono transition-colors duration-300">
      {/* Info Modal Component */}
      <InformationCenterModal
        isOpen={isInfoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        wishlistItems={wishlistItems}
        onRemove={removeFromCart}
        onUpdateQty={updateCartQty}
        onMoveToCart={onMoveToCart}
        onRemoveFromWishlist={onRemoveFromWishlist}
      />

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-digitalcoop-900 dark:bg-slate-900 text-white transform transition-transform duration-200 ease-in-out border-r border-transparent dark:border-slate-800
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:inset-auto flex flex-col
      `}
      >
        <div className="h-16 flex items-center px-6 bg-digitalcoop-950 dark:bg-slate-950/50 shrink-0">
          <GraduationCap className="mr-2 text-digitalcoop-400" />
          <span className="font-sans font-bold text-lg tracking-tight">
            KMP - ADNG LMS
          </span>
        </div>

        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 p-3 bg-white/10 dark:bg-slate-800 rounded-xl mb-6 backdrop-blur-sm border border-white/5">
            <div className="w-10 h-10 rounded-full bg-digitalcoop-500 flex items-center justify-center font-bold text-white shadow-lg shadow-digitalcoop-500/20">
              {currentRole[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold font-sans truncate">
                User {currentRole}
              </p>
              <p className="text-xs text-digitalcoop-200 truncate capitalize">
                {currentRole.replace("_", " ").toLowerCase()}
              </p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item, index) => {
              // --- RENDER DIVIDER / SECTION HEADER ---
              if (item.isDivider) {
                return (
                  <div key={`divider-${index}`} className="py-2 mt-2 mb-1">
                    {item.sectionTitle && (
                      <p className="px-3 text-[10px] font-bold text-digitalcoop-300 uppercase tracking-wider opacity-80 mb-1">
                        {item.sectionTitle}
                      </p>
                    )}
                    <div className="border-t border-digitalcoop-700 dark:border-slate-700 mx-3 opacity-50"></div>
                  </div>
                );
              }

              // --- RENDER MENU ITEM ---
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id) onNavigate(item.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                    activeView === item.id
                      ? "bg-digitalcoop-600 dark:bg-digitalcoop-600 text-white shadow-md shadow-digitalcoop-900/20"
                      : "text-digitalcoop-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.icon && (
                    <item.icon
                      size={18}
                      className={`mr-3 transition-transform duration-200 ${activeView === item.id ? "scale-110" : "group-hover:scale-110"}`}
                    />
                  )}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 bg-digitalcoop-950 dark:bg-slate-950 shrink-0">
          <button
            onClick={() => onRoleChange(UserRole.PUBLIC)}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-300 hover:text-red-100 hover:bg-red-900/30 rounded-lg transition font-medium"
          >
            <LogOut size={16} className="mr-2" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <button
              onClick={() => toggleSidebar()}
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 lg:hidden mr-4"
            >
              <Menu size={24} />
            </button>
            <span className="font-sans font-bold text-gray-900 dark:text-white text-lg tracking-tight hidden sm:block">
              {publicConfig.siteName}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Show Cart for Student, Mentor AND Creator (Since they are also students) */}
            {(currentRole === UserRole.STUDENT ||
              currentRole === UserRole.MENTOR ||
              currentRole === UserRole.CREATOR) && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 transition"
              >
                <ShoppingBag size={20} />
                {cartItems.length > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full border border-white dark:border-slate-900 text-[10px] text-white flex items-center justify-center font-bold">
                    {cartItems.length}
                  </span>
                )}
              </button>
            )}

            <NotificationBell onOpenSettings={() => onNavigate("profile-notifications")} />

            <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

            {/* Info Button in Dashboard Header too */}
            <button
              onClick={() => setInfoModalOpen(true)}
              className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
              title="Pusat Informasi"
            >
              <Info size={18} />
            </button>

            <button
              onClick={() => toggleTheme()}
              className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-digitalcoop-50/40 dark:bg-slate-950 scroll-smooth">
          <div key={currentView} className="max-w-7xl mx-auto animate-in">{children}</div>
        </main>
      </div>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

const Footer = () => {
  const publicConfig = usePublicConfig();
  return (
  <footer className="bg-digitalcoop-900 dark:bg-slate-900 text-white pt-16 pb-8 border-t border-digitalcoop-800 dark:border-slate-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <GraduationCap size={32} className="text-digitalcoop-400" />
          <span className="font-sans font-bold text-2xl tracking-tight">
            {publicConfig.siteName}
          </span>
        </div>
        <p className="text-digitalcoop-100 dark:text-slate-400 text-sm leading-relaxed mb-6 max-w-sm">
          Platform pembelajaran digital terdepan untuk pengembangan Koperasi dan
          UMKM di Indonesia dengan kurikulum berbasis teknologi modern.
        </p>
      </div>

      <div>
        <h3 className="font-sans font-bold text-lg mb-6 text-digitalcoop-50">
          Hubungi Kami
        </h3>
        <ul className="space-y-4 text-sm text-digitalcoop-100 dark:text-slate-400">
          <li>
            <span className="block text-digitalcoop-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              Project Lead
            </span>
            {CONTACT_INFO.lead}
          </li>
          <li>
            <span className="block text-digitalcoop-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              WhatsApp
            </span>
            <span className="font-mono">{publicConfig.supportWhatsapp}</span>
          </li>
          <li>
            <span className="block text-digitalcoop-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
              Email Support
            </span>
            {publicConfig.supportEmail}
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-sans font-bold text-lg mb-6 text-digitalcoop-50">
          Lokasi
        </h3>
        <p className="text-sm text-digitalcoop-100 dark:text-slate-400 leading-relaxed">
          {CONTACT_INFO.address}
        </p>
        <div className="mt-8 pt-8 border-t border-digitalcoop-800 dark:border-slate-800 text-xs text-digitalcoop-300 dark:text-slate-600 font-mono">
          &copy; {new Date().getFullYear()} KMP - ADNG Digital Cooperative.
        </div>
      </div>
    </div>
  </footer>
);
};
