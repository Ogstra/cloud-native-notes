import { useEditor, EditorContent, ReactNodeViewRenderer, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import ListItem from '@tiptap/extension-list-item';
import { keymap } from 'prosemirror-keymap';
import { TextSelection } from '@tiptap/pm/state';
import {
    Bold, Italic, Strikethrough, List, ListOrdered, CheckSquare,
    Undo, Redo
} from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';
import TaskItemComponent from './editor/TaskItemComponent';

interface NoteEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    editable?: boolean;
    className?: string;
    showToolbar?: boolean;
    contentClassName?: string;
    editorClassName?: string;
    variant?: 'default' | 'minimal';
    onReady?: (editor: Editor | null) => void;
    onTransaction?: () => void;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;

    const buttons = [
        { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), isActive: editor.isActive('bold'), title: 'Bold' },
        { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), isActive: editor.isActive('italic'), title: 'Italic' },
        { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), isActive: editor.isActive('strike'), title: 'Strike' },
        { type: 'divider' },
        { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), isActive: editor.isActive('bulletList'), title: 'Bullet List' },
        { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), isActive: editor.isActive('orderedList'), title: 'Ordered List' },
        { icon: CheckSquare, action: () => editor.chain().focus().toggleTaskList().run(), isActive: editor.isActive('taskList'), title: 'Checklist' },
        { type: 'divider' },
        { icon: Undo, action: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo(), title: 'Undo' },
        { icon: Redo, action: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo(), title: 'Redo' },
    ];

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-gray-100 mb-2">
            {buttons.map((btn, i) => (
                btn.type === 'divider' ? (
                    <div key={`divider-${i}`} className="w-px h-6 bg-gray-200 mx-1 self-center" />
                ) : (
                    <button
                        key={i}
                        onClick={(e) => { e.preventDefault(); if (btn.action) btn.action(); }}
                        disabled={btn.disabled}
                        className={clsx(
                            "p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600",
                            btn.isActive && "bg-gray-200 text-black",
                            btn.disabled && "opacity-30 cursor-not-allowed"
                        )}
                        title={btn.title}
                        type="button"
                    >
                        {btn.icon && <btn.icon size={16} />}
                    </button>
                )
            ))}
        </div>
    );
};

const TaskItemKeymap = Extension.create({
    addProseMirrorPlugins() {
        return [
            keymap({
                Backspace: (state, dispatch) => {
                    const { selection } = state;
                    if (!selection.empty) return false;
                    const { $from } = selection;
                    let depth = $from.depth;
                    while (depth > 0 && $from.node(depth).type.name !== 'taskItem') {
                        depth -= 1;
                    }
                    if (depth === 0) return false;
                    const taskItemNode = $from.node(depth);
                    if (taskItemNode.textContent.length > 0) return false;
                    const taskItemPos = $from.before(depth);
                    const paragraphType = state.schema.nodes.paragraph;
                    if (!paragraphType) return false;
                    const paragraph = paragraphType.createAndFill();
                    if (!paragraph) return false;
                    if (!dispatch) return true;
                    const tr = state.tr.replaceWith(taskItemPos, taskItemPos + taskItemNode.nodeSize, paragraph);
                    tr.setSelection(TextSelection.create(tr.doc, Math.min(taskItemPos + 1, tr.doc.content.size)));
                    dispatch(tr);
                    return true;
                },
                Delete: (state, dispatch) => {
                    const { selection } = state;
                    if (!selection.empty) return false;
                    const { $from } = selection;
                    let depth = $from.depth;
                    while (depth > 0 && $from.node(depth).type.name !== 'taskItem') {
                        depth -= 1;
                    }
                    if (depth === 0) return false;
                    const taskItemNode = $from.node(depth);
                    if (taskItemNode.textContent.length > 0) return false;
                    const taskItemPos = $from.before(depth);
                    const paragraphType = state.schema.nodes.paragraph;
                    if (!paragraphType) return false;
                    const paragraph = paragraphType.createAndFill();
                    if (!paragraph) return false;
                    if (!dispatch) return true;
                    const tr = state.tr.replaceWith(taskItemPos, taskItemPos + taskItemNode.nodeSize, paragraph);
                    tr.setSelection(TextSelection.create(tr.doc, Math.min(taskItemPos + 1, tr.doc.content.size)));
                    dispatch(tr);
                    return true;
                },
            }),
        ];
    },
});

export default function NoteEditor({
    content,
    onChange,
    placeholder = 'Take a note...',
    editable = true,
    className,
    showToolbar = true,
    contentClassName,
    editorClassName,
    variant = 'default',
    onReady,
    onTransaction,
}: NoteEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                listItem: false,
            }),
            ListItem,
            TaskList,
            TaskItem.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(TaskItemComponent)
                }
            }).configure({
                nested: true,
            }),
            TaskItemKeymap,
            Placeholder.configure({
                placeholder,
            })
        ],
        content: content,
        editable: editable,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose focus:outline-none min-h-[150px] max-w-none [&_ul[data-type="taskList"]_li_div]:inline-block [&_ul[data-type="taskList"]_li_div]:align-top',
            },
        },
        onTransaction: () => {
            onTransaction?.();
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            if (editor.getText() === '' && content !== '') {
                editor.commands.setContent(content);
            } else if (content && content !== editor.getHTML()) {
            }
        }
    }, [content, editor]);

    useEffect(() => {
        onReady?.(editor ?? null);
        return () => {
            onReady?.(null);
        };
    }, [editor, onReady]);

    useEffect(() => {
        if (editor && content) {
        }
    }, []);

    const containerClass =
        variant === 'minimal'
            ? "flex flex-col"
            : "border border-gray-100 rounded-lg bg-gray-50 focus-within:bg-white transition-colors overflow-hidden flex flex-col";

    return (
        <div className={clsx(containerClass, className)}>
            {showToolbar && <MenuBar editor={editor} />}
            <div className={clsx("px-3 pb-3 flex-1 overflow-y-auto scrollbar-thin", contentClassName)}>
                <EditorContent editor={editor} className={clsx("h-full", editorClassName)} />
            </div>
        </div>
    );
}
