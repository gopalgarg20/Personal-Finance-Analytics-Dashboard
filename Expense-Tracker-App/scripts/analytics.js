"use strict";

const analyticsCharts = {};
let analyticsPeriod = "month";

function analyticsDateRange(period) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    if (period === "today") start.setHours(0, 0, 0, 0);
    if (period === "week") start.setDate(start.getDate() - 6);
    if (period === "month") start.setDate(1);
    if (period === "quarter") start.setMonth(start.getMonth() - 2, 1);
    if (period === "year") start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
}

function analyticsTransactions() {
    const range = analyticsDateRange(analyticsPeriod);
    return getTransactions().filter((tx) => {
        const date = new Date(`${tx.date}T00:00:00`);
        return !Number.isNaN(date.valueOf()) && date >= range.start && date <= range.end;
    });
}

function analyticsTotals(transactions = analyticsTransactions()) {
    return transactions.reduce((totals, tx) => {
        const amount = num(tx.amount);
        if (tx.type === "income") totals.income += amount;
        else { totals.expense += amount; totals.categories[tx.category] = (totals.categories[tx.category] || 0) + amount; }
        return totals;
    }, { income: 0, expense: 0, categories: {} });
}

function analyticsOptions() {
    const text = getComputedStyle(document.documentElement).getPropertyValue("--text-light").trim() || "#64748b";
    const grid = getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#e2e8f0";
    return { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: text } }, y: { beginAtZero: true, grid: { color: grid }, ticks: { color: text, callback: (value) => fmt(value) } } } };
}

function setAnalyticsChart(name, canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    analyticsCharts[name]?.destroy();
    analyticsCharts[name] = new Chart(canvas, config);
}

function renderAnalyticsSummary() {
    const totals = analyticsTotals();
    const days = Math.max(1, Math.ceil((analyticsDateRange(analyticsPeriod).end - analyticsDateRange(analyticsPeriod).start) / 86400000) + 1);
    const savingsRate = totals.income ? Math.max(0, Math.round(((totals.income - totals.expense) / totals.income) * 100)) : 0;
    const cards = [
        ["Income", totals.income, "arrow-trend-up", "#22c55e", "Money received"],
        ["Expense", totals.expense, "arrow-trend-down", "#ef4444", "Money spent"],
        ["Savings Rate", savingsRate, "piggy-bank", "#2563eb", "Of income saved", "%"],
        ["Average Daily Expense", totals.expense / days, "calendar-day", "#f59e0b", "Daily average"]
    ];
    const holder = document.getElementById("analyticsSummary");
    holder.innerHTML = cards.map(([label, value, icon, color, subtitle, suffix]) => `<article class="card summary-card analytics-stat" style="--accent:${color}"><div class="analytics-stat-icon"><i class="fa-solid fa-${icon}"></i></div><p>${label}</p><h2>${suffix ? `${value}${suffix}` : fmt(value)}</h2><span>${subtitle}</span></article>`).join("");
}

function getMonthSeries() {
    const count = analyticsPeriod === "year" ? 12 : analyticsPeriod === "quarter" ? 3 : 6;
    const labels = [], income = [], expense = [];
    for (let index = count - 1; index >= 0; index--) {
        const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - index);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const totals = monthTotals(key);
        labels.push(date.toLocaleDateString(undefined, { month: "short" })); income.push(totals.income); expense.push(totals.expense);
    }
    return { labels, income, expense };
}

function renderAnalyticsCharts() {
    const series = getMonthSeries(); const options = analyticsOptions(); const totals = analyticsTotals();
    setAnalyticsChart("incomeExpense", "monthlyIncomeExpenseChart", { type: "bar", data: { labels: series.labels, datasets: [{ label: "Income", data: series.income, backgroundColor: "#22c55e", borderRadius: 8, barPercentage: .58 }, { label: "Expense", data: series.expense, backgroundColor: "#ef4444", borderRadius: 8, barPercentage: .58 }] }, options: { ...options, plugins: { ...options.plugins, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${fmt(context.parsed.y)}` } } } } });
    const categoryEntries = Object.entries(totals.categories).sort((a, b) => b[1] - a[1]);
    setAnalyticsChart("category", "analyticsCategoryChart", { type: "doughnut", data: { labels: categoryEntries.map(([id]) => catById(id).name), datasets: [{ data: categoryEntries.map(([, value]) => value), backgroundColor: categoryEntries.map(([id]) => catById(id).color), borderWidth: 0, hoverOffset: 8 }] }, options: { maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: true, position: "bottom", labels: { usePointStyle: true, padding: 16, color: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() } }, tooltip: { callbacks: { label: (context) => `${context.label}: ${fmt(context.parsed)}` } } } } });
    setAnalyticsChart("cashflow", "cashFlowChart", { type: "line", data: { labels: series.labels, datasets: [{ label: "Cash flow", data: series.income.map((income, index) => income - series.expense[index]), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,.12)", fill: true, tension: .4, pointRadius: 3, pointBackgroundColor: "#2563eb", borderWidth: 3 }] }, options });
    const incomeCategories = analyticsTransactions().filter((tx) => tx.type === "income").reduce((all, tx) => { all[tx.category] = (all[tx.category] || 0) + num(tx.amount); return all; }, {});
    const incomeEntries = Object.entries(incomeCategories);
    setAnalyticsChart("sources", "incomeSourcesChart", { type: "bar", data: { labels: incomeEntries.map(([id]) => catById(id).name), datasets: [{ data: incomeEntries.map(([, value]) => value), backgroundColor: incomeEntries.map(([id]) => catById(id).color), borderRadius: 8, maxBarThickness: 48 }] }, options });
}

function renderExpenseHeatmap() {
    const now = new Date(); const year = now.getFullYear(); const month = now.getMonth(); const totals = {};
    getTransactions().filter((tx) => tx.type === "expense" && tx.date?.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).forEach((tx) => { totals[tx.date] = (totals[tx.date] || 0) + num(tx.amount); });
    const max = Math.max(...Object.values(totals), 1); const days = new Date(year, month + 1, 0).getDate(); const grid = document.getElementById("expenseHeatmap");
    grid.innerHTML = Array.from({ length: days }, (_, index) => { const day = index + 1; const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const level = totals[key] ? Math.max(1, Math.ceil((totals[key] / max) * 4)) : 0; return `<span class="heat-cell level-${level}" title="${fmtDate(key)}: ${fmt(totals[key] || 0)}">${day}</span>`; }).join("");
    document.getElementById("heatmapMonth").textContent = now.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function renderAnalyticsInsights() {
    const transactions = analyticsTransactions(); const totals = analyticsTotals(transactions); const category = Object.entries(totals.categories).sort((a, b) => b[1] - a[1])[0];
    const largest = transactions.filter((tx) => tx.type === "expense").sort((a, b) => num(b.amount) - num(a.amount))[0];
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; return { date: d, ...monthTotals(key) }; }).filter((month) => month.income > 0);
    const best = months.sort((a, b) => b.savings - a.savings)[0]; const recurring = load(K.recurring, []); const items = [
        ["Highest Spending Category", category ? `${catById(category[0]).name} accounted for ${fmt(category[1])} of your spending.` : "Add expenses to uncover your highest-spending category.", "chart-pie", "#ef4444"],
        ["Best Saving Month", best ? `${best.date.toLocaleDateString(undefined, { month: "long" })} delivered ${fmt(best.savings)} in savings.` : "Your best saving month will appear after income is added.", "piggy-bank", "#2563eb"],
        ["Largest Expense", largest ? `${largest.title} was your largest expense at ${fmt(largest.amount)}.` : "No expense has been recorded in this period.", "receipt", "#f59e0b"],
        ["Recurring Expenses", recurring.length ? `${recurring.length} recurring payments total ${fmt(sum(recurring.map((item) => item.amount)))} per cycle.` : "No recurring expenses are set up yet.", "arrows-rotate", "#7c3aed"]
    ];
    document.getElementById("insightsList").innerHTML = items.map(([title, text, icon, color]) => `<article class="insight-item"><div class="insight-icon" style="--insight-color:${color}"><i class="fa-solid fa-${icon}"></i></div><div><h3>${title}</h3><p>${text}</p></div></article>`).join("");
}

function exportAnalytics() {
    const rows = analyticsTransactions().map((tx) => [tx.date, tx.title, tx.category, tx.type, num(tx.amount)]);
    const csv = [["Date", "Title", "Category", "Type", "Amount"], ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = "finova-analytics.csv"; link.click(); URL.revokeObjectURL(link.href);
}

function renderAnalyticsPage() { renderAnalyticsSummary(); renderAnalyticsCharts(); renderExpenseHeatmap(); renderAnalyticsInsights(); }

function initAnalyticsChrome() {
    const session = load(K.session, null); document.getElementById("profileName").textContent = session?.name || "User";
    const applyTheme = (theme) => { document.body.classList.toggle("dark", theme === "dark"); document.getElementById("themeIcon").className = `fa-solid fa-${theme === "dark" ? "sun" : "moon"}`; localStorage.setItem("theme", theme); };
    applyTheme(localStorage.getItem("theme") || "light"); document.getElementById("themeToggle").addEventListener("click", () => { applyTheme(document.body.classList.contains("dark") ? "light" : "dark"); renderAnalyticsPage(); }); document.getElementById("themeOption").addEventListener("click", () => document.getElementById("themeToggle").click());
    const profile = document.getElementById("profileBtn"), menu = document.getElementById("profileMenu"); profile.addEventListener("click", (event) => { event.stopPropagation(); menu.classList.toggle("hidden"); profile.classList.toggle("active"); }); document.addEventListener("click", () => { menu.classList.add("hidden"); profile.classList.remove("active"); });
    document.getElementById("logoutOption").addEventListener("click", () => { if (confirm("Are you sure you want to logout?")) { localStorage.removeItem(K.session); window.location.href = "../index.html"; } });
    const notifications = load(K.notifs, []), list = document.getElementById("notificationList"), badge = document.getElementById("notificationBadge"); badge.textContent = notifications.length; badge.style.display = notifications.length ? "flex" : "none"; list.innerHTML = notifications.length ? notifications.map((item) => `<div class="notification-item"><h4>${item.title}</h4><p>${item.message || item.sub || ""}</p></div>`).join("") : '<div class="notification-item"><p>No notifications</p></div>';
    const notificationPanel = document.getElementById("notificationPanel"); document.getElementById("notificationBtn").addEventListener("click", (event) => { event.stopPropagation(); notificationPanel.classList.toggle("hidden"); }); document.addEventListener("click", () => notificationPanel.classList.add("hidden")); notificationPanel.addEventListener("click", (event) => event.stopPropagation()); document.getElementById("clearNotifications").addEventListener("click", () => { save(K.notifs, []); list.innerHTML = '<div class="notification-item"><p>No notifications</p></div>'; badge.style.display = "none"; });
}

document.addEventListener("DOMContentLoaded", () => {
    initAnalyticsChrome(); renderAnalyticsPage();
    document.querySelectorAll(".period-btn").forEach((button) => button.addEventListener("click", () => { analyticsPeriod = button.dataset.period; document.querySelectorAll(".period-btn").forEach((item) => item.classList.toggle("active", item === button)); renderAnalyticsPage(); }));
    document.getElementById("exportAnalyticsBtn").addEventListener("click", exportAnalytics);
});
