import type { Note } from '../../hooks/useNotes';
import MasonryGrid from './MasonryGrid';

interface NoteGridProps {
    notes: Note[];
    isTrash: boolean;
    activeTab: string;
    loading?: boolean;
    sizeMode?: 'normal' | 'large';
    disableSavedLayout?: boolean;
    onArchive: (id: number) => void;
    onDelete: (id: number) => void;
    onRestore: (id: number) => void;
    onPermanentDelete: (id: number) => void;
    onPin: (note: Note) => void;
    onClick: (note: Note) => void;
    onReorder?: (notes: Note[]) => void;
    onUpdate?: (id: number, content: string) => void;
    scrollElement?: HTMLDivElement | null;
    transparentNoteId?: number | null;
}

export default function NoteGrid({
    notes,
    isTrash,
    activeTab,
    loading,
    sizeMode = 'normal',
    disableSavedLayout = false,
    onArchive,
    onDelete,
    onRestore,
    onPermanentDelete,
    onPin,
    onClick,
    onReorder,
}: NoteGridProps) {
    const isNotesTab = activeTab === 'notes';

    const pinnedNotes = isNotesTab ? notes.filter((note) => note.isPinned) : [];
    const regularNotes = isNotesTab ? notes.filter((note) => !note.isPinned) : notes;

    const handleReorderPinned = (reorderedPinned: Note[]) => {
        if (!onReorder) return;
        const regular = notes.filter((note) => !note.isPinned);
        onReorder([...reorderedPinned, ...regular]);
    };

    const handleReorderRegular = (reorderedRegular: Note[]) => {
        if (!onReorder) return;
        const pinned = notes.filter((note) => note.isPinned);
        onReorder([...pinned, ...reorderedRegular]);
    };

    if (notes.length === 0 && !loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p className="text-lg font-medium">No notes found here</p>
            </div>
        );
    }

    const sectionCommonProps = {
        isTrash,
        isArchive: activeTab === 'archive',
        onArchive,
        onDelete,
        onRestore,
        onPermanentDelete,
        onPin,
        onClick,
        onReorder: isNotesTab ? undefined : onReorder,
    };

    return (
        <div className="mx-auto max-w-7xl px-2 sm:px-2 space-y-12">
            {isNotesTab ? (
                <>
                    <section className="space-y-4">
                        <div
                            className="text-xs font-semibold uppercase tracking-wider px-2"
                            style={{ color: 'var(--nav-muted)' }}
                        >
                            Pinned
                        </div>
                        {pinnedNotes.length > 0 && (
                            <MasonryGrid
                                notes={pinnedNotes}
                                layoutKey="notes-pinned"
                                sizeMode={sizeMode}
                                disableSavedLayout={disableSavedLayout}
                                {...sectionCommonProps}
                                onReorder={handleReorderPinned}
                            />
                        )}
                    </section>
                    <section className="space-y-4">
                        <div
                            className="text-xs font-semibold uppercase tracking-wider px-2"
                            style={{ color: 'var(--nav-muted)' }}
                        >
                            Others
                        </div>
                        <MasonryGrid
                            notes={regularNotes}
                            layoutKey="notes-regular"
                            sizeMode={sizeMode}
                            disableSavedLayout={disableSavedLayout}
                            {...sectionCommonProps}
                            onReorder={isNotesTab ? handleReorderRegular : onReorder}
                        />
                    </section>
                </>
            ) : (
                <section className="space-y-4">
                    <div
                        className="text-xs font-semibold uppercase tracking-wider px-2"
                        style={{ color: 'transparent' }}
                    >
                        Spacer
                    </div>
                    <MasonryGrid
                        notes={notes}
                        layoutKey={`tab-${activeTab}`}
                        sizeMode={sizeMode}
                        disableSavedLayout={disableSavedLayout}
                        {...sectionCommonProps}
                    />
                </section>
            )}
        </div>
    );
}
