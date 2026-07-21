"use strict";

/* ==========================================================
   FINOVA - Transactions Page
========================================================== */

const TRANSACTIONS_PER_PAGE = 10;
const transactionCharts = {};
let currentPage = 1;

/* -------------------- Small helpers -------------------- */

function escapeHtml(value = "") {
    const element = document.createElement("div");
    element.textContent = String(value);
    return element.innerHTML;
}

function getTransactionSearchFromUrl() {
    return new URLSearchParams(window.location.search).get("search") || "";
}

function chartColors() {
    const styles = getComputedStyle(document.documentElement);
    return { text: styles.getPropertyValue("--text-light").trim() || "#64748b", grid: styles.getPropertyValue("--border").trim() || "#e2e8f0" };
}

function transactionChartOptions() {
    const colors = chartColors();
    return { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: colors.text } }, y: { beginAtZero: true, grid: { color: colors.grid }, ticks: { color: colors.text, callback: (value) => fmt(value) } } } };
}

function renderCategoryOptions() {
    const categorySelect = document.getElementById("txCategory");
    const filterSelect = document.getElementById("categoryFilter");
    const options = CATEGORIES.map((category) => `<option value="${category.id}">${category.name}</option>`).join("");
    categorySelect.innerHTML = options;
    filterSelect.innerHTML = `<option value="all">All Categories</option>${options}`;
}

/* -------------------- Filtering and sorting -------------------- */

function getFilteredTransactions() {
    const searchTerm = document.getElementById("filterSearch").value.trim().toLowerCase();
    const category = document.getElementById("categoryFilter").value;
    const type = document.getElementById("typeFilter").value;
    const status = document.getElementById("statusFilter").value;
    const startDate = document.getElementById("startDateFilter").value;
    const endDate = document.getElementById("endDateFilter").value;
    const sortBy = document.getElementById("sortFilter").value;

    const filteredTransactions = getTransactions().filter((transaction) => {
        const searchableText = [transaction.title, transaction.category, transaction.notes, transaction.method].join(" ").toLowerCase();
        const matchesSearch = searchableText.includes(searchTerm);
        const matchesCategory = category === "all" || transaction.category === category;
        const matchesType = type === "all" || transaction.type === type;
        const matchesStatus = status === "all" || transaction.status === status;
        const matchesStartDate = !startDate || transaction.date >= startDate;
        const matchesEndDate = !endDate || transaction.date <= endDate;
        return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
    });

    return filteredTransactions.sort((first, second) => {
        if (sortBy === "oldest") return first.date.localeCompare(second.date);
        if (sortBy === "highest") return num(second.amount) - num(first.amount);
        if (sortBy === "lowest") return num(first.amount) - num(second.amount);
        if (sortBy === "category") return catById(first.category).name.localeCompare(catById(second.category).name);
        return second.date.localeCompare(first.date);
    });
}

/* -------------------- Summary and table -------------------- */

function renderTransactionSummary() {
    const transactions = getTransactions();
    const income = sum(transactions.filter((item) => item.type === "income").map((item) => item.amount));
    const expense = sum(transactions.filter((item) => item.type === "expense").map((item) => item.amount));
    const cards = [
        { title: "Total Transactions", value: transactions.length, icon: "receipt", subtitle: "All recorded entries", color: "#2563eb", isCurrency: false, trend: "Live data" },
        { title: "Total Income", value: income, icon: "arrow-trend-up", subtitle: "Money received", color: "#22c55e", trend: "Income tracked" },
        { title: "Total Expense", value: expense, icon: "arrow-trend-down", subtitle: "Money spent", color: "#ef4444", trend: "Expense tracked" },
        { title: "Net Cash Flow", value: income - expense, icon: "arrows-up-down", subtitle: "Income minus expense", color: "#7c3aed", trend: income >= expense ? "Positive balance" : "Needs attention" }
    ];
    document.getElementById("transactionSummary").innerHTML = cards.map((card) => `<article class="transaction-stat-card" style="--stat-color:${card.color}"><div class="transaction-stat-icon"><i class="fa-solid fa-${card.icon}"></i></div><p>${card.title}</p><h2>${card.isCurrency === false ? card.value : fmt(card.value)}</h2><div class="stat-footer"><span>${card.subtitle}</span>${card.trend ? `<em>${card.trend}</em>` : ""}</div></article>`).join("");
}

function renderTransactionsTable() {
    const transactions = getFilteredTransactions();
    const tableBody = document.getElementById("transactionsBody");
    const emptyState = document.getElementById("emptyTransactions");
    const pageCount = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE));
    currentPage = Math.min(currentPage, pageCount);
    const start = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
    const visibleTransactions = transactions.slice(start, start + TRANSACTIONS_PER_PAGE);

    tableBody.innerHTML = visibleTransactions.map((transaction) => {
        const category = catById(transaction.category);
        const status = transaction.status || "completed";
        const signedAmount = `${transaction.type === "income" ? "+" : "-"}${fmt(transaction.amount)}`;
        return `<tr><td>${fmtDate(transaction.date)}</td><td><strong>${escapeHtml(transaction.title)}</strong></td><td><span class="category-badge" style="--category-color:${category.color}"><i class="fa-solid fa-${category.icon}"></i>${category.name}</span></td><td><span class="type-badge ${transaction.type}">${transaction.type}</span></td><td class="amount-cell ${transaction.type}">${signedAmount}</td><td>${escapeHtml(transaction.method || "Manual")}</td><td><span class="status-badge ${status}">${status}</span></td><td class="transaction-notes">${escapeHtml(transaction.notes || "—")}</td><td><div class="row-actions"><button class="action-button" data-action="view" data-id="${transaction.id}" title="View transaction"><i class="fa-regular fa-eye"></i></button><button class="action-button edit" data-action="edit" data-id="${transaction.id}" title="Edit transaction"><i class="fa-solid fa-pen"></i></button><button class="action-button delete" data-action="delete" data-id="${transaction.id}" title="Delete transaction"><i class="fa-solid fa-trash"></i></button></div></td></tr>`;
    }).join("");

    emptyState.classList.toggle("hidden", transactions.length > 0);
    document.querySelector(".table-scroll").classList.toggle("hidden", transactions.length === 0);
    document.getElementById("transactionCount").textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;
    document.getElementById("activeFilterLabel").textContent = transactions.length === getTransactions().length ? "Showing all records" : "Filtered results";
    renderPagination(pageCount);
}

function renderPagination(pageCount) {
    const pagination = document.getElementById("pagination");
    if (pageCount <= 1) { pagination.innerHTML = ""; return; }
    const numbers = Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => `<button class="page-button ${page === currentPage ? "active" : ""}" data-page="${page}">${page}</button>`).join("");
    pagination.innerHTML = `<button class="page-button" data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}><i class="fa-solid fa-chevron-left"></i>Previous</button>${numbers}<button class="page-button" data-page="${currentPage + 1}" ${currentPage === pageCount ? "disabled" : ""}>Next<i class="fa-solid fa-chevron-right"></i></button>`;
}

/* -------------------- Right sidebar -------------------- */

function renderInsights() {
    const transactions = getTransactions().slice().sort((first, second) => second.date.localeCompare(first.date));
    const expenses = transactions.filter((transaction) => transaction.type === "expense");
    const incomeTransactions = transactions.filter((transaction) => transaction.type === "income");
    const largestExpense = expenses.slice().sort((a, b) => num(b.amount) - num(a.amount))[0];
    const largestIncome = incomeTransactions.slice().sort((a, b) => num(b.amount) - num(a.amount))[0];
    const totalExpense = sum(expenses.map((item) => item.amount));
    const totalIncome = sum(incomeTransactions.map((item) => item.amount));
    const categoryTotals = expenses.reduce((totals, item) => { totals[item.category] = (totals[item.category] || 0) + num(item.amount); return totals; }, {});
    const usedCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const trackedDays = Math.max(1, new Set(expenses.map((item) => item.date)).size);

    document.getElementById("recentActivity").innerHTML = transactions.slice(0, 4).map((item) => `<div class="activity-item"><div class="activity-icon ${item.type}"><i class="fa-solid fa-${catById(item.category).icon}"></i></div><div><strong>${escapeHtml(item.title)}</strong><p>${fmtDate(item.date)} · ${item.type}</p></div><b class="${item.type}">${item.type === "income" ? "+" : "-"}${fmt(item.amount)}</b></div>`).join("") || "<p class=\"side-empty\">No activity yet.</p>";
    document.getElementById("recentPayments").innerHTML = expenses.slice(0, 3).map((item) => `<div class="payment-item"><span><i class="fa-solid fa-${catById(item.category).icon}"></i></span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.method || "Manual")}</p></div><b>${fmt(item.amount)}</b></div>`).join("") || "<p class=\"side-empty\">No payments yet.</p>";
    const statistics = [
        ["Largest Expense", largestExpense ? fmt(largestExpense.amount) : "—", largestExpense?.title || "No expenses yet"],
        ["Largest Income", largestIncome ? fmt(largestIncome.amount) : "—", largestIncome?.title || "No income yet"],
        ["Expense Ratio", totalIncome ? `${Math.round((totalExpense / totalIncome) * 100)}%` : "0%", "Of total income"],
        ["Income Ratio", totalIncome + totalExpense ? `${Math.round((totalIncome / (totalIncome + totalExpense)) * 100)}%` : "0%", "Of cash activity"],
        ["Most Used Category", usedCategory ? catById(usedCategory[0]).name : "—", usedCategory ? fmt(usedCategory[1]) : "No expense data"],
        ["Average Daily Spending", fmt(totalExpense / trackedDays), "Based on active days"]
    ];
    document.getElementById("quickStatistics").innerHTML = statistics.map(([label, value, note]) => `<div class="quick-stat"><p>${label}</p><strong>${value}</strong><span>${escapeHtml(note)}</span></div>`).join("");
}

/* -------------------- Charts -------------------- */

function createMonths() {
    return Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index)); return { label: date.toLocaleDateString(undefined, { month: "short" }), key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` }; });
}

function renderCharts() {
    const months = createMonths();
    const expenseValues = months.map((month) => monthTotals(month.key).expense);
    const incomeValues = months.map((month) => monthTotals(month.key).income);
    const categoryValues = Object.entries(analyticsExpenseCategories()).sort((a, b) => b[1] - a[1]);
    drawChart("spending", "spendingTrendChart", { type: "line", data: { labels: months.map((month) => month.label), datasets: [{ data: expenseValues, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,.12)", fill: true, tension: .4, borderWidth: 3, pointRadius: 3, pointBackgroundColor: "#2563eb" }] }, options: transactionChartOptions() });
    drawChart("category", "expenseCategoryChart", { type: "doughnut", data: { labels: categoryValues.map(([id]) => catById(id).name), datasets: [{ data: categoryValues.map(([, value]) => value), backgroundColor: categoryValues.map(([id]) => catById(id).color), borderWidth: 0, hoverOffset: 7 }] }, options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: true, position: "bottom", labels: { usePointStyle: true, padding: 14, color: chartColors().text } } } } });
    drawChart("comparison", "monthlyComparisonChart", { type: "bar", data: { labels: months.map((month) => month.label), datasets: [{ label: "Income", data: incomeValues, backgroundColor: "#22c55e", borderRadius: 7 }, { label: "Expense", data: expenseValues, backgroundColor: "#ef4444", borderRadius: 7 }] }, options: transactionChartOptions() });
}

function analyticsExpenseCategories() {
    return getTransactions().filter((item) => item.type === "expense").reduce((totals, item) => { totals[item.category] = (totals[item.category] || 0) + num(item.amount); return totals; }, {});
}

function drawChart(chartName, canvasId, configuration) {
    const canvas = document.getElementById(canvasId);
    transactionCharts[chartName]?.destroy();
    transactionCharts[chartName] = new Chart(canvas, configuration);
}

/* -------------------- Modal actions -------------------- */

function openTransactionModal(transaction = null) {
    const form = document.getElementById("transactionForm");
    form.reset();
    document.getElementById("editingTransactionId").value = transaction?.id || "";
    document.getElementById("transactionModalTitle").textContent = transaction ? "Edit Transaction" : "Add Transaction";
    document.getElementById("transactionFormError").classList.add("hidden");
    document.getElementById("txDate").value = transaction?.date || new Date().toISOString().slice(0, 10);
    if (transaction) { document.getElementById("txTitle").value = transaction.title; document.getElementById("txAmount").value = transaction.amount; document.getElementById("txType").value = transaction.type; document.getElementById("txCategory").value = transaction.category; document.getElementById("txMethod").value = transaction.method || "Manual"; document.getElementById("txStatus").value = transaction.status || "completed"; document.getElementById("txNotes").value = transaction.notes || ""; }
    document.getElementById("transactionModal").classList.remove("hidden");
    document.getElementById("txTitle").focus();
}

function closeTransactionModal() { document.getElementById("transactionModal").classList.add("hidden"); }

function saveTransaction(event) {
    event.preventDefault();
    const title = document.getElementById("txTitle").value.trim();
    const amount = num(document.getElementById("txAmount").value);
    const date = document.getElementById("txDate").value;
    const formError = document.getElementById("transactionFormError");
    if (!title || amount <= 0 || !date) { formError.textContent = "Please add a title, a valid amount, and a date."; formError.classList.remove("hidden"); return; }
    const transaction = { id: document.getElementById("editingTransactionId").value || uid(), title, amount, type: document.getElementById("txType").value, category: document.getElementById("txCategory").value, method: document.getElementById("txMethod").value, date, status: document.getElementById("txStatus").value, notes: document.getElementById("txNotes").value.trim() };
    const transactions = getTransactions();
    const existingIndex = transactions.findIndex((item) => item.id === transaction.id);
    if (existingIndex >= 0) transactions[existingIndex] = transaction; else transactions.unshift(transaction);
    saveUserTransactions(transactions);
    closeTransactionModal();
    refreshTransactionPage();
}

function viewTransaction(transaction) {
    const category = catById(transaction.category);
    const rows = [["Title", transaction.title], ["Amount", fmt(transaction.amount)], ["Type", transaction.type], ["Category", category.name], ["Payment Method", transaction.method || "Manual"], ["Date", fmtDate(transaction.date)], ["Status", transaction.status || "completed"], ["Notes", transaction.notes || "No notes added"]];
    document.getElementById("transactionDetails").innerHTML = rows.map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
    document.getElementById("transactionViewModal").classList.remove("hidden");
}

function deleteTransaction(id) {
    if (!confirm("Delete this transaction? This action cannot be undone.")) return;
    saveUserTransactions(getTransactions().filter((transaction) => transaction.id !== id));
    refreshTransactionPage();
}

/* -------------------- Events and page setup -------------------- */

function refreshTransactionPage() { renderTransactionSummary(); renderTransactionsTable(); renderInsights(); }

function resetFilters() {
    ["filterSearch", "startDateFilter", "endDateFilter"].forEach((id) => { document.getElementById(id).value = ""; });
    document.getElementById("categoryFilter").value = "all"; document.getElementById("typeFilter").value = "all"; document.getElementById("statusFilter").value = "all"; document.getElementById("sortFilter").value = "newest"; currentPage = 1; renderTransactionsTable();
}

function initTransactionsChrome() {
    const session = load(K.session, null); const profileMenu = document.getElementById("profileMenu");
    document.getElementById("profileName").textContent = session?.name || "User";
    const applyTheme = (theme) => { document.body.classList.toggle("dark", theme === "dark"); document.getElementById("themeIcon").className = `fa-solid fa-${theme === "dark" ? "sun" : "moon"}`; localStorage.setItem("theme", theme); };
    applyTheme(localStorage.getItem("theme") || "light");
    document.getElementById("themeToggle").addEventListener("click", () => { applyTheme(document.body.classList.contains("dark") ? "light" : "dark"); });
    document.getElementById("profileBtn").addEventListener("click", (event) => { event.stopPropagation(); profileMenu.classList.toggle("hidden"); });
    document.addEventListener("click", () => profileMenu.classList.add("hidden"));
    document.getElementById("logoutOption").addEventListener("click", () => { localStorage.removeItem(K.session); window.location.href = "../index.html"; });
}

function exportCsv() {
    const headers = ["Date", "Title", "Category", "Type", "Amount", "Payment Method", "Status", "Notes"];
    const rows = getFilteredTransactions().map((item) => [item.date, item.title, catById(item.category).name, item.type, item.amount, item.method || "Manual", item.status || "completed", item.notes || ""]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "finova-transactions.csv"; link.click(); URL.revokeObjectURL(link.href);
}

document.addEventListener("DOMContentLoaded", () => {
    initTransactionsChrome(); renderCategoryOptions();
    const urlSearch = getTransactionSearchFromUrl();
    document.getElementById("transactionSearch").value = urlSearch; document.getElementById("filterSearch").value = urlSearch;
    document.querySelectorAll("#filterSearch, #categoryFilter, #typeFilter, #startDateFilter, #endDateFilter, #sortFilter, #statusFilter").forEach((element) => element.addEventListener("input", () => { currentPage = 1; renderTransactionsTable(); }));
    document.querySelectorAll("#categoryFilter, #typeFilter, #startDateFilter, #endDateFilter, #sortFilter, #statusFilter").forEach((element) => element.addEventListener("change", () => { currentPage = 1; renderTransactionsTable(); }));
    document.getElementById("transactionSearch").addEventListener("input", (event) => { document.getElementById("filterSearch").value = event.target.value; currentPage = 1; renderTransactionsTable(); });
    document.getElementById("resetFiltersButton").addEventListener("click", resetFilters); document.getElementById("exportCsvButton").addEventListener("click", exportCsv);
    ["openTransactionModal", "emptyAddTransaction"].forEach((id) => document.getElementById(id).addEventListener("click", () => openTransactionModal()));
    document.getElementById("closeTransactionModal").addEventListener("click", closeTransactionModal); document.getElementById("cancelTransaction").addEventListener("click", closeTransactionModal); document.getElementById("transactionForm").addEventListener("submit", saveTransaction);
    document.getElementById("closeTransactionView").addEventListener("click", () => document.getElementById("transactionViewModal").classList.add("hidden"));
    document.getElementById("transactionsBody").addEventListener("click", (event) => { const button = event.target.closest("[data-action]"); if (!button) return; const transaction = getTransactions().find((item) => item.id === button.dataset.id); if (!transaction) return; if (button.dataset.action === "view") viewTransaction(transaction); if (button.dataset.action === "edit") openTransactionModal(transaction); if (button.dataset.action === "delete") deleteTransaction(transaction.id); });
    document.getElementById("pagination").addEventListener("click", (event) => { const button = event.target.closest("[data-page]"); if (!button || button.disabled) return; currentPage = Number(button.dataset.page); renderTransactionsTable(); });
    ["transactionModal", "transactionViewModal"].forEach((id) => document.getElementById(id).addEventListener("click", (event) => { if (event.target.id === id) event.currentTarget.classList.add("hidden"); }));
    refreshTransactionPage();
});
