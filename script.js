const canvas = document.getElementById("canvas");
const linksLayer = document.getElementById("links-layer");
const emptyState = document.getElementById("empty-state");
const selectionBox = document.getElementById("selection-box");

const nodeCount = document.getElementById("node-count");
const linkCount = document.getElementById("link-count");

const linkButton = document.getElementById("link-btn");
const deleteButton = document.getElementById("delete-btn");
const pingallButton = document.getElementById("pingall-btn");

const modeIndicator = document.getElementById("mode-indicator");
const cancelLinkButton = document.getElementById("cancel-link");
const toast = document.getElementById("toast");
const fileMenuButton = document.getElementById("file-menu-button");
const fileMenu = document.getElementById("file-menu");
const fileInput = document.getElementById("file-input");
const newFileButton = document.getElementById("new-file-button");
const openFileButton = document.getElementById("open-file-button");
const saveFileButton = document.getElementById("save-file-button");
const saveAsButton = document.getElementById("save-as-button");
const toggleGridButton = document.getElementById("toggle-grid-button");
const fitTopologyButton = document.getElementById("fit-topology-button");
const clearSelectionButton = document.getElementById("clear-selection-button");
const runPingallButton = document.getElementById("run-pingall-button");
const startTopologyButton = document.getElementById("start-topology-button");
const stopTopologyButton = document.getElementById("stop-topology-button");
const activateLinkButton = document.getElementById("activate-link-button");
const deleteSelectedButton = document.getElementById("delete-selected-button");
const resetViewButton = document.getElementById("reset-view-button");
const shortcutsButton = document.getElementById("shortcuts-button");
const aboutButton = document.getElementById("about-button");

let nodeSequence = 0;
let selectedNode = null;
const selectedNodes = new Set();
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

const links = [];

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

function clearTopology() {
    links.forEach(link => link.element.remove());
    links.length = 0;
    document.querySelectorAll(".network-node").forEach(node => node.remove());
    selectedNode = null;
    selectedNodes.clear();
    nodeSequence = 0;
    clearLinkMode();
    updateCounters();
}

function getTopologyData() {
    const nodes = [...document.querySelectorAll(".network-node")].map(node => ({
        id: node.dataset.id,
        type: node.dataset.type,
        x: parseFloat(node.style.left),
        y: parseFloat(node.style.top)
    }));

    return {
        version: 1,
        nodes,
        links: links.map(link => ({
            source: link.source.dataset.id,
            target: link.target.dataset.id
        }))
    };
}

function downloadTopology() {
    const content = JSON.stringify(getTopologyData(), null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const download = document.createElement("a");

    download.href = url;
    download.download = "mininet-topology.json";
    download.click();
    URL.revokeObjectURL(url);
    showToast("Topology saved.");
}

function openTopology(file) {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
                throw new Error("Invalid topology format");
            }

            clearTopology();
            const nodesById = new Map();

            data.nodes.forEach(savedNode => {
                const node = createNode(savedNode.type, savedNode.x + 36, savedNode.y + 31);
                if (node) {
                    node.dataset.id = savedNode.id;
                    nodesById.set(savedNode.id, node);
                }
            });

            data.links.forEach(savedLink => {
                const source = nodesById.get(savedLink.source);
                const target = nodesById.get(savedLink.target);
                if (source && target) {
                    createLink(source, target);
                }
            });

            showToast("Topology opened.");
        } catch (error) {
            showToast("Could not open this file.");
        }
    });

    reader.readAsText(file);
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
        openTopology(file);
    }
    event.target.value = "";
});

saveFileButton.addEventListener("click", () => {
    downloadTopology();
    closeMenus();
});

saveAsButton.addEventListener("click", () => {
    downloadTopology();
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
    updateLinks();
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

const nodeConfig = {
    host: {
        label: "Host",
        className: "node-host",
        icon: `
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <rect x="7" y="6" width="34" height="25" rx="2"/>
                <line x1="7" y1="31" x2="41" y2="31"/>
                <line x1="19" y1="37" x2="29" y2="37"/>
                <line x1="24" y1="31" x2="24" y2="37"/>
                <path d="M16 42h16"/>
            </svg>
        `
    },

    switch: {
        label: "Switch",
        className: "node-switch",
        icon: `
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <rect x="5" y="10" width="38" height="28" rx="3"/>
                <path d="M13 20l7 4-7 4"/>
                <path d="M35 20l-7 4 7 4"/>
                <line x1="20" y1="24" x2="28" y2="24"/>
            </svg>
        `
    },

    controller: {
        label: "Controller",
        className: "node-controller",
        icon: `
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <rect x="9" y="5" width="30" height="38" rx="2"/>
                <line x1="14" y1="13" x2="34" y2="13"/>
                <line x1="14" y1="20" x2="34" y2="20"/>
                <line x1="14" y1="27" x2="34" y2="27"/>
                <circle cx="16" cy="35" r="2"/>
                <circle cx="24" cy="35" r="2"/>
                <circle cx="32" cy="35" r="2"/>
            </svg>
        `
    },

    router: {
        label: "Router",
        className: "node-router",
        icon: `
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="17"/>
                <line x1="15" y1="15" x2="33" y2="33"/>
                <line x1="33" y1="15" x2="15" y2="33"/>
            </svg>
        `
    },

    nat: {
        label: "NAT",
        className: "node-nat",
        icon: `
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M14 36h22c6 0 9-4 9-9s-4-9-9-9c-1-7-6-11-12-11-6 0-11 4-12 10-6 0-10 4-10 10s5 9 12 9z"/>
            </svg>
        `
    }
};

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function updateCounters() {
    const count = document.querySelectorAll(".network-node").length;

    nodeCount.textContent = `${count} ${count === 1 ? "nó" : "nós"}`;
    linkCount.textContent = `${links.length} ${links.length === 1 ? "enlace" : "enlaces"}`;

    emptyState.style.display = count === 0 ? "flex" : "none";
}

function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function createNode(type, x, y) {
    const config = nodeConfig[type];

    if (!config) {
        return;
    }

    nodeSequence++;

    const node = document.createElement("div");
    node.className = `network-node ${config.className}`;
    node.dataset.type = type;
    node.dataset.id = `${type}-${nodeSequence}`;

    node.style.left = `${x - 36}px`;
    node.style.top = `${y - 31}px`;

    const symbol = document.createElement("div");
    symbol.className = "node-symbol";
    symbol.innerHTML = config.icon;

    const name = document.createElement("div");
    name.className = "node-name";
    name.textContent = `${type.charAt(0).toLowerCase()}${nodeSequence}`;

    const typeLabel = document.createElement("div");
    typeLabel.className = "node-type";
    typeLabel.textContent = config.label;

    node.appendChild(symbol);
    node.appendChild(name);
    node.appendChild(typeLabel);

    canvas.appendChild(node);

    node.addEventListener("mousedown", startNodeDrag);
    node.addEventListener("click", handleNodeClick);

    updateCounters();

    return node;
}

/*
 * Arrastar componentes da paleta para o canvas.
 */
document.querySelectorAll(".component-tool").forEach(tool => {
    tool.addEventListener("dragstart", event => {
        event.dataTransfer.setData("component-type", tool.dataset.type);
        event.dataTransfer.effectAllowed = "copy";
    });
});

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

    const point = getCanvasPoint(event);

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

    updateLinks();
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
    const point = getCanvasPoint(event);
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
    const point = getCanvasPoint(event);
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
    const alreadyExists = links.some(link =>
        (link.source === source && link.target === target) ||
        (link.source === target && link.target === source)
    );

    if (alreadyExists) {
        showToast("These components are already connected.");
        return;
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.classList.add("link-line");
    linksLayer.appendChild(line);

    links.push({
        source,
        target,
        element: line
    });

    updateLinks();
    updateCounters();

    showToast("Link created.");
}

/*
 * Atualiza a posição dos enlaces conforme os nós são movimentados.
 */
function updateLinks() {
    const canvasRect = canvas.getBoundingClientRect();

    links.forEach(link => {
        const sourceRect = link.source.getBoundingClientRect();
        const targetRect = link.target.getBoundingClientRect();

        const x1 =
            sourceRect.left +
            sourceRect.width / 2 -
            canvasRect.left;

        const y1 =
            sourceRect.top +
            sourceRect.height / 2 -
            canvasRect.top;

        const x2 =
            targetRect.left +
            targetRect.width / 2 -
            canvasRect.left;

        const y2 =
            targetRect.top +
            targetRect.height / 2 -
            canvasRect.top;

        link.element.setAttribute("x1", x1);
        link.element.setAttribute("y1", y1);
        link.element.setAttribute("x2", x2);
        link.element.setAttribute("y2", y2);
    });
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

    updateCounters();
    updateLinks();

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

window.addEventListener("resize", updateLinks);


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