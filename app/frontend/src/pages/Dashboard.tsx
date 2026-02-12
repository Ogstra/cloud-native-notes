import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

import AppLayout from '../layouts/AppLayout';
import NoteGrid from '../components/notes/NoteGrid';
import NoteModal from '../components/NoteModal';
import EditLabelsModal from '../components/EditLabelsModal';

import type { Note } from '../hooks/useNotes';
import { useNotes } from '../hooks/useNotes';
import { useCategories } from '../hooks/useCategories';

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('notes');
    const [search, setSearch] = useState('');
    const [mainScrollElement, setMainScrollElement] = useState<HTMLDivElement | null>(null);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);
    const [showLabelsModal, setShowLabelsModal] = useState(false);
    const [masonrySize, setMasonrySize] = useState<'normal' | 'large'>(() => {
        if (typeof window === 'undefined') return 'normal';
        const stored = window.localStorage.getItem('masonrySize');
        return stored === 'large' ? 'large' : 'normal';
    });
    const [theme, setTheme] = useState<'light' | 'sand' | 'mist' | 'blush' | 'mint'>(() => {
        if (typeof window === 'undefined') return 'sand';
        const stored = window.localStorage.getItem('ogsTheme');
        return stored === 'sand' || stored === 'mist' || stored === 'blush' || stored === 'mint'
            ? stored
            : 'sand';
    });

    const { categories, fetchCategories, reorderCategories, setCategoryColor } = useCategories();
    const {
        notes,
        fetchNotes,
        hasNextPage,
        loading,
        updateNote,
        archiveNote,
        deleteNote,
        restoreNote,
        permanentDelete,
        reorderNotes
    } = useNotes();

    useEffect(() => {
        const categoryIds = activeTab.startsWith('cat-')
            ? [Number(activeTab.split('-')[1])]
            : selectedCategoryIds;
        fetchNotes(activeTab, search, false, categoryIds);
    }, [activeTab, search, selectedCategoryIds]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('masonrySize', masonrySize);
        }
    }, [masonrySize]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('ogsTheme', theme);
        }
    }, [theme]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const root = document.body;
        root.classList.remove('theme-light', 'theme-sand', 'theme-mist', 'theme-blush', 'theme-mint');
        root.classList.add(`theme-${theme}`);
    }, [theme]);

    const observerTarget = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasNextPage && !loading) {
                    const categoryIds = activeTab.startsWith('cat-')
                        ? [Number(activeTab.split('-')[1])]
                        : selectedCategoryIds;
                    fetchNotes(activeTab, search, true, categoryIds);
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [observerTarget, hasNextPage, loading, activeTab, search, selectedCategoryIds]);

    const getPageTitle = () => {
        if (activeTab === 'notes') return 'OGS Notes';
        if (activeTab === 'archive') return 'Archive';
        if (activeTab === 'trash') return 'Trash';
        if (activeTab.startsWith('cat-')) {
            const cat = categories.find(c => `cat - ${c.id} ` === activeTab);
            return cat ? `# ${cat.name} ` : 'Category';
        }
        return 'Dashboard';
    };

    const isTrash = activeTab === 'trash';

    const handleRefresh = () => {
        fetchNotes(activeTab);
    };

    const clearFocusAfterClose = () => {
        window.setTimeout(() => {
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
                active.blur();
            }
        }, 0);
    };

    const closeNoteModal = (shouldRefresh: boolean) => {
        setShowNoteModal(false);
        if (shouldRefresh) {
            handleRefresh();
        }
        clearFocusAfterClose();
    };

    const handleOpenCreate = () => {
        setEditingNote(undefined);
        setShowNoteModal(true);
    };


    const handlePin = async (note: Note) => {
        await updateNote(note.id, { isPinned: !note.isPinned });
        handleRefresh();
    };

    return (
        <AppLayout
            categories={categories}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenLabels={() => setShowLabelsModal(true)}
            title={getPageTitle()}
            onSearch={setSearch}
            searchValue={search}
            selectedCategoryIds={selectedCategoryIds}
            onToggleCategoryFilter={(id) => {
                setSelectedCategoryIds((prev) => (
                    prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                ));
            }}
            onClearCategoryFilters={() => setSelectedCategoryIds([])}
            masonrySize={masonrySize}
            onMasonrySizeChange={setMasonrySize}
            theme={theme}
            onChangeTheme={(next) => setTheme(next as typeof theme)}
            contentRef={setMainScrollElement}
        >

            <NoteGrid
                notes={notes}
                isTrash={isTrash}
                activeTab={activeTab}
                loading={loading}
                sizeMode={masonrySize}
                disableSavedLayout={
                    search.trim().length > 0
                    || selectedCategoryIds.length > 0
                    || activeTab.startsWith('cat-')
                }
                onArchive={async (id) => { await archiveNote(id); handleRefresh(); }}
                onDelete={async (id) => { await deleteNote(id); handleRefresh(); }}
                onRestore={async (id) => { await restoreNote(id); handleRefresh(); }}
                onPermanentDelete={async (id) => { await permanentDelete(id); handleRefresh(); }}
                onPin={handlePin}
                onClick={(note) => { setEditingNote(note); setShowNoteModal(true); }}
                onReorder={reorderNotes}
                scrollElement={mainScrollElement}
                transparentNoteId={showNoteModal ? editingNote?.id ?? null : null}
            />

            <div ref={observerTarget} className="h-px flex justify-center items-center">
                {loading && <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>}
            </div>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleOpenCreate}
                className={clsx(
                    "fixed bottom-8 right-8 p-4 rounded-2xl shadow-xl hover:shadow-2xl z-20 transition-colors text-white",
                    {
                        'bg-gray-900': theme === 'light',
                        'bg-amber-900': theme === 'sand',
                        'bg-slate-800': theme === 'mist',
                        'bg-rose-900': theme === 'blush',
                        'bg-emerald-900': theme === 'mint',
                    }
                )}
                title="Create new note"
            >
                <Plus size={32} />
            </motion.button>

            {showNoteModal && (
                <NoteModal
                    onClose={() => closeNoteModal(false)}
                    onSuccess={() => closeNoteModal(true)}
                    onDelete={async (id) => { await deleteNote(id); closeNoteModal(true); }}
                    onOpenLabels={() => setShowLabelsModal(true)}
                    categories={categories}
                    note={editingNote}
                />
            )}

            {showLabelsModal && (
                <EditLabelsModal
                    onClose={() => setShowLabelsModal(false)}
                    categories={categories}
                    refreshCategories={fetchCategories}
                    onReorder={reorderCategories}
                    onColorChange={setCategoryColor}
                />
            )}

        </AppLayout>
    );
}
