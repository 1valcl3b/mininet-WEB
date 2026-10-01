export const nodeSequences = {};
export const selectedNodes = new Set();
export const links = [];

export const interactionState = {
    selectedNode: null,
    linkMode: false,
    linkSource: null,
    draggingNode: null,
    draggingNodes: [],
    dragStartX: 0,
    dragStartY: 0,
    draggingMoved: false,
    selectingNodes: false,
    selectionMoved: false,
    selectionStartX: 0,
    selectionStartY: 0
};

export function resetNodeSequences() {
    Object.keys(nodeSequences).forEach(type => {
        nodeSequences[type] = 0;
    });
}
