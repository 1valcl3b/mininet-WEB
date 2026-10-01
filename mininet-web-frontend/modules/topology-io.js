export function getTopologyData(links) {
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

export function downloadTopology(links, showToast) {
    const content = JSON.stringify(getTopologyData(links), null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const download = document.createElement("a");

    download.href = url;
    download.download = "mininet-topology.json";
    download.click();
    URL.revokeObjectURL(url);
    showToast("Topology saved.");
}

function getPythonName(node) {
    return node.dataset.id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function generatePythonTopology(links) {
    const nodes = [...document.querySelectorAll(".network-node")];
    const lines = [
        "#!/usr/bin/env python3",
        "from mininet.net import Mininet",
        "from mininet.node import Host, Node, OVSSwitch",
        "from mininet.nodelib import NAT",
        "from mininet.topo import Topo",
        "from mininet.cli import CLI",
        "from mininet.log import setLogLevel",
        "",
        "",
        "class GeneratedTopology(Topo):",
        "    def build(self):"
    ];

    if (!nodes.length) {
        lines.push("        pass");
    }

    nodes.forEach(node => {
        const name = getPythonName(node);
        const type = node.dataset.type;

        if (type === "switch") {
            lines.push(`        self.addSwitch('${name}', cls=OVSSwitch, failMode='standalone')`);
        } else if (type === "nat") {
            lines.push(`        self.addNode('${name}', cls=NAT)`);
        } else if (type === "router") {
            lines.push(`        self.addNode('${name}', cls=Node)`);
        } else {
            if (type === "controller") {
                lines.push("        # mininet-web-type: controller");
            }
            lines.push(`        self.addHost('${name}', cls=Host)`);
        }
    });

    links.forEach(link => {
        lines.push(`        self.addLink('${getPythonName(link.source)}', '${getPythonName(link.target)}')`);
    });

    lines.push(
        "",
        "",
        "def run():",
        "    net = Mininet(topo=GeneratedTopology(), controller=None)",
        "    net.start()",
        "    CLI(net)",
        "    net.stop()",
        "",
        "",
        "if __name__ == '__main__':",
        "    setLogLevel('info')",
        "    run()",
        ""
    );

    return lines.join("\n");
}

export function exportPythonTopology(links, showToast) {
    const blob = new Blob([generatePythonTopology(links)], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const download = document.createElement("a");

    download.href = url;
    download.download = "topo.py";
    download.click();
    URL.revokeObjectURL(url);
    showToast("topo.py exported.");
}

export function parsePythonTopology(source) {
    if (!/^class GeneratedTopology\(Topo\):\s*$/m.test(source) || !/^\s+def build\(self\):\s*$/m.test(source)) {
        throw new Error("Esperado o formato de topo.py gerado pelo Mininet-WEB.");
    }

    const nodes = [];
    const links = [];
    const names = new Set();
    let pendingType = null;
    let insideBuild = false;

    source.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (/^ {4}def build\(self\):$/.test(line)) {
            insideBuild = true;
            return;
        }
        if (insideBuild && trimmed && !line.startsWith("        ") && !trimmed.startsWith("#")) {
            insideBuild = false;
        }

        const typeMarker = trimmed.match(/^# mininet-web-type: (controller)$/);
        if (typeMarker) {
            pendingType = typeMarker[1];
            return;
        }

        let nodeMatch = trimmed.match(/^self\.addHost\('([A-Za-z_]\w*)', cls=Host\)$/);
        let type = pendingType || "host";
        if (!nodeMatch) {
            nodeMatch = trimmed.match(/^self\.addSwitch\('([A-Za-z_]\w*)', cls=OVSSwitch, failMode='standalone'\)$/);
            type = "switch";
        }
        if (!nodeMatch) {
            nodeMatch = trimmed.match(/^self\.addNode\('([A-Za-z_]\w*)', cls=NAT\)$/);
            type = "nat";
        }
        if (!nodeMatch) {
            nodeMatch = trimmed.match(/^self\.addNode\('([A-Za-z_]\w*)', cls=Node\)$/);
            type = "router";
        }

        if (nodeMatch) {
            if (!insideBuild) {
                throw new Error("As declarações de nós devem estar dentro de build().");
            }
            const name = nodeMatch[1];
            if (names.has(name)) {
                throw new Error(`Nome de nó duplicado: ${name}.`);
            }
            names.add(name);
            nodes.push({ id: name, type, name });
            pendingType = null;
            return;
        }

        pendingType = null;
        const linkMatch = trimmed.match(/^self\.addLink\('([A-Za-z_]\w*)', '([A-Za-z_]\w*)'\)$/);
        if (linkMatch) {
            if (!insideBuild) {
                throw new Error("As declarações de enlaces devem estar dentro de build().");
            }
            links.push({ source: linkMatch[1], target: linkMatch[2] });
        } else if (/^self\.add(?:Host|Switch|Node|Link)\(/.test(trimmed)) {
            throw new Error("Há uma chamada de nó ou enlace fora do formato suportado.");
        } else if (insideBuild && trimmed && !trimmed.startsWith("#") && trimmed !== "pass") {
            throw new Error(`Instrução não suportada dentro de build(): ${trimmed}`);
        }
    });

    const linkPairs = new Set();
    links.forEach(link => {
        if (!names.has(link.source) || !names.has(link.target)) {
            throw new Error(`O enlace ${link.source} -> ${link.target} referencia um nó inexistente.`);
        }
        const pair = [link.source, link.target].sort().join("\0");
        if (linkPairs.has(pair)) {
            throw new Error(`Enlace duplicado: ${link.source} -> ${link.target}.`);
        }
        linkPairs.add(pair);
    });

    return { nodes, links };
}

function isValidTopology(data) {
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
        return false;
    }

    const validNodes = data.nodes.every(node =>
        node &&
        typeof node.id === "string" &&
        typeof node.type === "string" &&
        Number.isFinite(Number(node.x)) &&
        Number.isFinite(Number(node.y))
    );
    const validLinks = data.links.every(link =>
        link &&
        typeof link.source === "string" &&
        typeof link.target === "string"
    );

    return validNodes && validLinks;
}

export function openTopology(file, { clearTopology, createNode, createLink, showToast }) {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
        try {
            const data = JSON.parse(reader.result);
            if (!isValidTopology(data)) {
                throw new Error("Invalid topology format");
            }

            clearTopology();
            const nodesById = new Map();

            data.nodes.forEach(savedNode => {
                const node = createNode(
                    savedNode.type,
                    Number(savedNode.x) + 36,
                    Number(savedNode.y) + 31
                );
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
            console.error("Could not open topology:", error);
            showToast("Arquivo de topologia inválido.");
        }
    });

    reader.addEventListener("error", () => {
        console.error("Could not read topology file:", reader.error);
        showToast("Não foi possível ler o arquivo.");
    });

    reader.readAsText(file);
}
