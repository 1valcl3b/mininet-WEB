import { nodeConfig } from "./node-config.js";

const COMPONENTS_API_URL = "http://localhost:3000/components";

function createComponentTool(component) {
    const config = nodeConfig[component.type];
    const tool = document.createElement("div");
    tool.className = "component-tool";
    tool.draggable = true;
    tool.dataset.type = component.type;

    const icon = document.createElement("div");
    icon.className = `component-icon ${config.className.replace("node-", "")}-icon`;
    icon.innerHTML = config.icon;

    const label = document.createElement("span");
    label.textContent = component.label;

    tool.append(icon, label);
    tool.addEventListener("dragstart", event => {
        event.dataTransfer.setData("component-type", component.type);
        event.dataTransfer.effectAllowed = "copy";
    });

    return tool;
}

export async function loadComponents(container, showToast) {
    try {
        const response = await fetch(COMPONENTS_API_URL);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const components = await response.json();
        if (!Array.isArray(components)) {
            throw new Error("The components endpoint must return an array");
        }

        const availableComponents = components.filter(component =>
            component &&
            typeof component.type === "string" &&
            typeof component.label === "string" &&
            nodeConfig[component.type]
        );

        availableComponents.forEach(component => {
            nodeConfig[component.type].label = component.label;
        });
        container.replaceChildren(...availableComponents.map(createComponentTool));

        if (!availableComponents.length) {
            container.textContent = "Nenhum componente disponível.";
        }
    } catch (error) {
        container.textContent = "Não foi possível carregar os componentes.";
        showToast("Falha ao carregar componentes. Verifique se o json-server está ativo.");
        console.error("Could not load components:", error);
    }
}