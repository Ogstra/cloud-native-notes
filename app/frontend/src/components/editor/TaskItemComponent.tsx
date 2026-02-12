import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';

const moveTaskItemInList = (props: NodeViewProps, nextChecked: boolean) => {
    const { editor, getPos } = props;
    if (!editor || typeof getPos !== 'function') return;
    const state = editor.state;
    const pos = getPos();
    if (typeof pos !== 'number') return;

    const $pos = state.doc.resolve(pos);
    let listDepth = $pos.depth;
    while (listDepth > 0 && $pos.node(listDepth).type.name !== 'taskList') {
        listDepth -= 1;
    }
    if (listDepth === 0) return;

    const listNode = $pos.node(listDepth);
    const listStart = $pos.start(listDepth);
    const children: { node: PMNode; index: number; pos: number }[] = [];
    let currentIndex = -1;

    listNode.forEach((child, offset, index) => {
        const childPos = listStart + offset;
        children.push({ node: child as typeof listNode, index, pos: childPos });
        if (childPos === pos) {
            currentIndex = index;
        }
    });

    if (currentIndex === -1) return;

    const checkedIndexes: number[] = [];
    const uncheckedIndexes: number[] = [];
    children.forEach((child) => {
        if (child.node.attrs?.checked) checkedIndexes.push(child.index);
        else uncheckedIndexes.push(child.index);
    });

    const lastChecked = checkedIndexes.length ? Math.max(...checkedIndexes) : -1;
    const lastUnchecked = uncheckedIndexes.length ? Math.max(...uncheckedIndexes) : -1;
    const targetIndex = nextChecked ? (lastChecked >= 0 ? lastChecked + 1 : children.length) : (lastUnchecked >= 0 ? lastUnchecked + 1 : 0);

    const adjustedTarget = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
    if (adjustedTarget === currentIndex) return;

    const nodeFromDoc = state.doc.nodeAt(pos);
    const nodeToMove = nodeFromDoc ?? children[currentIndex].node;
    const remaining = children.filter((_, idx) => idx !== currentIndex).map((child) => child.node);
    const insertIndex = Math.min(Math.max(adjustedTarget, 0), remaining.length);

    let offset = 0;
    for (let i = 0; i < insertIndex; i += 1) {
        offset += remaining[i].nodeSize;
    }
    const insertPos = listStart + offset;
    const tr = state.tr;
    tr.delete(pos, pos + nodeToMove.nodeSize);
    tr.insert(insertPos, nodeToMove);
    editor.view.dispatch(tr);
};

export default function TaskItemComponent(props: NodeViewProps) {
    const { node, updateAttributes } = props;
    return (
        <NodeViewWrapper
            as="li"
            data-type="taskItem"
            data-checked={node.attrs.checked ? 'true' : 'false'}
            className="flex items-start gap-2 mb-2"
        >
            <label className="flex items-center select-none m-0 p-0 h-6 cursor-pointer" contentEditable={false}>
                <input
                    type="checkbox"
                    checked={node.attrs.checked}
                    onChange={e => {
                        const nextChecked = e.target.checked;
                        updateAttributes({ checked: nextChecked });
                        requestAnimationFrame(() => moveTaskItemInList(props, nextChecked));
                    }}
                    className="cursor-pointer"
                />
            </label>
            <NodeViewContent className="flex-1 min-w-0" />
        </NodeViewWrapper>
    )
}
