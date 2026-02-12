import React, { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Menu, Search, X, LogOut, Tag, LayoutGrid, LayoutList, Palette } from 'lucide-react';
import type { Category } from '../hooks/useCategories';

interface AppLayoutProps {
    children: React.ReactNode;
    categories: Category[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onOpenLabels: () => void;
    title: string;
    onSearch: (q: string) => void;
    searchValue: string;
    selectedCategoryIds: number[];
    onToggleCategoryFilter: (id: number) => void;
    onClearCategoryFilters: () => void;
    masonrySize: 'normal' | 'large';
    onMasonrySizeChange: (size: 'normal' | 'large') => void;
    contentRef?: React.Ref<HTMLDivElement>;
    theme: string;
    onChangeTheme: (theme: string) => void;
}

export default function AppLayout({
    children,
    categories,
    activeTab,
    setActiveTab,
    onOpenLabels,
    title,
    onSearch,
    searchValue,
    selectedCategoryIds,
    onToggleCategoryFilter,
    onClearCategoryFilters,
    masonrySize,
    onMasonrySizeChange,
    theme,
    onChangeTheme,
    contentRef,
}: AppLayoutProps) {
    const { logout, user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement | null>(null);
    const themes = [
        { id: 'light', label: 'Light', nav: '#eef2f7', main: '#f8fafc' },
        { id: 'sand', label: 'Sand', nav: '#eadfce', main: '#f7f1e6' },
        { id: 'mist', label: 'Mist', nav: '#dfe7f3', main: '#f1f4fb' },
        { id: 'blush', label: 'Blush', nav: '#f2dfe6', main: '#fbf1f5' },
        { id: 'mint', label: 'Mint', nav: '#dcefe8', main: '#f2faf6' },
    ];
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const themeRef = useRef<HTMLDivElement | null>(null);
    const cycleTheme = () => {
        setIsThemeOpen((prev) => !prev);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (filterRef.current && !filterRef.current.contains(target)) {
                setIsFilterOpen(false);
            }
            if (themeRef.current && !themeRef.current.contains(target)) {
                setIsThemeOpen(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`flex flex-col h-screen font-sans overflow-hidden theme-${theme}`} style={{ backgroundColor: 'var(--main-bg)' }}>
            <header
                className="h-16 border-b grid grid-cols-[auto,minmax(0,1fr),auto] items-center gap-0 sm:gap-4 px-4 lg:px-8 shrink-0 z-30 relative"
                style={{
                    backgroundColor: 'var(--nav-bg)',
                    borderColor: 'var(--nav-border)',
                    color: 'var(--nav-text)',
                }}
            >

                <div className="flex items-center gap-4 z-10 min-w-0">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 -ml-2 rounded-lg lg:hidden"
                        style={{ color: 'var(--nav-muted)' }}
                    >
                        <Menu size={24} />
                    </button>
                    <h2 className="text-xl font-bold text-gray-800 capitalize hidden md:block whitespace-nowrap truncate">
                        {title}
                    </h2>
                </div>

                <div className="flex items-center gap-2 min-w-0 w-full max-w-2xl justify-self-center px-0 pl-2 sm:pl-2">
                    <div
                        className="relative group flex-1 min-w-0 rounded-lg border border-[var(--control-border)] focus-within:border-2 focus-within:border-[var(--nav-muted)] transition-all"
                        style={{
                            backgroundColor: 'var(--control-bg)',
                            boxShadow: 'none',
                        }}
                    >
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: 'var(--nav-muted)' }}>
                            <Search size={18} />
                        </div>
                        <input
                            value={searchValue}
                            onChange={(e) => onSearch(e.target.value)}
                            className="block w-full pl-10 pr-10 py-3 bg-transparent border-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none sm:text-sm"
                            style={{ color: 'var(--nav-text)' }}
                            placeholder="Search"
                        />
                        {searchValue && (
                            <button
                                onClick={() => onSearch('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                style={{ color: 'var(--nav-muted)' }}
                                title="Clear"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div ref={filterRef} className="relative flex-none">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen((prev) => !prev)}
                            className="theme-control flex h-12 w-12 items-center justify-center rounded-lg"
                            title="Filter by label"
                        >
                            <Tag size={18} />
                        </button>
                        {isFilterOpen && (
                            <div
                                className="absolute left-full top-0 ml-2 w-44 rounded-xl border shadow-xl p-2 z-40"
                                style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
                            >
                                <div className="flex items-center justify-between px-2 py-1">
                                    <div className="text-xs uppercase tracking-wide text-gray-500">Labels</div>
                                    {selectedCategoryIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={onClearCategoryFilters}
                                            className="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-56 overflow-y-auto px-1 py-1 space-y-1">
                                    {categories.map((cat) => {
                                        const isActive = selectedCategoryIds.includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => onToggleCategoryFilter(cat.id)}
                                                className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${isActive ? 'theme-option-active' : 'theme-option'
                                                    }`}
                                            >
                                                <span className="truncate text-left">#{cat.name}</span>
                                                {isActive && <span>✓</span>}
                                            </button>
                                        );
                                    })}
                                    {categories.length === 0 && (
                                        <div className="text-xs text-gray-500 px-2 py-2">No labels yet</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onMasonrySizeChange(masonrySize === 'normal' ? 'large' : 'normal')}
                        className="theme-control flex h-12 w-12 items-center justify-center rounded-lg flex-none"
                        title={masonrySize === 'normal' ? 'Large cards' : 'Normal cards'}
                    >
                        {masonrySize === 'normal' ? <LayoutGrid size={18} /> : <LayoutList size={18} />}
                    </button>
                </div>

                <div className="hidden lg:flex items-center gap-4 min-w-fit z-10 justify-self-end">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs select-none">
                        {user?.email?.[0].toUpperCase()}
                    </div>

                    <button onClick={logout} className="p-1" style={{ color: 'var(--nav-muted)' }} title="Sign Out">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar
                    categories={categories}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    openLabelModal={onOpenLabels}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    userInitial={user?.email?.[0]?.toUpperCase() ?? '?'}
                    userName={user?.username || 'User'}
                    onLogout={logout}
                    theme={theme}
                    onChangeTheme={onChangeTheme}
                    themes={themes}
                />

                <main
                    ref={contentRef}
                    className="flex-1 overflow-y-auto px-2 py-4 sm:p-8 custom-scrollbar relative z-0"
                    style={{ backgroundColor: 'var(--main-bg)' }}
                >
                    <div ref={themeRef} className="absolute top-4 right-4 hidden lg:block">
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={cycleTheme}
                            className="theme-control flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm"
                            title="Change theme"
                        >
                            <Palette size={14} />
                            Theme
                        </button>
                        {isThemeOpen && (
                            <div
                                className="absolute right-0 top-full mt-2 w-48 rounded-2xl border p-3 shadow-xl backdrop-blur z-40"
                                style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Themes</div>
                                <div className="flex flex-wrap gap-2">
                                    {themes.map((item) => {
                                        const isActive = item.id === theme;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    onChangeTheme(item.id);
                                                }}
                                                className={`h-8 w-8 rounded-full border ${isActive ? 'ring-2 ring-black/40' : 'border-black/10'}`}
                                                title={item.label}
                                                style={{
                                                    background: `linear-gradient(180deg, ${item.main} 50%, ${item.nav} 50%)`,
                                                    transform: 'rotate(-45deg)',
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="w-full mx-auto pb-20">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
