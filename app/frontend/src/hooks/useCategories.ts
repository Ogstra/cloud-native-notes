import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface Category {
    id: number;
    name: string;
    color?: string;
}

const STORAGE_KEY = 'categoriesOrder';
const COLOR_STORAGE_KEY = 'categoryColors';

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    const getStoredOrder = () => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const getStoredColors = () => {
        if (typeof window === 'undefined') return {};
        try {
            const raw = window.localStorage.getItem(COLOR_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    };

    const persistColors = (colors: Record<number, string>) => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(colors));
        } catch {
        }
    };

    const persistOrder = (ordered: Category[]) => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(ordered.map((cat) => cat.id)),
            );
        } catch {
        }
    };

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/categories');
            const fetched: Category[] = res.data;
            const storedOrder = getStoredOrder();
            const storedColors = getStoredColors();
            const fetchedIds = new Set(fetched.map((cat) => cat.id));
            Object.keys(storedColors).forEach((key) => {
                if (!fetchedIds.has(Number(key))) {
                    delete storedColors[key];
                }
            });
            const orderMap = new Map<number, number>();
            storedOrder.forEach((id: number, index: number) => {
                orderMap.set(id, index);
            });
            const sorted = [...fetched].sort((a, b) => {
                const aIndex = orderMap.get(a.id);
                const bIndex = orderMap.get(b.id);
                if (aIndex == null && bIndex == null) return 0;
                if (aIndex == null) return 1;
                if (bIndex == null) return -1;
                return aIndex - bIndex;
            });
            const withColors = sorted.map((cat) => ({
                ...cat,
                color: storedColors[cat.id] ?? 'transparent',
            }));
            persistOrder(sorted);
            persistColors(storedColors);
            setCategories(withColors);
        } catch (e) {
            console.error('Failed to fetch categories', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = async (name: string) => {
        await api.post('/categories', { name });
        fetchCategories();
    };

    const removeCategory = async (id: number) => {
        await api.delete(`/categories/${id}`);
        fetchCategories();
    };

    const reorderCategories = (nextOrder: Category[]) => {
        setCategories(nextOrder);
        persistOrder(nextOrder);
    };

    const setCategoryColor = (id: number, color: string) => {
        const storedColors = getStoredColors();
        storedColors[id] = color;
        persistColors(storedColors);
        setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, color } : cat)));
    };

    return {
        categories,
        loading,
        fetchCategories,
        addCategory,
        removeCategory,
        reorderCategories,
        setCategoryColor,
    };
}
