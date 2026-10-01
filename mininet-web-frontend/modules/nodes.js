import { canvas } from "./dom.js";
import { nodeConfig } from "./node-config.js";
import { nodeSequences } from "./state.js";

export function createNode(type, x, y, { onDragStart, onClick, updateCounters }) {
    const config = nodeConfig[type];

    if (!config) {
        return;
    }

    nodeSequences[type] = (nodeSequences[type] || 0) + 1;
    const nodeSequence = nodeSequences[type];
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

    node.append(symbol, name, typeLabel);
    canvas.appendChild(node);
    node.addEventListener("mousedown", onDragStart);
    node.addEventListener("click", onClick);

    updateCounters();
    return node;
}
