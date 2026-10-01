import { emptyState, linkCount, nodeCount, toast } from "./dom.js";

export function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

export function updateCounters(links) {
    const count = document.querySelectorAll(".network-node").length;

    nodeCount.textContent = `${count} ${count === 1 ? "nó" : "nós"}`;
    linkCount.textContent = `${links.length} ${links.length === 1 ? "enlace" : "enlaces"}`;
    emptyState.style.display = count === 0 ? "flex" : "none";
}

export function getCanvasPoint(canvas, event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}
