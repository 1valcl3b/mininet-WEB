import { canvas, linksLayer } from "./dom.js";

export function createLink(source, target, links, { updateLinks, updateCounters, showToast }) {
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
    links.push({ source, target, element: line });

    updateLinks(links);
    updateCounters();
    showToast("Link created.");
}

export function updateLinks(links) {
    const canvasRect = canvas.getBoundingClientRect();

    links.forEach(link => {
        const sourceRect = link.source.getBoundingClientRect();
        const targetRect = link.target.getBoundingClientRect();
        const x1 = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
        const y1 = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
        const x2 = targetRect.left + targetRect.width / 2 - canvasRect.left;
        const y2 = targetRect.top + targetRect.height / 2 - canvasRect.top;

        link.element.setAttribute("x1", x1);
        link.element.setAttribute("y1", y1);
        link.element.setAttribute("x2", x2);
        link.element.setAttribute("y2", y2);
    });
}
