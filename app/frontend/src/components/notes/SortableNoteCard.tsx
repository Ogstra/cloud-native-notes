import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { Note } from '../../hooks/useNotes';
import NoteCard from './NoteCard';

interface SortableNoteCardProps {
    note: Note;
    isTrash: boolean;
    isArchive: boolean;
    onArchive: (id: number) => void;
    onDelete: (id: number) => void;
    onRestore: (id: number) => void;
    onPermanentDelete: (id: number) => void;
    onPin: (note: Note) => void;
    onClick: (note: Note) => void;
    sizeMode?: 'normal' | 'large';
}

export default function SortableNoteCard({
    note,
    ...props
}: SortableNoteCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: note.id,
        data: {
            type: 'Note',
            note,
        },
    });

    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 z-50 h-full rounded-2xl overflow-hidden bg-transparent"
            >
                <NoteCard
                    note={note}
                    {...props}
                    isGhost
                    sizeMode={props.sizeMode}
                    className="h-full"
                    style={{ boxShadow: 'none' }}
                />
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="h-full rounded-2xl overflow-hidden" id={String(note.id)}>
            <NoteCard
                note={note}
                {...props}
                dragProps={{ ...attributes, ...listeners }}
                sizeMode={props.sizeMode}
                className="h-full"
            />
        </div>
    );
}
