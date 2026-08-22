const canvas = document.getElementById("canvas");
const linksLayer = document.getElementById("links-layer");
const emptyState = document.getElementById("empty-state");

const nodeCount = document.getElementById("node-count");
const linkCount = document.getElementById("link-count");

const linkButton = document.getElementById("link-btn");
const deleteButton = document.getElementById("delete-btn");
const pingallButton = document.getElementById("pingall-btn");

const modeIndicator = document.getElementById("mode-indicator");
const cancelLinkButton = document.getElementById("cancel-link");
const toast = document.getElementById("toast");

let nodeSequence = 0;
let selectedNode = null;
let linkMode = false;
let linkSource = null;
let draggingNode = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

const links = [];

const nodeConfig = {
    host: {
        label: "Host",
        symbol: "▣",
        className: "node-host"
    },
    switch: {
        label: "Switch",
        symbol: "⌘",
        className: "node-switch"
    },
    controller: {
        label: "Controller",
        symbol: "▤",
        className: "node-controller"
    },
    router: {
        label: "Router",
        symbol: "↯",
        className: "node-router"
    },
    nat: {
        label: "NAT",
        symbol: "☁",
        className: "node-nat"
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
    symbol.textContent = config.symbol;

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

    const rect = node.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();

    draggingNode = node;

    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;

    selectNode(node);

    document.addEventListener("mousemove", dragNode);
    document.addEventListener("mouseup", stopNodeDrag);
}

function dragNode(event) {
    if (!draggingNode) {
        return;
    }

    const canvasRect = canvas.getBoundingClientRect();

    let x = event.clientX - canvasRect.left - dragOffsetX;
    let y = event.clientY - canvasRect.top - dragOffsetY;

    const maxX = canvas.clientWidth - draggingNode.offsetWidth;
    const maxY = canvas.clientHeight - draggingNode.offsetHeight;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    draggingNode.style.left = `${x}px`;
    draggingNode.style.top = `${y}px`;

    updateLinks();
}

function stopNodeDrag() {
    draggingNode = null;

    document.removeEventListener("mousemove", dragNode);
    document.removeEventListener("mouseup", stopNodeDrag);
}

/*
 * Seleção e modo de enlace.
 */
function selectNode(node) {
    document.querySelectorAll(".network-node.selected").forEach(item => {
        item.classList.remove("selected");
    });

    selectedNode = node;

    if (node) {
        node.classList.add("selected");
    }
}

function handleNodeClick(event) {
    event.stopPropagation();

    const node = event.currentTarget;

    if (!linkMode) {
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
    if (!selectedNode) {
        showToast("No component selected.");
        return;
    }

    const nodeToDelete = selectedNode;

    for (let i = links.length - 1; i >= 0; i--) {
        if (
            links[i].source === nodeToDelete ||
            links[i].target === nodeToDelete
        ) {
            links[i].element.remove();
            links.splice(i, 1);
        }
    }

    nodeToDelete.remove();

    selectedNode = null;

    updateCounters();
    updateLinks();

    showToast("Componente removido.");
});

/*
 * Clique no canvas limpa a seleção.
 */
canvas.addEventListener("click", event => {
    if (event.target === canvas && !linkMode) {
        selectNode(null);
    }
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

    
    if (event.key === "Escape") {
        if (linkMode) {
            clearLinkMode();
            showToast("Mode Enlace cancelled.");
        }
    }
});