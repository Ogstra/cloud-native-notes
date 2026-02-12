import { Archive, Pin, Trash2, Undo2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { CSSProperties, HTMLAttributes } from 'react';
import { forwardRef } from 'react';
import type { Note } from '../../hooks/useNotes';

interface NoteCardProps {
    note: Note;
    isTrash: boolean;
    isArchive: boolean;
    onArchive: (id: number) => void;
    onDelete: (id: number) => void;
    onRestore: (id: number) => void;
    onPermanentDelete: (id: number) => void;
    onPin: (note: Note) => void;
    onClick: (note: Note) => void;
    dragProps?: HTMLAttributes<HTMLElement>;
    isDragging?: boolean;
    isGhost?: boolean;
    style?: CSSProperties;
    className?: string;
    isTransparent?: boolean;
    sizeMode?: 'normal' | 'large';
}

const NOTE_COLORS: Record<string, string> = {
    white: 'bg-note-white',
    red: 'bg-note-red',
    orange: 'bg-note-orange',
    yellow: 'bg-note-yellow',
    green: 'bg-note-green',
    teal: 'bg-note-teal',
    blue: 'bg-note-blue',
    purple: 'bg-note-purple',
    pink: 'bg-note-pink',
};

const extractText = (html: string) =>
    html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const getPlainText = (html: string) => extractText(html);

const NoteCard = forwardRef<HTMLElement, NoteCardProps>(function NoteCard(
    {
        note,
        isTrash,
        isArchive,
        onArchive,
        onDelete,
        onRestore,
        onPermanentDelete,
        onPin,
        onClick,
        dragProps,
        isDragging,
        isGhost,
        style,
        className,
        isTransparent,
        sizeMode = 'normal',
    },
    ref,
) {

    const colorClass = NOTE_COLORS[note.color] ?? NOTE_COLORS.white;
    const isTransparentCard = !note.color || note.color === 'white' || note.color === 'transparent';
    const plainText = note.content ? getPlainText(note.content) : '';
    const hasContent = plainText.length > 0;

    const noteColorClass = NOTE_COLORS[note.color] ?? NOTE_COLORS.white;
    const resolveLabelColorClass = (labelColor?: string) => {
        if (!labelColor || labelColor === 'transparent') return '';
        return NOTE_COLORS[labelColor] ?? noteColorClass;
    };

    const showArchive = !isTrash && !isArchive;
    const showRestore = isTrash || isArchive;
    const showDelete = !isTrash;
    const showPermanentDelete = isTrash;
    const showPin = !isTrash && !isArchive;
    const showFooterPin = showPin && !note.isPinned;

    const {
        onKeyDown: onDragKeyDown,
        onPointerDown: onDragPointerDown,
        tabIndex: dragTabIndex,
        role: dragRole,
        ...restDragProps
    } = dragProps ?? {};

    return (
        <article
            ref={ref}
            style={style}
            className={clsx(
                className,
                isGhost && 'pointer-events-none opacity-60',
                isTransparent && 'opacity-0',
                isDragging && !isGhost && 'shadow-2xl'
            )}
        >
            <div
                role={dragRole ?? 'button'}
                tabIndex={dragTabIndex ?? 0}
                onClick={() => onClick(note)}
                onKeyDown={(e) => {
                    onDragKeyDown?.(e);
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onClick(note);
                    }
                }}
                onPointerDown={(e) => {
                    onDragPointerDown?.(e);
                }}
                {...restDragProps}
                className={clsx(
                    'group relative cursor-pointer rounded-2xl border border-gray-200/80 shadow-sm transition-all',
                    sizeMode === 'large' ? 'p-6 text-[15px]' : 'p-4',
                    'hover:-translate-y-0.5 hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                    !isTransparentCard && colorClass,
                    isGhost && 'bg-transparent border-dashed border-gray-300/70 shadow-none hover:translate-y-0 hover:shadow-none'
                )}
                style={isTransparentCard ? { backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' } : undefined}
            >
                <div className={clsx(isGhost && 'invisible')}>
                    {note.isPinned && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onPin(note);
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={clsx(
                                "absolute right-3 top-3 flex items-center justify-center rounded-full bg-black/10 text-gray-800 ring-1 ring-black/10 shadow-sm",
                                sizeMode === 'large' ? 'h-8 w-8' : 'h-7 w-7'
                            )}
                            title="Unpin"
                        >
                            <Pin size={sizeMode === 'large' ? 16 : 14} fill="currentColor" />
                        </button>
                    )}

                    {note.title && (
                        <h3 className={clsx(
                            "font-semibold text-gray-900 leading-snug mb-2 break-words",
                            sizeMode === 'large' ? 'text-lg' : 'text-base'
                        )}>
                            {note.title}
                        </h3>
                    )}

                    {hasContent && (
                        <div
                            className={clsx(
                                "note-content note-content-collapsed relative mt-1 text-gray-700",
                                sizeMode === 'large' && 'text-[0.95rem]'
                            )}
                        >
                            <div
                                className="prose prose-sm max-w-none break-words"
                                dangerouslySetInnerHTML={{ __html: note.content }}
                            />
                        </div>
                    )}

                    {(note.categories.length > 0 || showArchive || showRestore || showDelete || showPin) && (
                        <div className="mt-4 flex items-end justify-between gap-2 text-xs text-gray-500">
                            <div className="flex flex-wrap items-end gap-2 min-w-0">
                                {note.categories.map((cat) => (
                                    <span
                                        key={cat.id}
                                        className={clsx(
                                            "rounded-full border px-2 py-0.5 text-xs text-gray-800 shadow-sm brightness-95",
                                            resolveLabelColorClass(cat.color)
                                        )}
                                        style={!cat.color || cat.color === 'transparent'
                                            ? { backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }
                                            : { borderColor: 'var(--card-border)' }}
                                    >
                                        #{cat.name}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-end gap-1 self-end">
                                {showFooterPin && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPin(note);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="rounded-md p-1.5 text-gray-600 hover:bg-black/10 hover:text-gray-900 ring-1 ring-transparent hover:ring-black/10"
                                        title={note.isPinned ? 'Unpin' : 'Pin'}
                                    >
                                        <Pin size={16} />
                                    </button>
                                )}

                                {showArchive && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onArchive(note.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="rounded-md p-1.5 text-gray-600 hover:bg-black/10 hover:text-gray-900 ring-1 ring-transparent hover:ring-black/10"
                                        title="Archive"
                                    >
                                        <Archive size={16} />
                                    </button>
                                )}

                                {showRestore && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRestore(note.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="rounded-md p-1.5 text-gray-600 hover:bg-black/10 hover:text-gray-900 ring-1 ring-transparent hover:ring-black/10"
                                        title="Restore"
                                    >
                                        <Undo2 size={16} />
                                    </button>
                                )}

                                {showDelete && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(note.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="rounded-md p-1.5 text-gray-600 hover:bg-black/10 hover:text-gray-900 ring-1 ring-transparent hover:ring-black/10"
                                        title="Move to trash"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}

                                {showPermanentDelete && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPermanentDelete(note.id);
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                                        title="Delete permanently"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
});

export default NoteCard;
