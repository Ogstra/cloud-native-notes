/* eslint-disable react-hooks/set-state-in-effect */
import { useForm } from 'react-hook-form';
import {
    Check,
    Pin,
    Palette,
    Tag,
    Settings,
    Plus,
    ChevronUp,
    ChevronDown,
    Bold,
    Italic,
    Strikethrough,
    List,
    ListOrdered,
    CheckSquare,
    Undo,
    Redo,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import clsx from 'clsx';
import type { Note } from '../hooks/useNotes';
import NoteEditor from './NoteEditor';
import type { Editor } from '@tiptap/react';

interface NoteModalProps {
    onClose: () => void;
    onSuccess: () => void;
    onOpenLabels: () => void;
    onDelete?: (id: number) => void;
    categories: { id: number; name: string; color?: string }[];
    note?: Note;
}

const colors = [
    'white', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'
];

import { createPortal } from 'react-dom';

type FormValues = {
    title: string;
    content: string;
};

const extractText = (html: string) =>
    html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export default function NoteModal({ onClose, onSuccess, onOpenLabels, onDelete, categories, note }: NoteModalProps) {
    const { register, handleSubmit, setValue } = useForm<FormValues>();

    const [selectedColor, setSelectedColor] = useState('white');
    const [selectedCats, setSelectedCats] = useState<number[]>([]);
    const MAX_LABELS = 5;
    const [isPinned, setIsPinned] = useState(false);
    const [activePanel, setActivePanel] = useState<'colors' | 'labels' | null>(null);
    const editorRef = useRef<Editor | null>(null);
    const [, forceEditorRender] = useState(0);
    const panelPosRef = useRef<{ left: number; top: number } | null>(null);
    const [panelPos, setPanelPos] = useState<{ left: number; top: number } | null>(null);
    const colorsBtnRef = useRef<HTMLButtonElement | null>(null);
    const labelsBtnRef = useRef<HTMLButtonElement | null>(null);
    const [labelQuery, setLabelQuery] = useState('');
    const labelSearchRef = useRef<HTMLInputElement | null>(null);
    const labelListRef = useRef<HTMLDivElement | null>(null);
    const [labelListHeight, setLabelListHeight] = useState<number>(0);

    useEffect(() => {
        if (note) {
            setValue('title', note.title);
            setValue('content', note.content);

            setSelectedColor(note.color);
            setSelectedCats(note.categories.map(c => c.id));
            setIsPinned(note.isPinned || false);
        }
    }, [note, setValue]);

    const toggleCat = (id: number) => {
        if (selectedCats.includes(id)) {
            setSelectedCats(selectedCats.filter(c => c !== id));
            return;
        }
        if (selectedCats.length >= MAX_LABELS) return;
        setSelectedCats([...selectedCats, id]);
    };

    const colorClass = `bg-note-${selectedColor}`;
    const isTransparentCard = !selectedColor || selectedColor === 'white' || selectedColor === 'transparent';
    const resolveLabelColorClass = (labelColor?: string) => {
        if (labelColor && labelColor !== 'transparent' && labelColor !== 'white') return `bg-note-${labelColor}`;
        return `bg-note-${selectedColor}`;
    };
    const resolvePopupLabelColorClass = (labelColor?: string) => {
        if (!labelColor || labelColor === 'transparent' || labelColor === 'white') return '';
        return `bg-note-${labelColor}`;
    };
    const editor = editorRef.current;

    const openPanelAt = (panel: 'colors' | 'labels', anchor: HTMLElement | null) => {
        if (!anchor) return;
        const anchorRect = anchor.getBoundingClientRect();
        const panelWidth = panel === 'labels' ? 320 : 320;
        const anchorCenter = anchorRect.left + anchorRect.width / 2;
        let left = anchorCenter - panelWidth / 2;
        const minLeft = 12;
        const maxLeft = Math.max(minLeft, window.innerWidth - panelWidth - 12);
        left = Math.min(Math.max(left, minLeft), maxLeft);
        const top = Math.max(12, anchorRect.top - 8);
        const next = { left, top };
        panelPosRef.current = next;
        setPanelPos(next);
        setActivePanel(panel);
    };

    const togglePanel = (panel: 'colors' | 'labels', anchor: HTMLElement | null) => {
        if (activePanel === panel) {
            setActivePanel(null);
            setPanelPos(null);
            return;
        }
        if (panel === 'labels') {
            setLabelQuery('');
        }
        openPanelAt(panel, anchor);
    };

    const onSubmit = async (data: FormValues) => {
        const titleValue = (data.title ?? '').trim();
        const contentValue = data.content ?? '';
        const contentText = extractText(contentValue);
        const isEmptyDraft = !note && !titleValue && !contentText;
        if (isEmptyDraft) {
            onClose();
            return;
        }
        const payload = {
            ...data,
            color: selectedColor,
            categoryIds: selectedCats,
            isPinned
        };

        try {
            if (note) {
                await api.put(`/notes/${note.id}`, payload);
            } else {
                await api.post('/notes', payload);
            }
            onSuccess();
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleSubmit(onSubmit)();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSubmit, onSubmit]);

    useEffect(() => {
        if (activePanel === 'labels') {
            window.setTimeout(() => {
                labelSearchRef.current?.focus();
            }, 0);
        }
    }, [activePanel]);

    useEffect(() => {
        if (activePanel !== 'labels') return;
        // Measure first 10 chips to lock popup height and avoid layout jumps.
        const frame = window.requestAnimationFrame(() => {
            const listNode = labelListRef.current;
            if (!listNode) return;
            const chips = Array.from(listNode.querySelectorAll('[data-label-chip="true"]')) as HTMLElement[];
            if (chips.length === 0) {
                setLabelListHeight(0);
                return;
            }
            const firstRect = chips[0].getBoundingClientRect();
            const targetIndex = Math.min(9, chips.length - 1);
            const targetRect = chips[targetIndex].getBoundingClientRect();
            const nextHeight = Math.ceil(targetRect.bottom - firstRect.top);
            setLabelListHeight(nextHeight);
        });
        return () => window.cancelAnimationFrame(frame);
    }, [activePanel, categories.length]);

    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(labelQuery.trim().toLowerCase()),
    );

    const scrollLabelList = (direction: 'up' | 'down') => {
        const node = labelListRef.current;
        if (!node) return;
        const delta = direction === 'up' ? -55 : 55;
        node.scrollBy({ top: delta, behavior: 'smooth' });
    };

    return createPortal(
        <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={clsx(
                    "note-modal-container rounded-2xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] h-[90vh] flex flex-col overflow-hidden border",
                    !isTransparentCard && colorClass
                )}
                style={isTransparentCard ? { backgroundColor: 'var(--main-bg)', borderColor: 'var(--card-border)' } : { borderColor: 'var(--card-border)' }}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0 overflow-hidden">
                    <div className="px-6 pt-5 flex items-start gap-4">
                        <input
                            {...register('title', { required: false })}
                            placeholder="Title"
                            className="text-2xl font-semibold bg-transparent border-none focus:ring-0 px-0 placeholder-gray-500 w-full"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsPinned(!isPinned)}
                                className={clsx(
                                    "p-2 rounded-full transition-colors",
                                    isPinned ? "text-gray-900 bg-black/10" : "text-gray-500 hover:text-gray-800"
                                )}
                                title={isPinned ? 'Unpin' : 'Pin'}
                            >
                                <Pin size={20} fill={isPinned ? "currentColor" : "none"} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 px-6 pt-3 pb-2">
                        <NoteEditor
                            key={note?.id || 'new'}
                            content={note?.content || ''}
                            onChange={(html) => setValue('content', html)}
                            placeholder="Take a note..."
                            showToolbar={false}
                            variant="minimal"
                            className="h-full bg-transparent"
                            contentClassName="px-0 pb-6"
                            editorClassName="prose prose-base max-w-none"
                            onReady={(instance) => { editorRef.current = instance; }}
                            onTransaction={() => forceEditorRender((value) => value + 1)}
                        />
                    </div>

                    {selectedCats.length > 0 && (
                        <div className="px-6 pb-2 flex flex-wrap gap-2">
                            {categories
                                .filter((cat) => selectedCats.includes(cat.id))
                                .map((cat) => (
                                    <span
                                        key={cat.id}
                                        className={clsx(
                                            "rounded-full border px-2.5 py-0.5 text-xs text-gray-800 shadow-sm brightness-95",
                                            resolveLabelColorClass(cat.color)
                                        )}
                                        style={!cat.color || cat.color === 'transparent' || cat.color === 'white'
                                            ? { backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }
                                            : { borderColor: 'var(--card-border)' }}
                                    >
                                        #{cat.name}
                                    </span>
                                ))}
                        </div>
                    )}

                    <div className="relative mt-auto border-t border-black/10 px-4 py-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-gray-600">
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().toggleBold().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        editor?.isActive('bold') && "bg-black/10 text-gray-900 ring-1 ring-black/20"
                                    )}
                                    title="Bold"
                                >
                                    <Bold size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        editor?.isActive('italic') && "bg-black/10 text-gray-900 ring-1 ring-black/20"
                                    )}
                                    title="Italic"
                                >
                                    <Italic size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        editor?.isActive('strike') && "bg-black/10 text-gray-900 ring-1 ring-black/20"
                                    )}
                                    title="Strikethrough"
                                >
                                    <Strikethrough size={18} />
                                </button>
                                <span className="mx-1 h-5 w-px bg-black/10" />
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        editor?.isActive('bulletList') && "bg-black/10 text-gray-900 ring-1 ring-black/20"
                                    )}
                                    title="Bullet list"
                                >
                                    <List size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        editor?.isActive('orderedList') && "bg-black/10 text-gray-900 ring-1 ring-black/20"
                                    )}
                                    title="Ordered list"
                                >
                                    <ListOrdered size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().toggleTaskList().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        editor?.isActive('taskList') && "bg-black/10 text-gray-900 ring-1 ring-black/20"
                                    )}
                                    title="Checklist"
                                >
                                    <CheckSquare size={18} />
                                </button>
                                <span className="mx-1 h-5 w-px bg-black/10" />
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().undo().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        !editor?.can().undo() && "opacity-40"
                                    )}
                                    title="Undo"
                                    disabled={!editor?.can().undo()}
                                >
                                    <Undo size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => editor?.chain().focus().redo().run()}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        !editor?.can().redo() && "opacity-40"
                                    )}
                                    title="Redo"
                                    disabled={!editor?.can().redo()}
                                >
                                    <Redo size={18} />
                                </button>
                                <span className="mx-2 h-5 w-px bg-black/10" />
                                <button
                                    type="button"
                                    onClick={() => togglePanel('colors', colorsBtnRef.current)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        activePanel === 'colors' && "bg-white/70 text-gray-900"
                                    )}
                                    title="Color"
                                    ref={colorsBtnRef}
                                >
                                    <Palette size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => togglePanel('labels', labelsBtnRef.current)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    className={clsx(
                                        "rounded-md p-2 hover:bg-black/10",
                                        activePanel === 'labels' && "bg-white/70 text-gray-900"
                                    )}
                                    title="Labels"
                                    ref={labelsBtnRef}
                                >
                                    <Tag size={18} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {note && onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(note.id)}
                                        className="rounded-lg bg-black/5 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-black/10 hover:shadow-md"
                                    >
                                        Delete
                                    </button>
                                )}
                                {!note && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="rounded-lg bg-black/5 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-black/10 hover:shadow-md"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button type="submit" className="rounded-lg bg-black/5 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-black/10 hover:shadow-md">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

            </div>
            {activePanel === 'colors' && panelPos && (
                <div
                    className="fixed z-[120] flex gap-2 rounded-xl border p-2 shadow-lg backdrop-blur"
                    style={{
                        left: panelPos.left,
                        top: panelPos.top,
                        transform: 'translateY(-100%)',
                        backgroundColor: 'var(--panel-bg)',
                        borderColor: 'var(--panel-border)',
                    }}
                >
                    {colors.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={clsx(
                                "h-8 w-8 rounded-full border border-black/10 flex items-center justify-center",
                                c !== 'white' && `bg-note-${c}`
                            )}
                            style={c === 'white' ? { backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' } : undefined}
                            title={c}
                        >
                            {c === 'white' && (
                                <div className="relative h-full w-full rounded-full border border-red-500">
                                    <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[85%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-red-500" />
                                </div>
                            )}
                            {selectedColor === c && c !== 'white' && <Check size={14} className="text-gray-700" />}
                        </button>
                    ))}
                </div>
            )}
            {activePanel === 'labels' && panelPos && (
                <div
                    className="fixed z-[120] w-[320px] rounded-xl border p-3 shadow-lg backdrop-blur"
                    style={{
                        left: panelPos.left,
                        top: panelPos.top,
                        transform: 'translateY(-100%)',
                        backgroundColor: 'var(--panel-bg)',
                        borderColor: 'var(--panel-border)',
                    }}
                >
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                            Labels <span className="ml-1 text-gray-400">{selectedCats.length}/{MAX_LABELS}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setActivePanel(null);
                                setPanelPos(null);
                                onOpenLabels();
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            className="rounded-md p-1.5 text-gray-600 hover:bg-black/10 hover:text-gray-900"
                            title="Manage labels"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                    <div className="mb-2 flex items-center gap-2 rounded-lg border px-2 py-1" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                        <input
                            ref={labelSearchRef}
                            value={labelQuery}
                            onChange={(e) => setLabelQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && filteredCategories.length > 0) {
                                    e.preventDefault();
                                    toggleCat(filteredCategories[0].id);
                                }
                            }}
                            placeholder="Search labels"
                            className="w-full bg-transparent text-xs text-gray-700 outline-none ring-0 focus:ring-0 placeholder:text-gray-400"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setActivePanel(null);
                                setPanelPos(null);
                                onOpenLabels();
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            className="rounded-md p-1 text-gray-600 hover:bg-black/10 hover:text-gray-900"
                            title="Add label"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="flex items-start gap-0">
                        <div className="flex-1" style={labelListHeight ? { maxHeight: `${Math.round(labelListHeight * 0.85)}px`, height: `${Math.round(labelListHeight * 0.85)}px` } : undefined}>
                            <div
                                ref={labelListRef}
                                className="h-full overflow-y-auto px-2 py-1"
                            >
                                <div className="flex flex-wrap gap-2">
                                    {filteredCategories.map((cat) => {
                                        const isActive = selectedCats.includes(cat.id);
                                        const isDisabled = !isActive && selectedCats.length >= MAX_LABELS;
                                        return (
                                            <button
                                                data-label-chip="true"
                                                key={cat.id}
                                                type="button"
                                                onClick={() => toggleCat(cat.id)}
                                                className={clsx(
                                                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors text-gray-800 shadow-sm brightness-95",
                                                    resolvePopupLabelColorClass(cat.color),
                                                    isActive ? "ring-2 ring-black/30" : "",
                                                    isDisabled && "opacity-40 cursor-not-allowed"
                                                )}
                                                style={!cat.color || cat.color === 'transparent' || cat.color === 'white'
                                                    ? { backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }
                                                    : { borderColor: 'var(--card-border)' }}
                                                disabled={isDisabled}
                                            >
                                                <span className="truncate">#{cat.name}</span>
                                                {isActive && <Check size={12} />}
                                            </button>
                                        );
                                    })}
                                    {filteredCategories.length === 0 && (
                                        <div className="text-xs text-gray-500 px-1 py-2">No labels found</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => scrollLabelList('up')}
                                className="rounded-md p-1 text-gray-500 hover:bg-black/10"
                                title="Scroll up"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollLabelList('down')}
                                className="rounded-md p-1 text-gray-500 hover:bg-black/10"
                                title="Scroll down"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
