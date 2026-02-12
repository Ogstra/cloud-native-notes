export interface TaskItem {
    index: number;
    content: string;
    isChecked: boolean;
}

export function extractTaskItems(html: string): TaskItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const taskElements = doc.querySelectorAll('li[data-type="taskItem"]');

    const tasks: TaskItem[] = [];
    taskElements.forEach((taskEl, index) => {
        const isChecked = taskEl.getAttribute('data-checked') === 'true';
        const content = taskEl.textContent || '';

        tasks.push({
            index,
            content: content.trim(),
            isChecked
        });
    });

    return tasks;
}

export function toggleTaskInHTML(html: string, taskIndex: number, checked: boolean): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const taskElements = doc.querySelectorAll('li[data-type="taskItem"]');

    if (taskElements[taskIndex]) {
        taskElements[taskIndex].setAttribute('data-checked', String(checked));
    }

    return doc.body.innerHTML;
}

export function hasTaskItems(html: string): boolean {
    return html.includes('data-type="taskItem"');
}

export function getContentWithoutTasks(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const taskLists = doc.querySelectorAll('ul[data-type="taskList"]');

    taskLists.forEach(list => {
        list.remove();
    });

    return doc.body.innerHTML;
}
