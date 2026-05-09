import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const state = {
  auth: null,
  user: null,
  token: null,
  selectedClientId: null,
};

const els = {
  adminEmail: document.querySelector("#adminEmail"),
  signInButton: document.querySelector("#signInButton"),
  signOutButton: document.querySelector("#signOutButton"),
  statusPanel: document.querySelector("#statusPanel"),
  dashboard: document.querySelector("#dashboard"),
  summaryGrid: document.querySelector("#summaryGrid"),
  refreshCatalogButton: document.querySelector("#refreshCatalogButton"),
  foodForm: document.querySelector("#foodForm"),
  recipeForm: document.querySelector("#recipeForm"),
  foodCatalogList: document.querySelector("#foodCatalogList"),
  recipeCatalogList: document.querySelector("#recipeCatalogList"),
  refreshButton: document.querySelector("#refreshButton"),
  searchInput: document.querySelector("#searchInput"),
  clientList: document.querySelector("#clientList"),
  emptyState: document.querySelector("#emptyState"),
  clientDetails: document.querySelector("#clientDetails"),
};

const setStatus = (message, type = "info") => {
  els.statusPanel.textContent = message;
  els.statusPanel.style.borderColor = type === "error" ? "#efb4b4" : "#c9def4";
  els.statusPanel.style.background = type === "error" ? "#fff0f0" : "#e9f3ff";
  els.statusPanel.style.color = type === "error" ? "#9b2222" : "#0d3d78";
};

const getAuthErrorMessage = (error) => {
  const code = error?.code ? `${error.code}: ` : "";
  const detail = error?.customData?._tokenResponse?.error?.message || error?.customData?.email || "";

  if (error?.code === "auth/internal-error") {
    return `${code}Firebase sign-in failed. Check that Google sign-in is enabled and localhost is an authorized Firebase Auth domain.${detail ? ` Detail: ${detail}` : ""}`;
  }

  return `${code}${error.message || "Firebase sign-in failed"}${detail ? ` Detail: ${detail}` : ""}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const apiFetch = async (path, options = {}) => {
  if (!state.user) throw new Error("Sign in first");
  state.token = await state.user.getIdToken();

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload.data;
};

const loadFirebase = async () => {
  const response = await fetch("/api/v1/admin/firebase-config");
  const payload = await response.json();

  if (!response.ok || !payload.data?.apiKey) {
    throw new Error("Firebase web config is unavailable");
  }

  const app = initializeApp(payload.data);
  state.auth = getAuth(app);
};

const renderSummary = (summary) => {
  const cards = [
    ["Clients", summary.users],
    ["Admins", summary.admins],
    ["Assessments", summary.assessments],
    ["Food Logs", summary.dailyLogs],
    ["Water Logs", summary.waterLogs],
    ["Weight Logs", summary.weightLogs],
    ["Foods", summary.foods],
    ["Recipes", summary.recipes],
  ];

  els.summaryGrid.innerHTML = cards
    .map(([label, value]) => `<div class="summary-card"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
};

const renderCatalogItems = (items, type) => {
  if (!items.length) return `<div class="notice">No ${type}s yet.</div>`;

  return items
    .map((item) => {
      const subtitle =
        type === "food"
          ? `${item.calories ?? 0} kcal · P ${item.protein ?? 0}g · C ${item.carbs ?? 0}g · F ${item.fat ?? 0}g`
          : `${item.serves ?? 1} serves · ${Number(item.prepTime ?? 0) + Number(item.cookTime ?? 0)} min`;

      return `
        <div class="catalog-item">
          <div>
            <strong>${item.name || item.title}</strong>
            <span>${subtitle}</span>
          </div>
          <button type="button" class="danger" data-catalog-type="${type}" data-catalog-id="${item._id}">Delete</button>
        </div>
      `;
    })
    .join("");
};

const loadCatalog = async () => {
  const [foods, recipes] = await Promise.all([
    apiFetch("/api/v1/admin/foods"),
    apiFetch("/api/v1/admin/recipes"),
  ]);

  els.foodCatalogList.innerHTML = renderCatalogItems(foods, "food");
  els.recipeCatalogList.innerHTML = renderCatalogItems(recipes, "recipe");
};

const renderClients = (clients) => {
  if (clients.length === 0) {
    els.clientList.innerHTML = `<div class="notice">No clients found.</div>`;
    return;
  }

  els.clientList.innerHTML = clients
    .map(
      (client) => `
        <button class="client-row ${state.selectedClientId === client._id ? "active" : ""}" data-client-id="${client._id}">
          <strong>${client.name || "Unnamed client"}</strong>
          <span>${client.email || "No email"}</span>
          <span>${client.healthAssessment?.mainGoal || client.goal || "No goal set"}</span>
        </button>
      `
    )
    .join("");
};

const loadDashboard = async () => {
  const q = encodeURIComponent(els.searchInput.value.trim());
  const [summary, clientsPayload] = await Promise.all([
    apiFetch("/api/v1/admin/summary"),
    apiFetch(`/api/v1/admin/clients?q=${q}&limit=50`),
  ]);

  renderSummary(summary);
  renderClients(clientsPayload.clients);
  await loadCatalog();
};

const field = (label, name, value, type = "text") => `
  <div class="field">
    <label for="${name}">${label}</label>
    <input id="${name}" name="${name}" type="${type}" value="${value ?? ""}" />
  </div>
`;

const selectField = (label, name, value, options) => `
  <div class="field">
    <label for="${name}">${label}</label>
    <select id="${name}" name="${name}">
      ${options.map((option) => `<option value="${option}" ${value === option ? "selected" : ""}>${option}</option>`).join("")}
    </select>
  </div>
`;

const labelMaps = {
  direction: {
    lose_weight: "Lose weight",
    maintain_weight: "Maintain my weight",
    gain_weight: "Gain weight",
    work_that_out: "Work that out",
  },
  mainGoal: {
    understand_food: "Understand my food intake",
    manage_condition: "Manage a medical condition",
    improve_health: "Improve my overall health",
    improve_emotional_wellbeing: "Improve my emotional wellbeing",
    other: "Other",
  },
  activityLevel: {
    low: "Low",
    moderate: "Moderate",
    high: "High",
    very_high: "Very high",
  },
  sex: {
    male: "Male",
    female: "Female",
  },
};

const readableValue = (value, mapName) => {
  if (value === undefined || value === null || value === "") return "-";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return labelMaps[mapName]?.[value] || value;
};

const answerRow = (question, answer) => `
  <div>
    <span>${question}</span>
    <strong>${answer}</strong>
  </div>
`;

const renderOnboardingAnswers = (assessment) => {
  if (!assessment) return `<p>No onboarding answers recorded.</p>`;

  const heightAnswer = `${assessment.height ?? "-"} ${assessment.heightUnit ?? ""}${
    assessment.heightCm ? ` (${assessment.heightCm} cm)` : ""
  }`;
  const weightAnswer = `${assessment.weight ?? "-"} ${assessment.weightUnit ?? ""}${
    assessment.currentWeightKg ? ` (${assessment.currentWeightKg} kg)` : ""
  }`;

  return `
    <div class="kv onboarding-answers">
      ${answerRow("Name entered during onboarding", assessment.firstName || "-")}
      ${answerRow("What brings you here?", readableValue(assessment.direction, "direction"))}
      ${answerRow("Your main health goal", readableValue(assessment.mainGoal, "mainGoal"))}
      ${answerRow("What gets in the way?", readableValue(assessment.challenges))}
      ${answerRow("Your height", heightAnswer.trim())}
      ${answerRow("Your weight", weightAnswer.trim())}
      ${answerRow("Date of birth", formatDate(assessment.dateOfBirth))}
      ${answerRow("Age", assessment.age ?? "-")}
      ${answerRow("Sex", readableValue(assessment.sex, "sex"))}
      ${answerRow("Activity level", readableValue(assessment.activityLevel, "activityLevel"))}
      ${answerRow("Calculated daily calorie target", assessment.dailyCalorieTarget ? `${assessment.dailyCalorieTarget} kcal` : "-")}
      ${answerRow("Last updated", formatDate(assessment.updatedAt))}
    </div>
  `;
};

const renderKeyValues = (data) => {
  if (!data) return `<p>No data recorded.</p>`;
  return `
    <div class="kv">
      ${Object.entries(data)
        .filter(([key]) => !["_id", "__v", "user"].includes(key))
        .map(([key, value]) => `<div><span>${key}</span><strong>${Array.isArray(value) ? value.join(", ") : value ?? "-"}</strong></div>`)
        .join("")}
    </div>
  `;
};

const renderLogTable = (items, columns) => {
  if (!items?.length) return `<p>No records.</p>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${columns.map(([label]) => `<th>${label}</th>`).join("")}</tr></thead>
        <tbody>
          ${items
            .map(
              (item) => `
                <tr>
                  ${columns.map(([, getter]) => `<td>${getter(item)}</td>`).join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
};

const loadClient = async (clientId) => {
  state.selectedClientId = clientId;
  const data = await apiFetch(`/api/v1/admin/clients/${clientId}`);
  const user = data.user;

  els.emptyState.classList.add("hidden");
  els.clientDetails.classList.remove("hidden");
  els.clientDetails.innerHTML = `
    <div class="detail-header">
      <div>
        <h2>${user.name || "Unnamed client"}</h2>
        <p>${user.email || "No email"} · joined ${formatDate(user.createdAt)}</p>
      </div>
      <button id="deleteClientButton" type="button" class="danger">Delete client</button>
    </div>

    <form id="clientForm">
      <div class="edit-grid">
        ${field("Name", "name", user.name)}
        ${field("Email", "email", user.email, "email")}
        ${field("Age", "age", user.age, "number")}
        ${selectField("Gender", "gender", user.gender, ["", "male", "female", "other"])}
        ${field("Height cm", "height", user.height, "number")}
        ${field("Weight kg", "weight", user.weight, "number")}
        ${field("Target weight", "targetWeight", user.targetWeight, "number")}
        ${selectField("Goal", "goal", user.goal, ["maintenance", "weight_loss", "weight_gain"])}
        ${field("Calorie target", "dailyCalorieTarget", user.dailyCalorieTarget, "number")}
        ${field("Water target ml", "dailyWaterTarget", user.dailyWaterTarget, "number")}
        ${selectField("Role", "role", user.role, ["user", "admin"])}
      </div>
      <div class="button-row">
        <button type="submit">Save changes</button>
      </div>
    </form>

    <div class="data-grid">
      <section class="data-card wide-card">
        <h3>Onboarding answers</h3>
        ${renderOnboardingAnswers(data.healthAssessment)}
      </section>
      <section class="data-card">
        <h3>Sessions</h3>
        ${renderLogTable(data.sessions, [
          ["Last used", (item) => formatDate(item.lastUsedAt)],
          ["Expires", (item) => formatDate(item.expiresAt)],
          ["Revoked", (item) => (item.revokedAt ? "Yes" : "No")],
        ])}
      </section>
      <section class="data-card">
        <h3>Daily logs</h3>
        ${renderLogTable(data.dailyLogs, [
          ["Date", (item) => formatDate(item.date)],
          ["Calories", (item) => item.totalCalories ?? 0],
          ["Meals", (item) => item.meals?.length ?? 0],
        ])}
      </section>
      <section class="data-card">
        <h3>Water logs</h3>
        ${renderLogTable(data.waterLogs, [
          ["Date", (item) => formatDate(item.date)],
          ["Water", (item) => item.totalWater ?? 0],
        ])}
      </section>
      <section class="data-card">
        <h3>Weight logs</h3>
        ${renderLogTable(data.weightLogs, [
          ["Date", (item) => formatDate(item.date)],
          ["Weight", (item) => item.weight ?? "-"],
        ])}
      </section>
      <section class="data-card">
        <h3>Reminders</h3>
        ${renderLogTable(data.reminders, [
          ["Type", (item) => item.type],
          ["Time", (item) => item.time],
          ["Active", (item) => (item.isActive ? "Yes" : "No")],
        ])}
      </section>
      <section class="data-card">
        <h3>Breath tests</h3>
        ${renderLogTable(data.breathTests, [
          ["Date", (item) => formatDate(item.createdAt)],
          ["Result", (item) => item.result],
          ["Score", (item) => `${item.performancePercent}%`],
        ])}
      </section>
      <section class="data-card">
        <h3>Recipes</h3>
        ${renderLogTable(data.recipes, [
          ["Title", (item) => item.title],
          ["Serves", (item) => item.serves],
          ["Created", (item) => formatDate(item.createdAt)],
        ])}
      </section>
    </div>
  `;
};

const getFormPayload = (form) => {
  const formData = new FormData(form);
  const payload = {};
  const numericFields = new Set(["age", "height", "weight", "targetWeight", "dailyCalorieTarget", "dailyWaterTarget"]);

  formData.forEach((value, key) => {
    if (value === "") return;
    payload[key] = numericFields.has(key) ? Number(value) : value;
  });

  return payload;
};

const getFoodPayload = (form) => {
  const payload = getFormPayload(form);
  ["calories", "protein", "carbs", "fat", "fiber", "servingSize", "pieceWeight"].forEach((fieldName) => {
    if (payload[fieldName] !== undefined) {
      payload[fieldName] = Number(payload[fieldName]);
    }
  });
  return payload;
};

const getRecipePayload = (form) => {
  const payload = getFormPayload(form);
  ["serves", "prepTime", "cookTime"].forEach((fieldName) => {
    if (payload[fieldName] !== undefined) {
      payload[fieldName] = Number(payload[fieldName]);
    }
  });
  payload.ingredients = String(payload.ingredients || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  payload.directions = String(payload.directions || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  return payload;
};

const initializeEvents = () => {
  els.signInButton.addEventListener("click", async () => {
    try {
      await signInWithPopup(state.auth, new GoogleAuthProvider());
    } catch (error) {
      setStatus(getAuthErrorMessage(error), "error");
    }
  });

  els.signOutButton.addEventListener("click", () => signOut(state.auth));
  els.refreshButton.addEventListener("click", () => loadDashboard().catch((error) => setStatus(error.message, "error")));
  els.refreshCatalogButton.addEventListener("click", () => loadCatalog().catch((error) => setStatus(error.message, "error")));
  els.searchInput.addEventListener("input", () => loadDashboard().catch((error) => setStatus(error.message, "error")));

  els.foodForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await apiFetch("/api/v1/admin/foods", {
        method: "POST",
        body: JSON.stringify(getFoodPayload(event.target)),
      });
      event.target.reset();
      setStatus("Food added. Users can now find it in Food search.");
      await loadDashboard();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  els.recipeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await apiFetch("/api/v1/admin/recipes", {
        method: "POST",
        body: JSON.stringify(getRecipePayload(event.target)),
      });
      event.target.reset();
      setStatus("Recipe added. Users can now see it in Recipes.");
      await loadDashboard();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-catalog-type][data-catalog-id]");
    if (!button) return;

    const type = button.dataset.catalogType;
    const id = button.dataset.catalogId;
    if (!confirm(`Delete this ${type} from the user catalog?`)) return;

    try {
      await apiFetch(`/api/v1/admin/${type === "food" ? "foods" : "recipes"}/${id}`, {
        method: "DELETE",
      });
      setStatus(`${type === "food" ? "Food" : "Recipe"} deleted.`);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  els.clientList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-client-id]");
    if (!row) return;
    loadClient(row.dataset.clientId)
      .then(loadDashboard)
      .catch((error) => setStatus(error.message, "error"));
  });

  els.clientDetails.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = getFormPayload(event.target);
      await apiFetch(`/api/v1/admin/clients/${state.selectedClientId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setStatus("Client updated.");
      await loadClient(state.selectedClientId);
      await loadDashboard();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });

  els.clientDetails.addEventListener("click", async (event) => {
    if (event.target.id !== "deleteClientButton") return;
    if (!confirm("Delete this client and all related data? This cannot be undone.")) return;

    try {
      await apiFetch(`/api/v1/admin/clients/${state.selectedClientId}`, { method: "DELETE" });
      state.selectedClientId = null;
      els.clientDetails.classList.add("hidden");
      els.emptyState.classList.remove("hidden");
      setStatus("Client deleted.");
      await loadDashboard();
    } catch (error) {
      setStatus(error.message, "error");
    }
  });
};

const boot = async () => {
  try {
    await loadFirebase();
    initializeEvents();
    onAuthStateChanged(state.auth, async (user) => {
      state.user = user;
      els.signInButton.classList.toggle("hidden", Boolean(user));
      els.signOutButton.classList.toggle("hidden", !user);
      els.dashboard.classList.toggle("hidden", !user);
      els.adminEmail.textContent = user?.email || "";

      if (!user) {
        setStatus("Sign in with an authorized Firebase admin account.");
        return;
      }

      try {
        await loadDashboard();
        setStatus("Admin session active.");
      } catch (error) {
        setStatus(error.message, "error");
      }
    });
  } catch (error) {
    setStatus(error.message, "error");
  }
};

void boot();
