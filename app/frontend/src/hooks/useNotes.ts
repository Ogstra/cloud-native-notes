import { useState, useCallback, useRef } from 'react';
import api from '../lib/api';

export interface Note {
    id: number;
    title: string;
    content: string;
    color: string;
    isArchived: boolean;
    isDeleted: boolean;
    isPinned: boolean;
    categories: { id: number; name: string; color?: string }[];
    updatedAt: string;
}

const CATEGORY_COLOR_KEY = 'categoryColors';

export function useNotes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [cursor, setCursor] = useState<number | undefined>(undefined);
    const [hasNextPage, setHasNextPage] = useState(true);
    const requestIdRef = useRef(0);
    const lastQueryRef = useRef<string | null>(null);
    const notesCacheRef = useRef<Map<string, Note[]>>(new Map());

    const getCategoryColors = () => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = window.localStorage.getItem(CATEGORY_COLOR_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    };

    const applyCategoryColors = (items: Note[]) => {
        const colors = getCategoryColors();
        return items.map((note) => ({
            ...note,
            categories: note.categories.map((cat) => ({
                ...cat,
                color: colors[cat.id] ?? cat.color,
            })),
        }));
    };

    const fetchNotes = useCallback(async (
        activeTab: string,
        search?: string,
        isLoadMore = false,
        categoryIds?: number[],
    ) => {
        // Cache results per view to prevent flicker when switching tabs/filters.
        const queryKey = `${activeTab}|${search ?? ''}|${(categoryIds ?? []).join(',')}`;
        if (isLoadMore) {
            if (loading) return;
            if (!cursor) return;
        }
        if (!isLoadMore && lastQueryRef.current !== queryKey) {
            lastQueryRef.current = queryKey;
            setCursor(undefined);
            setHasNextPage(true);
            const cached = notesCacheRef.current.get(queryKey);
            if (cached) {
                setNotes(cached);
            } else {
                setNotes([]);
            }
        }
        const requestId = ++requestIdRef.current;
        setLoading(true);
        try {
            const params: Record<string, string | number | boolean | undefined> = { limit: 20 };
            if (activeTab === 'archive') params.isArchived = 'true';
            if (activeTab === 'trash') params.isDeleted = 'true';
            if (activeTab.startsWith('cat-')) params.categoryId = activeTab.split('-')[1];
            if (categoryIds && categoryIds.length > 0) params.categoryIds = categoryIds.join(',');
            if (search) params.search = search;

            if (search) params.search = search;

            if (isLoadMore) {
                params.cursor = cursor;
            }

            const res = await api.get('/notes', { params });
            const { items, nextCursor } = res.data;
            const coloredItems = applyCategoryColors(items);

            if (requestId !== requestIdRef.current) return;

            if (isLoadMore) {
                setNotes(prev => {
                    const next = [...prev, ...coloredItems];
                    notesCacheRef.current.set(queryKey, next);
                    return next;
                });
            } else {
                setNotes(coloredItems);
                notesCacheRef.current.set(queryKey, coloredItems);
            }

            setCursor(nextCursor);
            setHasNextPage(!!nextCursor);
        } catch (e) {
            console.error(e);
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [cursor, loading]);

    const createNote = async (data: Partial<Note>) => {
        await api.post('/notes', data);
    };

    const updateNote = async (id: number, data: Partial<Note>) => {
        await api.put(`/notes/${id}`, data);
    };

    const archiveNote = async (id: number) => {
        await api.put(`/notes/${id}`, { isArchived: true });
    };

    const deleteNote = async (id: number) => {
        await api.delete(`/notes/${id}`);
    };

    const restoreNote = async (id: number) => {
        await api.post(`/notes/${id}/restore`);
    };

    const permanentDelete = async (id: number) => {
        await api.delete(`/notes/${id}/permanent`);
    };

    const reorderNotes = async (reorderedNotes: Note[]) => {
        setNotes(reorderedNotes);

        const payload = reorderedNotes.map((n, index) => ({ id: n.id, position: index }));
        try {
            await api.put('/notes/reorder', { notes: payload });
        } catch (e) {
            console.error('Failed to save order', e);
            fetchNotes('notes');
        }
    };

    return {
        notes,
        loading,
        fetchNotes,
        hasNextPage,
        activeCursor: cursor,
        createNote,
        updateNote,
        reorderNotes,
        archiveNote,
        deleteNote,
        restoreNote,
        permanentDelete
    };
}
