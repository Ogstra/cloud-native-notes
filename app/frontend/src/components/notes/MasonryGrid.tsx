import {
    DndContext,
    DragOverlay,
    pointerWithin,
    useDroppable,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type CollisionDetection,
    type DragStartEvent,
    type DragOverEvent,
    type DragMoveEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { useState, useEffect, useLayoutEffect, useRef, Fragment, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Note } from '../../hooks/useNotes';
import SortableNoteCard from './SortableNoteCard';
import NoteCard from './NoteCard';

interface MasonryGridProps {
    notes: Note[];
    isTrash: boolean;
    isArchive: boolean;
    onArchive: (id: number) => void;
    onDelete: (id: number) => void;
    onRestore: (id: number) => void;
    onPermanentDelete: (id: number) => void;
    onPin: (note: Note) => void;
    onClick: (note: Note) => void;
    onReorder?: (notes: Note[]) => void;
    layoutKey?: string;
    sizeMode?: 'normal' | 'large';
    disableSavedLayout?: boolean;
}

interface ColumnProps {
    id: string;
    colIndex: number;
    items: number[];
    children: ReactNode;
}

function Column({ id, colIndex, items, children }: ColumnProps) {
    const { setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            data-col-index={colIndex}
            className="relative flex-1 flex flex-col gap-4 min-w-0"
        >
            <SortableContext
                id={id}
                items={items}
                strategy={verticalListSortingStrategy}
            >
                <div className="flex flex-col gap-4 min-h-[150px]">
                    {children}
                </div>
            </SortableContext>
        </div>
    );
}

export default function MasonryGrid({
    notes: propNotes,
    onReorder,
    layoutKey,
    sizeMode = 'normal',
    disableSavedLayout = false,
    ...props
}: MasonryGridProps) {
    const [activeId, setActiveId] = useState<number | null>(null);
    const getColumnCount = (width: number) => {
        if (sizeMode === 'large') {
            if (width >= 1280) return 2;
            if (width >= 1024) return 2;
            if (width >= 640) return 1;
            return 1;
        }
        if (width >= 1280) return 4;
        if (width >= 1024) return 3;
        return 2;
    };
    const [numCols, setNumCols] = useState(() => {
        if (typeof window === 'undefined') return 1;
        return getColumnCount(window.innerWidth);
    });
    const [placeholder, setPlaceholder] = useState<{ col: number; index: number; height: number } | null>(null);
    const placeholderRef = useRef<typeof placeholder>(null);
    const noteHeightsRef = useRef<Map<number, number>>(new Map());

    const [columns, setColumns] = useState<Note[][]>([[]]);
    const columnsRef = useRef(columns);
    const lastProjectedRef = useRef<string | null>(null);
    const pendingSyncRef = useRef(false);
    const lastNotesKeyRef = useRef('');
    const dragOriginRef = useRef<{ col: number; index: number; height: number } | null>(null);

    const storageKey = layoutKey ? `masonry-layout:${layoutKey}` : null;

    const loadLayout = () => {
        if (!storageKey || typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as { numCols: number; columns: number[][] };
            if (!parsed || !Array.isArray(parsed.columns)) return null;
            return parsed;
        } catch {
            return null;
        }
    };

    const saveLayout = (cols: Note[][]) => {
        if (!storageKey || typeof window === 'undefined') return;
        try {
            const payload = {
                numCols,
                columns: cols.map((col) => col.map((note) => note.id)),
            };
            window.localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {
        }
    };

    const estimateNoteHeight = (note: Note) => {
        const base = 140;
        const title = note.title?.trim() ?? '';
        const text = note.content?.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim() ?? '';
        const lengthScore = Math.min(500, (title.length * 4) + (text.length * 0.6));
        const checklistScore = (note.content?.match(/data-type="taskItem"/g)?.length ?? 0) * 18;
        return base + lengthScore + checklistScore;
    };

    const getDistributionHeight = (note: Note) => {
        return noteHeightsRef.current.get(note.id) ?? estimateNoteHeight(note);
    };

    // Greedy column fill by estimated height to keep columns balanced.
    const distributeByMinHeight = (list: Note[], colsCount: number, seed?: Note[][]) => {
        const cols = seed ? seed.map((col) => [...col]) : Array.from({ length: colsCount }, () => []);
        const heights = cols.map((col) => col.reduce((sum, note) => sum + getDistributionHeight(note), 0));
        list.forEach((note) => {
            let target = 0;
            for (let i = 1; i < heights.length; i += 1) {
                if (heights[i] < heights[target]) target = i;
            }
            cols[target].push(note);
            heights[target] += getDistributionHeight(note);
        });
        return cols;
    };

    // Shift columns left so there are no empty gaps.
    const compactColumns = (cols: Note[][]) => {
        const nonEmpty = cols.filter((col) => col.length > 0);
        const padded = [...nonEmpty];
        while (padded.length < numCols) padded.push([]);
        return padded;
    };

    useEffect(() => {
        columnsRef.current = columns;
    }, [columns]);

    useEffect(() => {
        const updateColumns = () => {
            setNumCols(getColumnCount(window.innerWidth));
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, [sizeMode]);

    useLayoutEffect(() => {
        if (activeId) return;

        const notesKey = propNotes.map((note) => note.id).join('|');
        const columnCountChanged = columnsRef.current.length !== numCols;

        if (disableSavedLayout) {
            const newCols = distributeByMinHeight(propNotes, numCols);
            const compacted = compactColumns(newCols);
            lastNotesKeyRef.current = notesKey;
            columnsRef.current = compacted;
            pendingSyncRef.current = false;
            setColumns(compacted);
            return;
        }

        // Avoid reflow flicker while persisting a drag reorder.
        if (pendingSyncRef.current && !columnCountChanged) {
            if (notesKey !== lastNotesKeyRef.current) {
                return;
            }
            pendingSyncRef.current = false;

            const noteMap = new Map(propNotes.map((note) => [note.id, note]));
            const updatedCols = columnsRef.current.map((col) =>
                col
                    .map((note) => noteMap.get(note.id))
                    .filter((note): note is Note => Boolean(note))
            );

            columnsRef.current = updatedCols;
            setColumns(updatedCols);
            return;
        }

        const savedLayout = loadLayout();
        if (savedLayout && savedLayout.numCols === numCols) {
            const noteMap = new Map(propNotes.map((note) => [note.id, note]));
            const used = new Set<number>();
            const layoutCols = savedLayout.columns
                .slice(0, numCols)
                .map((colIds) =>
                    colIds
                        .map((id) => noteMap.get(id))
                        .filter((note): note is Note => Boolean(note))
                );

            layoutCols.forEach((col) => col.forEach((note) => used.add(note.id)));

            // Preserve saved order and backfill any new notes.
            const remaining = propNotes.filter((note) => !used.has(note.id));
            const mergedCols = distributeByMinHeight(remaining, numCols, layoutCols);
            const compacted = compactColumns(mergedCols);

            lastNotesKeyRef.current = notesKey;
            columnsRef.current = compacted;
            pendingSyncRef.current = false;
            setColumns(compacted);
            saveLayout(compacted);
            return;
        }

        const newCols = distributeByMinHeight(propNotes, numCols);
        const compacted = compactColumns(newCols);
        lastNotesKeyRef.current = notesKey;
        columnsRef.current = compacted;
        pendingSyncRef.current = false;
        setColumns(compacted);
        saveLayout(compacted);
    }, [propNotes, numCols, activeId, sizeMode]);

    useEffect(() => {
        if (activeId) return;
        const map = new Map(noteHeightsRef.current);
        propNotes.forEach((note) => {
            const el = document.getElementById(String(note.id));
            if (el) {
                map.set(note.id, el.getBoundingClientRect().height);
            }
        });
        noteHeightsRef.current = map;
    }, [propNotes, columns, activeId]);


    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const pointerY = useRef<number>(0);
    const dragStartPointerY = useRef<number | null>(null);

    const findContainerIn = (cols: Note[][], id: number | string): number | undefined => {
        if (typeof id === 'string' && id.startsWith('col-')) {
            const idx = parseInt(id.replace('col-', ''), 10);
            return Number.isNaN(idx) ? undefined : idx;
        }
        const numericId = typeof id === 'number' ? id : Number(id);
        const colIdx = cols.findIndex((col) => col.some((n) => n.id === numericId));
        return colIdx !== -1 ? colIdx : undefined;
    };

    const getIndexForColumn = (
        cols: Note[][],
        columnIndex: number,
        cursorY: number,
        activeNoteId?: number
    ) => {
        const items = (cols[columnIndex] ?? []).filter((note) => note.id !== activeNoteId);
        let index = items.length;
        for (let i = 0; i < items.length; i++) {
            const el = document.getElementById(String(items[i].id));
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            if (cursorY < center) {
                index = i;
                break;
            }
        }
        return index;
    };

    // Compute a live preview of where the dragged note should land based on cursor Y.
    const projectColumns = (
        prev: Note[][],
        activeId: number,
        over: DragOverEvent['over'] | DragEndEvent['over'],
        cursorY: number
    ) => {
        if (!over) {
            return { nextCols: prev, projectedKey: null as string | null, changed: false, overContainer: undefined as number | undefined };
        }

        const overId = over.id;
        const activeContainer = findContainerIn(prev, activeId);
        let overContainer =
            over.data.current?.sortable?.containerId
                ? findContainerIn(prev, over.data.current.sortable.containerId as string)
                : findContainerIn(prev, overId as string | number);

        if (activeContainer === undefined || overContainer === undefined) {
            return { nextCols: prev, projectedKey: null, changed: false, overContainer };
        }

        const activeItems = prev[activeContainer];
        const overItems = prev[overContainer];
        const activeIndex = activeItems.findIndex((n) => n.id === activeId);
        if (activeIndex === -1) {
            return { nextCols: prev, projectedKey: null, changed: false, overContainer };
        }

        let newIndex = -1;
        const overIndex = overItems.findIndex((n) => n.id === overId);
        const columnNode = document.querySelector(`[data-col-index="${overContainer}"]`) as HTMLElement | null;
        if (columnNode) {
            const rect = columnNode.getBoundingClientRect();
            const bottomZone = Math.min(rect.height, Math.max(60, rect.height * 0.25));
            if (cursorY >= rect.bottom - bottomZone && cursorY <= rect.bottom + 240) {
                newIndex = overItems.length;
            }
        }

        if (newIndex === -1 && typeof overId === 'string' && overId.startsWith('col-')) {
            newIndex = getIndexForColumn(prev, overContainer, cursorY, activeId);
        } else if (newIndex === -1 && overIndex >= 0) {
            const overRect = document.getElementById(String(overId))?.getBoundingClientRect();
            const overCenter = overRect
                ? overRect.top + overRect.height / 2
                : over.rect.top + over.rect.height / 2;
            const insertAfter = cursorY > overCenter + 4;
            newIndex = overIndex + (insertAfter ? 1 : 0);
        } else if (newIndex === -1) {
            newIndex = getIndexForColumn(prev, overContainer, cursorY, activeId);
        }

        if (newIndex === -1 && cursorY > window.innerHeight) {
            newIndex = overItems.length;
        }

        if (newIndex < 0) newIndex = 0;
        if (newIndex > overItems.length) newIndex = overItems.length;

        if (activeContainer === overContainer) {
            if (newIndex > activeIndex) {
                newIndex -= 1;
            }
            if (newIndex === activeIndex) {
                return { nextCols: prev, projectedKey: `${overContainer}:${newIndex}`, changed: false, overContainer };
            }
            const newCols = [...prev];
            newCols[activeContainer] = arrayMove(activeItems, activeIndex, newIndex);
            return { nextCols: newCols, projectedKey: `${overContainer}:${newIndex}`, changed: true, overContainer };
        }

        const nextCols = prev.map((col, index) => {
            if (index === activeContainer) {
                return [
                    ...col.slice(0, activeIndex),
                    ...col.slice(activeIndex + 1),
                ];
            }
            if (index === overContainer) {
                return [
                    ...col.slice(0, newIndex),
                    activeItems[activeIndex],
                    ...col.slice(newIndex),
                ];
            }
            return col;
        });

        return { nextCols, projectedKey: `${overContainer}:${newIndex}`, changed: true, overContainer };
    };

    const collisionDetection: CollisionDetection = (args) => {
        // Prefer pointer hits; fall back to nearest column by X position.
        const collisions = pointerWithin(args);
        if (collisions.length) return collisions;
        if (!args.pointerCoordinates) return [];

        const { droppableContainers, droppableRects, pointerCoordinates } = args;
        const columnCollisions = droppableContainers
            .filter((container) => typeof container.id === 'string' && String(container.id).startsWith('col-'))
            .map((container) => {
                const rect = droppableRects.get(container.id);
                if (!rect) return null;
                const withinX = pointerCoordinates.x >= rect.left && pointerCoordinates.x <= rect.right;
                if (!withinX) return null;
                const centerX = rect.left + rect.width / 2;
                const distance = Math.abs(pointerCoordinates.x - centerX);
                return { id: container.id, data: { droppableContainer: container, value: distance } };
            })
            .filter(Boolean) as { id: string; data: { droppableContainer: any; value: number } }[];

        columnCollisions.sort((a, b) => a.data.value - b.data.value);
        return columnCollisions;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const activeId = event.active.id as number;
        setActiveId(activeId);
        lastProjectedRef.current = null;
        const originCol = findContainerIn(columnsRef.current, activeId);
        if (originCol !== undefined) {
            const originIndex = columnsRef.current[originCol].findIndex((n) => n.id === activeId);
            if (originIndex >= 0) {
                const el = document.getElementById(String(activeId));
                const height = el?.getBoundingClientRect().height ?? 0;
                dragOriginRef.current = { col: originCol, index: originIndex, height };
            } else {
                dragOriginRef.current = null;
            }
        } else {
            dragOriginRef.current = null;
        }
        placeholderRef.current = null;
        setPlaceholder(null);
        const activator = event.activatorEvent as MouseEvent | PointerEvent | TouchEvent | null;
        if (activator) {
            if ('touches' in activator && activator.touches.length > 0) {
                dragStartPointerY.current = activator.touches[0].clientY;
            } else if ('clientY' in activator) {
                dragStartPointerY.current = activator.clientY;
            }
        }
        if (dragStartPointerY.current !== null) {
            pointerY.current = dragStartPointerY.current;
        }
    };

    const handleDragMove = (event: DragMoveEvent) => {
        if (dragStartPointerY.current === null) return;
        pointerY.current = dragStartPointerY.current + event.delta.y;
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as number;
        const cursorY =
            dragStartPointerY.current !== null
                ? pointerY.current
                : over.rect.top + over.rect.height / 2;

        const currentCols = columnsRef.current;
        const { nextCols, projectedKey, changed, overContainer } = projectColumns(currentCols, activeId, over, cursorY);
        const origin = dragOriginRef.current;
        const nextPlaceholder =
            origin && overContainer !== undefined && overContainer !== origin.col
                ? origin
                : null;
        if (
            (nextPlaceholder?.col !== placeholderRef.current?.col) ||
            (nextPlaceholder?.index !== placeholderRef.current?.index)
        ) {
            placeholderRef.current = nextPlaceholder;
            setPlaceholder(nextPlaceholder);
        }

        if (!changed) return;
        if (projectedKey && lastProjectedRef.current === projectedKey) return;
        lastProjectedRef.current = projectedKey;
        columnsRef.current = nextCols;
        setColumns(nextCols);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        const activeId = active.id as number;
        const cursorY = dragStartPointerY.current !== null ? pointerY.current : null;
        if (over && cursorY !== null) {
            const { nextCols, changed } = projectColumns(columnsRef.current, activeId, over, cursorY);
            if (changed) {
                columnsRef.current = nextCols;
            }
        }
        const compacted = compactColumns(columnsRef.current);
        columnsRef.current = compacted;
        setColumns(compacted);
        setActiveId(null);
        lastProjectedRef.current = null;
        dragStartPointerY.current = null;
        dragOriginRef.current = null;
        placeholderRef.current = null;
        setPlaceholder(null);
        saveLayout(columnsRef.current);

        if (!onReorder) return;
        pendingSyncRef.current = true;

        const currentCols = columnsRef.current;
        const maxRows = Math.max(...currentCols.map(c => c.length));
        const flatList: Note[] = [];
        for (let row = 0; row < maxRows; row++) {
            for (let col = 0; col < numCols; col++) {
                if (currentCols[col] && currentCols[col][row]) {
                    flatList.push(currentCols[col][row]);
                }
            }
        }
        lastNotesKeyRef.current = flatList.map((note) => note.id).join('|');
        onReorder(flatList);
    };

    const findActiveNote = () => {
        for (const col of columns) {
            const found = col.find(n => n.id === activeId);
            if (found) return found;
        }
        return propNotes.find(n => n.id === activeId);
    };
    const draggingParams = activeId ? findActiveNote() : null;


    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 items-start">
                {columns.map((columnNotes, colIndex) => (
                    <Column
                        key={colIndex}
                        id={`col-${colIndex}`}
                        colIndex={colIndex}
                        items={columnNotes.map((n) => n.id)}
                    >
                        {columnNotes.map((note, index) => (
                            <Fragment key={note.id}>
                                {placeholder && placeholder.col === colIndex && placeholder.index === index && (
                                    <div
                                        className="opacity-0 pointer-events-none"
                                        style={{ height: placeholder.height }}
                                    />
                                )}
                                <SortableNoteCard
                                    note={note}
                                    sizeMode={sizeMode}
                                    {...props}
                                />
                            </Fragment>
                        ))}
                        {placeholder && placeholder.col === colIndex && placeholder.index >= columnNotes.length && (
                            <div
                                className="opacity-0 pointer-events-none"
                                style={{ height: placeholder.height }}
                            />
                        )}
                    </Column>
                ))}
            </div>

            {createPortal(
                <DragOverlay>
                    {draggingParams ? (
                        <NoteCard
                            note={draggingParams}
                            sizeMode={sizeMode}
                            {...props}
                            isDragging
                            className="cursor-grabbing rounded-2xl overflow-hidden"
                            style={{
                                width: '100%',
                                boxShadow: 'none',
                            }}
                        />
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
