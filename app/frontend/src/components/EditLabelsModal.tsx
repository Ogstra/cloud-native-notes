import { X, Trash2, Plus, Check, Tag, GripVertical } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../lib/api';
import type { Category } from '../hooks/useCategories';
import { clsx } from 'clsx';

interface EditLabelsModalProps {
    onClose: () => void;
    categories: Category[];
    refreshCategories: () => void;
    onReorder: (nextOrder: Category[]) => void;
    onColorChange: (id: number, color: string) => void;
}

const LABEL_COLORS = [
    'transparent',
    'white',
    'red',
    'orange',
    'yellow',
    'green',
    'teal',
    'blue',
    'purple',
    'pink',
];

const NOTE_COLOR_CLASSES: Record<string, string> = {
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

function SortableLabelRow({
    cat,
    isEditing,
    isColorOpen,
    onDelete,
    onEdit,
    onToggleColor,
    onColorSelect,
    children,
}: {
    cat: Category;
    isEditing: boolean;
    isColorOpen: boolean;
    onDelete: () => void;
    onEdit: () => void;
    onToggleColor: () => void;
    onColorSelect: (color: string) => void;
    children: ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: cat.id, disabled: isEditing });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                backgroundColor: 'var(--panel-bg)',
                borderColor: 'var(--panel-border)',
            }}
            className="rounded-xl border px-3 py-2 shadow-sm"
        >
            <div
                className="flex items-center gap-2"
                {...attributes}
                {...listeners}
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!isEditing) onEdit();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-black/10"
                    title="Edit label"
                >
                    <Tag size={16} />
                </button>
                <span className="flex-1 min-w-0">{children}</span>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleColor();
                        }}
                        className={clsx(
                            "flex h-8 w-8 items-center justify-center rounded-lg border",
                            (cat.color && cat.color !== 'transparent' && cat.color !== 'white') ? NOTE_COLOR_CLASSES[cat.color] : ""
                        )}
                        style={(!cat.color || cat.color === 'transparent' || cat.color === 'white')
                            ? { backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }
                            : { borderColor: 'var(--card-border)' }}
                        title="Label color"
                    >
                        {(!cat.color || cat.color === 'transparent') && (
                            <div className="h-4 w-4 rounded-full border border-dashed border-black/30" />
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-black/10 hover:text-gray-900"
                        title="Delete label"
                    >
                        <Trash2 size={16} />
                    </button>
                    <div
                        className={isDragging ? 'text-gray-700' : 'text-gray-400'}
                        title="Drag to reorder"
                    >
                        <GripVertical size={16} />
                    </div>
                </div>
            </div>
            {isColorOpen && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {LABEL_COLORS.map((color) => {
                        const isTransparent = color === 'transparent';
                        const isActive = (cat.color ?? 'transparent') === color;
                        return (
                            <button
                                key={color}
                                type="button"
                                onClick={() => onColorSelect(color)}
                            className={clsx(
                                "h-6 w-6 rounded-full border flex items-center justify-center",
                                isTransparent || color === 'white' ? "shadow-sm" : NOTE_COLOR_CLASSES[color],
                                isActive && "ring-2 ring-black/30"
                            )}
                            style={isTransparent || color === 'white'
                                ? { backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }
                                : { borderColor: 'var(--card-border)' }}
                            title={isTransparent ? 'Transparent' : color}
                        >
                                {isTransparent && <div className="h-4 w-4 rounded-full border border-dashed border-black/20" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function EditLabelsModal({ onClose, categories, refreshCategories, onReorder, onColorChange }: EditLabelsModalProps) {
    const [newLabel, setNewLabel] = useState('');
    const [focusedLabel, setFocusedLabel] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [openColorId, setOpenColorId] = useState<number | null>(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const orderedIds = useMemo(() => categories.map((cat) => cat.id), [categories]);

    const createLabel = async () => {
        if (!newLabel.trim()) return;
        try {
            await api.post('/categories', { name: newLabel });
            setNewLabel('');
            refreshCategories();
        } catch (e) {
            console.error(e);
        }
    };

    const updateLabel = async (id: number, value?: string) => {
        const nextValue = (value ?? editValue).trim();
        if (!nextValue) return;
        try {
            await api.put(`/categories/${id}`, { name: nextValue });
            setFocusedLabel(null);
            refreshCategories();
        } catch (e) {
            console.error(e);
        }
    };

    const deleteLabel = async (id: number) => {
        try {
            await api.delete(`/categories/${id}`);
            refreshCategories();
        } catch (e) {
            console.error(e);
        }
    };

    const handleFocus = (cat: Category) => {
        setFocusedLabel(cat.id);
        setEditValue(cat.name);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = categories.findIndex((cat) => cat.id === active.id);
        const newIndex = categories.findIndex((cat) => cat.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const nextOrder = arrayMove(categories, oldIndex, newIndex);
        onReorder(nextOrder);
    };

    return createPortal(
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4">
            <div
                className="flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-2xl border shadow-2xl"
                style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
            >
                <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--panel-border)' }}>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Edit labels</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-500 hover:bg-black/10 hover:text-gray-900"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 pt-4">
                    <div className="flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm" style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}>
                        <Plus size={18} className="text-gray-500" />
                        <input
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder="Create new label"
                            maxLength={15}
                            className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
                            onKeyDown={(e) => e.key === 'Enter' && createLabel()}
                        />
                        {newLabel && (
                            <button
                                type="button"
                                onClick={createLabel}
                                className="rounded-full p-1.5 text-gray-600 hover:bg-black/10"
                            >
                                <Check size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                            {categories.map((cat) => {
                                const isEditing = focusedLabel === cat.id;
                                return (
                                    <SortableLabelRow
                                        key={cat.id}
                                        cat={cat}
                                        isEditing={isEditing}
                                        isColorOpen={openColorId === cat.id}
                                        onDelete={() => deleteLabel(cat.id)}
                                        onEdit={() => handleFocus(cat)}
                                        onToggleColor={() => setOpenColorId(openColorId === cat.id ? null : cat.id)}
                                        onColorSelect={(color) => {
                                            onColorChange(cat.id, color);
                                            setOpenColorId(null);
                                        }}
                                    >
                                        {isEditing ? (
                                            <input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                maxLength={15}
                                                className="w-full bg-transparent text-sm font-medium text-gray-800 outline-none"
                                                autoFocus
                                                onBlur={(e) => updateLabel(cat.id, e.currentTarget.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') updateLabel(cat.id, e.currentTarget.value);
                                                }}
                                                onPointerDown={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <div
                                                onClick={() => handleFocus(cat)}
                                                className="truncate text-sm font-medium text-gray-700"
                                            >
                                                {cat.name}
                                            </div>
                                        )}
                                    </SortableLabelRow>
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>

                <div className="flex items-center justify-end border-t px-5 py-3" style={{ borderColor: 'var(--panel-border)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-black/5 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-black/10"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
