import {
    aboutButton,
    activateLinkButton,
    applyPythonButton,
    cancelLinkButton,
    canvas,
    clearSelectionButton,
    componentList,
    deleteButton,
    deleteSelectedButton,
    discardPythonButton,
    exportPythonButton,
    fileInput,
    fitTopologyButton,
    linkButton,
    modeIndicator,
    newFileButton,
    openFileButton,
    pingallButton,
    pythonCode,
    pythonPanel,
    pythonStatus,
    resetViewButton,
    runPingallButton,
    saveAsButton,
    saveFileButton,
    selectionBox,
    shortcutsButton,
    startTopologyButton,
    stopTopologyButton,
    splitViewButton,
    toggleGridButton,
    workspaceContent
} from "./modules/dom.js";
import { createNode as buildNode } from "./modules/nodes.js";
import { createLink as buildLink, updateLinks } from "./modules/links.js";
import { downloadTopology, exportPythonTopology, generatePythonTopology, openTopology, parsePythonTopology } from "./modules/topology-io.js";
import { links, resetNodeSequences, selectedNodes } from "./modules/state.js";
import { getCanvasPoint, showToast, updateCounters } from "./modules/ui.js";
import { loadComponents } from "./modules/components.js";

let selectedNode = null;
let linkMode = false;
let linkSource = null;
let draggingNode = null;
let draggingNodes = [];
let dragStartX = 0;
let dragStartY = 0;
let draggingMoved = false;
let selectingNodes = false;
let selectionMoved = false;
let selectionStartX = 0;
let selectionStartY = 0;
let pythonCodeDirty = false;

function syncPythonEditor(force = false) {
    if (pythonCodeDirty && !force) {
        pythonStatus.textContent = "Topologia atualizada; código tem alterações pendentes.";
        return;
    }

    pythonCode.value = generatePythonTopology(links);
    pythonCodeDirty = false;
    pythonStatus.textContent = "Sincronizado";
    pythonStatus.classList.remove("error");
    applyPythonButton.disabled = true;
    discardPythonButton.disabled = true;
}

function closeMenus() {
    document.querySelectorAll(".dropdown-menu.open").forEach(menu => {
        menu.classList.remove("open");
    });
    document.querySelectorAll(".menu-button[aria-expanded='true']").forEach(button => {
        button.setAttribute("aria-expanded", "false");
    });
}

document.querySelectorAll(".menu-button").forEach(button => {
    button.addEventListener("click", event => {
        event.stopPropagation();
        const menu = document.getElementById(button.dataset.menuTarget);
        const isOpen = menu.classList.contains("open");

        closeMenus();
        if (!isOpen) {
            menu.classList.add("open");
            button.setAttribute("aria-expanded", "true");
        }
    });
});

document.addEventListener("click", closeMenus);

splitViewButton.addEventListener("click", () => {
    const enabled = splitViewButton.getAttribute("aria-checked") !== "true";
    splitViewButton.setAttribute("aria-checked", String(enabled));
    workspaceContent.classList.toggle("split", enabled);
    pythonPanel.hidden = !enabled;
    if (enabled) {
        requestAnimationFrame(() => updateLinks(links));
    }
    closeMenus();
});

pythonCode.addEventListener("input", () => {
    pythonCodeDirty = true;
    pythonStatus.textContent = "Código editado; aplique para atualizar o diagrama.";
    pythonStatus.classList.remove("error");
    applyPythonButton.disabled = false;
    discardPythonButton.disabled = false;
});

discardPythonButton.addEventListener("click", () => syncPythonEditor(true));
applyPythonButton.addEventListener("click", applyPythonCode);

function clearTopology() {
    links.forEach(link => link.element.remove());
    links.length = 0;
    document.querySelectorAll(".network-node").forEach(node => node.remove());
    selectedNode = null;
    selectedNodes.clear();
    resetNodeSequences();
    clearLinkMode();
    updateCounters(links);
    syncPythonEditor();
}

newFileButton.addEventListener("click", () => {
    clearTopology();
    closeMenus();
    showToast("New topology created.");
});

openFileButton.addEventListener("click", () => {
    fileInput.click();
    closeMenus();
});

fileInput.addEventListener("change", event => {
    const [file] = event.target.files;
    if (file) {
        openTopology(file, { clearTopology, createNode, createLink, showToast });
    }
    event.target.value = "";
});

saveFileButton.addEventListener("click", () => {
    downloadTopology(links, showToast);
    closeMenus();
});

saveAsButton.addEventListener("click", () => {
    downloadTopology(links, showToast);
    closeMenus();
});

exportPythonButton.addEventListener("click", () => {
    exportPythonTopology(links, showToast);
    closeMenus();
});

toggleGridButton.addEventListener("click", () => {
    const isHidden = canvas.classList.toggle("grid-hidden");
    toggleGridButton.textContent = isHidden ? "Show Grid" : "Hide Grid";
    closeMenus();
});

function fitTopology() {
    const nodes = [...document.querySelectorAll(".network-node")];
    if (!nodes.length) {
        showToast("No components to fit.");
        return;
    }

    const minX = Math.min(...nodes.map(node => parseFloat(node.style.left)));
    const minY = Math.min(...nodes.map(node => parseFloat(node.style.top)));
    const maxX = Math.max(...nodes.map(node => parseFloat(node.style.left) + node.offsetWidth));
    const maxY = Math.max(...nodes.map(node => parseFloat(node.style.top) + node.offsetHeight));
    const offsetX = (canvas.clientWidth - (maxX - minX)) / 2 - minX;
    const offsetY = (canvas.clientHeight - (maxY - minY)) / 2 - minY;

    nodes.forEach(node => {
        node.style.left = `${Math.max(0, parseFloat(node.style.left) + offsetX)}px`;
        node.style.top = `${Math.max(0, parseFloat(node.style.top) + offsetY)}px`;
    });
    updateLinks(links);
    syncPythonEditor();
    showToast("Topology fitted to view.");
}

fitTopologyButton.addEventListener("click", () => {
    fitTopology();
    closeMenus();
});

clearSelectionButton.addEventListener("click", () => {
    selectNode(null);
    closeMenus();
    showToast("Selection cleared.");
});

runPingallButton.addEventListener("click", () => {
    pingallButton.click();
    closeMenus();
});

startTopologyButton.addEventListener("click", () => {
    showToast("Topology started.");
    closeMenus();
});

stopTopologyButton.addEventListener("click", () => {
    showToast("Topology stopped.");
    closeMenus();
});

activateLinkButton.addEventListener("click", () => {
    linkButton.click();
    closeMenus();
});

deleteSelectedButton.addEventListener("click", () => {
    deleteButton.click();
    closeMenus();
});

resetViewButton.addEventListener("click", () => {
    canvas.classList.remove("grid-hidden");
    toggleGridButton.textContent = "Hide Grid";
    fitTopology();
    closeMenus();
});

shortcutsButton.addEventListener("click", () => {
    showToast("Delete removes a component. Esc cancels link mode.");
    closeMenus();
});

aboutButton.addEventListener("click", () => {
    showToast("Mininet-WEB - Topology Editor");
    closeMenus();
});

function createNode(type, x, y) {
    const node = buildNode(type, x, y, {
        onDragStart: startNodeDrag,
        onClick: handleNodeClick,
        updateCounters: () => updateCounters(links)
    });
    syncPythonEditor();
    return node;
}

loadComponents(componentList, showToast);

canvas.addEventListener("dragover", event => {
    event.preventDefault();
    canvas.classList.add("drag-over");
});

canvas.addEventListener("dragleave", () => {
    canvas.classList.remove("drag-over");
});

canvas.addEventListener("drop", event => {
    event.preventDefault();

    canvas.classList.remove("drag-over");

    const type = event.dataTransfer.getData("component-type");

    if (!type) {
        return;
    }

    const point = getCanvasPoint(canvas, event);

    createNode(type, point.x, point.y);
});

/*
 * Arrastar nós já existentes.
 */
function startNodeDrag(event) {
    if (event.button !== 0) {
        return;
    }

    const node = event.currentTarget;

    if (linkMode) {
        return;
    }

    const canvasRect = canvas.getBoundingClientRect();

    draggingNode = node;

    if (!selectedNodes.has(node)) {
        selectNode(node);
    }

    draggingNodes = [...selectedNodes].map(selectedItem => ({
        node: selectedItem,
        x: parseFloat(selectedItem.style.left),
        y: parseFloat(selectedItem.style.top)
    }));
    dragStartX = event.clientX - canvasRect.left;
    dragStartY = event.clientY - canvasRect.top;
    draggingMoved = false;

    document.addEventListener("mousemove", dragNode);
    document.addEventListener("mouseup", stopNodeDrag);
}

function dragNode(event) {
    if (!draggingNode) {
        return;
    }

    const canvasRect = canvas.getBoundingClientRect();

    const deltaX = event.clientX - canvasRect.left - dragStartX;
    const deltaY = event.clientY - canvasRect.top - dragStartY;
    const minDeltaX = Math.max(...draggingNodes.map(item => -item.x));
    const minDeltaY = Math.max(...draggingNodes.map(item => -item.y));
    const maxDeltaX = Math.min(...draggingNodes.map(item => canvas.clientWidth - item.node.offsetWidth - item.x));
    const maxDeltaY = Math.min(...draggingNodes.map(item => canvas.clientHeight - item.node.offsetHeight - item.y));
    const boundedDeltaX = Math.max(minDeltaX, Math.min(deltaX, maxDeltaX));
    const boundedDeltaY = Math.max(minDeltaY, Math.min(deltaY, maxDeltaY));

    draggingNodes.forEach(item => {
        item.node.style.left = `${item.x + boundedDeltaX}px`;
        item.node.style.top = `${item.y + boundedDeltaY}px`;
    });
    draggingMoved = boundedDeltaX !== 0 || boundedDeltaY !== 0;

    updateLinks(links);
    syncPythonEditor();
}

function stopNodeDrag() {
    draggingNode = null;
    draggingNodes = [];

    document.removeEventListener("mousemove", dragNode);
    document.removeEventListener("mouseup", stopNodeDrag);
}

/*
 * Seleção e modo de enlace.
 */
function selectNode(node, additive = false) {
    if (!additive) {
        selectedNodes.forEach(item => item.classList.remove("selected"));
        selectedNodes.clear();
    }

    if (!node) {
        selectedNode = null;
        return;
    }

    if (additive && selectedNodes.has(node)) {
        selectedNodes.delete(node);
        node.classList.remove("selected");
    } else {
        selectedNodes.add(node);
        node.classList.add("selected");
    }

    selectedNode = selectedNodes.values().next().value || null;
}

function updateSelectionBox(event) {
    const point = getCanvasPoint(canvas, event);
    const left = Math.min(selectionStartX, point.x);
    const top = Math.min(selectionStartY, point.y);
    const width = Math.abs(point.x - selectionStartX);
    const height = Math.abs(point.y - selectionStartY);
    selectionMoved = width > 2 || height > 2;

    if (!selectionMoved) {
        return;
    }

    selectionBox.style.display = "block";
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;

    const selectionRect = {
        left,
        top,
        right: left + width,
        bottom: top + height
    };

    document.querySelectorAll(".network-node").forEach(node => {
        const nodeRect = {
            left: parseFloat(node.style.left),
            top: parseFloat(node.style.top),
            right: parseFloat(node.style.left) + node.offsetWidth,
            bottom: parseFloat(node.style.top) + node.offsetHeight
        };
        const intersects = nodeRect.left < selectionRect.right &&
            nodeRect.right > selectionRect.left &&
            nodeRect.top < selectionRect.bottom &&
            nodeRect.bottom > selectionRect.top;

        node.classList.toggle("selected", intersects);
        if (intersects) {
            selectedNodes.add(node);
        } else {
            selectedNodes.delete(node);
        }
    });
    selectedNode = selectedNodes.values().next().value || null;
}

function startSelection(event) {
    const clickedNode = event.target.closest?.(".network-node");

    if (linkMode || event.button !== 0 || clickedNode) {
        return;
    }

    event.preventDefault();
    const point = getCanvasPoint(canvas, event);
    selectingNodes = true;
    selectionMoved = false;
    selectionStartX = point.x;
    selectionStartY = point.y;
    selectionBox.style.display = "none";

    selectNode(null);

    document.addEventListener("mousemove", updateSelectionBox);
    document.addEventListener("mouseup", stopSelection);
}

function stopSelection() {
    if (!selectingNodes) {
        return;
    }

    selectingNodes = false;
    selectionBox.style.display = "none";
    document.removeEventListener("mousemove", updateSelectionBox);
    document.removeEventListener("mouseup", stopSelection);
}

function handleNodeClick(event) {
    event.stopPropagation();

    const node = event.currentTarget;

    if (!linkMode) {
        if (draggingMoved) {
            draggingMoved = false;
            return;
        }
        selectNode(node);
        return;
    }

    if (!linkSource) {
        linkSource = node;
        node.classList.add("link-source");
        showToast("First selected component.");
        return;
    }

    if (linkSource === node) {
        showToast("Select a second component.");
        return;
    }

    createLink(linkSource, node);

    linkSource.classList.remove("link-source");
    linkSource = null;
}

canvas.addEventListener("mousedown", startSelection);

function activateLinkMode() {
    linkMode = !linkMode;

    linkButton.classList.toggle("active", linkMode);
    modeIndicator.classList.toggle("hidden", !linkMode);

    if (!linkMode) {
        clearLinkMode();
    } else {
        showToast("Link Mode: click on two components.");
    }
}

function clearLinkMode() {
    linkMode = false;
    linkSource = null;

    document.querySelectorAll(".link-source").forEach(node => {
        node.classList.remove("link-source");
    });

    linkButton.classList.remove("active");
    modeIndicator.classList.add("hidden");
}

linkButton.addEventListener("click", activateLinkMode);
cancelLinkButton.addEventListener("click", clearLinkMode);

/*
 * Criar enlace entre dois nós.
 */
function createLink(source, target) {
    const link = buildLink(source, target, links, {
        updateLinks,
        updateCounters: () => updateCounters(links),
        showToast
    });
    syncPythonEditor();
    return link;
}

function applyPythonCode() {
    try {
        const topology = parsePythonTopology(pythonCode.value);
        const positions = new Map([...document.querySelectorAll(".network-node")].map(node => [
            node.dataset.id.replace(/[^a-zA-Z0-9_]/g, "_"),
            { x: parseFloat(node.style.left), y: parseFloat(node.style.top) }
        ]));
        const nodesByName = new Map();

        clearTopology();
        topology.nodes.forEach((savedNode, index) => {
            const position = positions.get(savedNode.name) || {
                x: 70 + (index % 4) * 150,
                y: 70 + Math.floor(index / 4) * 130
            };
            const node = createNode(savedNode.type, position.x + 36, position.y + 31);
            if (node) {
                node.dataset.id = savedNode.id;
                node.querySelector(".node-name").textContent = savedNode.name;
                nodesByName.set(savedNode.name, node);
            }
        });

        topology.links.forEach(link => createLink(nodesByName.get(link.source), nodesByName.get(link.target)));
        pythonCodeDirty = false;
        syncPythonEditor(true);
        showToast("Diagrama atualizado a partir do código.");
    } catch (error) {
        pythonStatus.textContent = error.message;
        pythonStatus.classList.add("error");
    }
}

/*
 * Excluir o nó selecionado e seus enlaces.
 */
deleteButton.addEventListener("click", () => {
    if (!selectedNodes.size) {
        showToast("No component selected.");
        return;
    }

    for (let i = links.length - 1; i >= 0; i--) {
        if (
            selectedNodes.has(links[i].source) ||
            selectedNodes.has(links[i].target)
        ) {
            links[i].element.remove();
            links.splice(i, 1);
        }
    }

    selectedNodes.forEach(node => node.remove());
    selectedNodes.clear();

    selectedNode = null;

    updateCounters(links);
    updateLinks(links);
    syncPythonEditor();

    showToast("Componente removido.");
});

/*
 * Clique no canvas limpa a seleção.
 */
canvas.addEventListener("click", event => {
    const clickedNode = event.target.closest?.(".network-node");

    if (!clickedNode && !linkMode && !selectionMoved) {
        selectNode(null);
    }
    selectionMoved = false;
});

/*
 * Pingall é apenas demonstrativo nesta etapa.
 */
pingallButton.addEventListener("click", () => {
    const nodes = document.querySelectorAll(".network-node").length;

    if (nodes < 2) {
        showToast("Add at least two components..");
        return;
    }

    showToast("Pingall test executed.");
});

window.addEventListener("resize", () => updateLinks(links));


document.addEventListener("keydown", event => {
    if (event.key === "Delete") {
        deleteButton.click();
    }

    const activeElement = document.activeElement;
    const isEditing = activeElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement.tagName);

    if (event.key.toLowerCase() === "e" && !isEditing) {
        activateLinkMode();
    }

    if (event.key === "Escape") {
        if (linkMode) {
            clearLinkMode();
            showToast("Mode Enlace cancelled.");
        }
    }
});