const API_BASE_URL = window.API_BASE_URL.replace(/\/+$/, "");
const productList = document.querySelector("#products");
const addForm = document.querySelector("#add-product-form");
const updateForm = document.querySelector("#update-product-form");
const searchForm = document.querySelector("#search-product-form");
const searchResults = document.querySelector("#search-results");
const editPanel = document.querySelector("#edit-panel");
const feedback = document.querySelector("#feedback");
const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});
let searchedId = null;
let listRequest = 0;

function notify(message, error = false) {
    feedback.textContent = message;
    feedback.className = error ? "feedback error" : "feedback success";
    feedback.hidden = false;
}

// O backend retorna arrays nas consultas e texto nas operações de escrita.
// Erros do Supabase também podem chegar como JSON com HTTP 200.
async function request(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            signal: AbortSignal.timeout(15000),
        });
    } catch (error) {
        throw new Error(
            "Não foi possível conectar ao servidor. Verifique o endereço do backend e a conexão.",
        );
    }
    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    if (
        !response.ok ||
        (data &&
            typeof data === "object" &&
            !Array.isArray(data) &&
            (data.message || data.error || data.code))
    ) {
        throw new Error(
            data?.message ||
                data?.error ||
                `O servidor não concluiu a operação (HTTP ${response.status}).`,
        );
    }
    return data;
}

function productPath(id) {
    return `/products/${encodeURIComponent(id)}`;
}
function requireProducts(data) {
    if (!Array.isArray(data))
        throw new Error(
            "O servidor não retornou uma lista válida de produtos.",
        );
    return data;
}
function emptyState(container, message) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = message;
    container.replaceChildren(item);
}
function renderProducts(products, container) {
    container.replaceChildren();
    if (!products.length)
        return emptyState(container, "Nenhum produto encontrado.");
    for (const product of products) {
        const card = document.createElement("li");
        card.className = "product-card";
        const details = document.createElement("div");
        const id = document.createElement("span");
        id.className = "product-id";
        id.textContent = `ID: ${product.id}`;
        const name = document.createElement("h3");
        name.textContent = product.name;
        const description = document.createElement("p");
        description.className = "description";
        description.textContent = product.description || "Sem descrição";
        const price = document.createElement("p");
        price.className = "price";
        price.textContent = currency.format(product.price);
        details.append(id, name, description, price);
        const actions = document.createElement("div");
        actions.className = "actions";
        const update = document.createElement("button");
        update.type = "button";
        update.className = "secondary";
        update.textContent = "Atualizar";
        update.setAttribute("aria-label", `Atualizar ${product.name}`);
        update.addEventListener("click", () => openEditor(product));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "danger";
        remove.textContent = "Excluir";
        remove.setAttribute("aria-label", `Excluir ${product.name}`);
        remove.addEventListener("click", async () => {
            if (!window.confirm(`Excluir o produto “${product.name}”?`)) return;
            await withBusy(remove, async () => {
                await request(productPath(product.id), { method: "DELETE" });
                if (updateForm.elements.id.value === String(product.id))
                    closeEditor();
                notify("Produto excluído com sucesso.");
                await refreshAfterMutation();
            });
        });
        actions.append(update, remove);
        card.append(details, actions);
        container.append(card);
    }
}
async function fetchProducts() {
    const current = ++listRequest;
    try {
        const products = requireProducts(await request("/products"));
        if (current !== listRequest) return;
        renderProducts(products, productList);
        document.querySelector("#product-count").textContent =
            `${products.length} produto(s) cadastrado(s)`;
    } catch (error) {
        if (current !== listRequest) return;
        document.querySelector("#product-count").textContent =
            "Catálogo indisponível";
        emptyState(
            productList,
            "Não foi possível carregar os produtos. Tente atualizar a lista.",
        );
        throw error;
    }
}
async function searchProduct(id) {
    const products = requireProducts(await request(productPath(id)));
    renderProducts(products, searchResults);
}
async function refreshAfterMutation() {
    try {
        await fetchProducts();
        if (searchedId !== null) await searchProduct(searchedId);
    } catch (error) {
        notify(
            `Operação salva, mas a consulta não pôde ser atualizada. ${error.message}`,
            true,
        );
    }
}
async function withBusy(button, action) {
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Aguarde…";
    try {
        await action();
    } catch (error) {
        notify(error.message, true);
    } finally {
        button.disabled = false;
        button.textContent = label;
    }
}
function formData(form) {
    const name = form.elements.name.value.trim();
    const description = form.elements.description.value.trim();
    const price = Number(form.elements.price.value);
    if (
        !name ||
        !description ||
        !form.elements.price.value ||
        !Number.isFinite(price) ||
        price < 0
    ) {
        throw new Error(
            "Preencha nome, descrição e um preço válido, igual ou maior que zero.",
        );
    }
    return { name, description, price };
}
function openEditor(product) {
    updateForm.elements.id.value = product.id;
    updateForm.elements.name.value = product.name;
    updateForm.elements.description.value = product.description || "";
    updateForm.elements.price.value = product.price;
    editPanel.hidden = false;
    editPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    updateForm.elements.name.focus({ preventScroll: true });
}
function closeEditor() {
    editPanel.hidden = true;
    updateForm.reset();
}
addForm.addEventListener("submit", (event) => {
    event.preventDefault();
    withBusy(addForm.querySelector('[type="submit"]'), async () => {
        const data = formData(addForm);
        await request("/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        addForm.reset();
        notify("Produto cadastrado com sucesso.");
        await refreshAfterMutation();
    });
});
updateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    withBusy(updateForm.querySelector('[type="submit"]'), async () => {
        const data = formData(updateForm);
        await request(productPath(updateForm.elements.id.value), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        closeEditor();
        notify("Produto atualizado com sucesso.");
        await refreshAfterMutation();
    });
});
searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    withBusy(searchForm.querySelector('[type="submit"]'), async () => {
        const id = searchForm.elements.id.value.trim();
        if (!id) throw new Error("Informe o ID do produto.");
        searchedId = id;
        emptyState(searchResults, "Consultando produto…");
        try {
            await searchProduct(id);
        } catch (error) {
            emptyState(searchResults, "Não foi possível concluir a consulta.");
            throw error;
        }
    });
});
document.querySelector("#cancel-update").addEventListener("click", closeEditor);
document
    .querySelector("#refresh-products")
    .addEventListener("click", (event) =>
        withBusy(event.currentTarget, fetchProducts),
    );
document.querySelectorAll("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
        const search = button.dataset.view === "search";
        document.querySelector("#catalog-view").hidden = search;
        document.querySelector("#search-view").hidden = !search;
        document.querySelectorAll("[data-view]").forEach((tab) => {
            tab.classList.toggle("active", tab === button);
            tab.setAttribute("aria-pressed", String(tab === button));
        });
        closeEditor();
        feedback.hidden = true;
    }),
);
fetchProducts().catch((error) => notify(error.message, true));
