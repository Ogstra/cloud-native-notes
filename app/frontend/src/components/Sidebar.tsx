import { Archive, Trash2, Home, Settings, Hash, X, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    categories: { id: number; name: string }[];
    openLabelModal?: () => void;
    userInitial: string;
    userName: string;
    onLogout: () => void;
    theme: string;
    onChangeTheme: (theme: string) => void;
    themes: { id: string; label: string; nav: string; main: string }[];
}

export default function Sidebar({
    isOpen,
    onClose,
    activeTab,
    setActiveTab,
    categories,
    openLabelModal,
    userInitial,
    userName,
    onLogout,
    theme,
    onChangeTheme,
    themes,
}: SidebarProps) {

    const isActive = (id: string) => activeTab === id;

    const navItems = [
        { id: 'notes', label: 'Notes', icon: Home },
        { id: 'archive', label: 'Archive', icon: Archive },
        { id: 'trash', label: 'Trash', icon: Trash2 },
    ];

    const themeActiveStyles: Record<string, string> = {
        light: 'bg-gray-900/10 text-gray-900',
        sand: 'bg-amber-950/10 text-amber-950',
        mist: 'bg-slate-800/10 text-slate-900',
        blush: 'bg-rose-950/10 text-rose-950',
        mint: 'bg-emerald-950/10 text-emerald-950',
    };

    const themeIconStyles: Record<string, string> = {
        light: 'text-gray-700',
        sand: 'text-amber-700',
        mist: 'text-slate-700',
        blush: 'text-rose-700',
        mint: 'text-emerald-700',
    };

    const activeStyle = themeActiveStyles[theme] || themeActiveStyles.light;
    const activeIconStyle = themeIconStyles[theme] || themeIconStyles.light;

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 lg:hidden transition-opacity backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside
                style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    color: 'var(--nav-text)',
                    borderColor: 'var(--nav-border)',
                }}
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-50 w-48 border-r",
                    "transform transition-transform duration-200 flex flex-col pt-4",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}>
                <div className="lg:hidden flex items-center justify-between px-4 mb-2">
                    <span className="text-sm font-semibold text-gray-700">OGS Notes</span>
                    <button onClick={onClose} style={{ color: 'var(--nav-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id); onClose(); }}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isActive(item.id)
                                    ? activeStyle
                                    : 'hover:bg-black/5'
                            )}
                        >
                            <item.icon size={20} className={isActive(item.id) ? activeIconStyle : ''} />
                            {item.label}
                        </button>
                    ))}

                    <div className="my-4 border-t mx-2" style={{ borderColor: 'var(--nav-border)' }}></div>

                    <div>
                        <div className="flex items-center justify-between px-3 mb-2 h-8">
                            <h3 className="text-xs font-semibold uppercase tracking-wider leading-none" style={{ color: 'var(--nav-muted)' }}>
                                Labels
                            </h3>
                            <button onClick={openLabelModal} className="flex items-center" style={{ color: 'var(--nav-muted)' }} title="Edit Labels">
                                <Settings size={16} />
                            </button>
                        </div>

                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => { setActiveTab(`cat-${cat.id}`); onClose(); }}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    isActive(`cat-${cat.id}`)
                                        ? activeStyle
                                        : 'hover:bg-black/5'
                                )}
                            >
                                <Hash size={20} className={isActive(`cat-${cat.id}`) ? activeIconStyle : ''} />
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="lg:hidden border-t p-3" style={{ borderColor: 'var(--nav-border)' }}>
                    <div className="mb-3">
                        <div className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--nav-muted)' }}>Theme</div>
                        <div className="flex flex-wrap gap-2">
                            {themes.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onChangeTheme(item.id)}
                                    className={`h-7 w-7 rounded-full border ${item.id === theme ? 'ring-2 ring-black/30' : 'border-black/10'}`}
                                    title={item.label}
                                    style={{
                                        background: `linear-gradient(180deg, ${item.main} 50%, ${item.nav} 50%)`,
                                        transform: 'rotate(-45deg)',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs select-none">
                                {userInitial}
                            </div>
                            <span className="text-sm truncate" style={{ color: 'var(--nav-muted)' }}>{userName}</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-1"
                            style={{ color: 'var(--nav-muted)' }}
                            title="Sign Out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
