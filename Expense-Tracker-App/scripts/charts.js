"use strict";

/* ==========================================================
   FINOVA - Charts
========================================================== */

const charts = {};

/* -------------------- Chart Helpers -------------------- */

function chartTextColor() {
    return (
        getComputedStyle(document.documentElement)
            .getPropertyValue("--text-2")
            .trim() || "#475569"
    );
}

function chartGridColor() {
    return (
        getComputedStyle(document.documentElement)
            .getPropertyValue("--border")
            .trim() || "#E2E8F0"
    );
}

/* -------------------- Chart Defaults -------------------- */

Chart.defaults.font.family = "Inter, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.animation = {
    duration: 900,
    easing: "easeOutQuart"
};

/* ==========================================================
   Spending Chart
========================================================== */

function buildSpendingChart() {
    const ctx = $("#expenseChart");

    if (!ctx) return;

    const labels = [];
    const data = [];

    for (let i = 11; i >= 0; i--) {

        
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1);

        const year = d.getFullYear();
const month = String(d.getMonth() + 1).padStart(2, "0");

const monthKey = `${year}-${month}`;
        
        
        labels.push(
            d.toLocaleDateString(undefined, {
                month: "short"
            })
        );

        data.push(monthTotals(monthKey).expense);
    }

    const gradient = ctx
        .getContext("2d")
        .createLinearGradient(0, 0, 0, 280);

    gradient.addColorStop(0, "rgba(37,99,235,0.35)");
    gradient.addColorStop(1, "rgba(37,99,235,0.02)");

    if (charts.spending) {
        charts.spending.destroy();
    }

    charts.spending = new Chart(ctx, {
        type: "line",

        data: {
            labels,
            datasets: [
                {
                    label: "Spending",
                    data,
                    borderColor: "#2563EB",
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: "#2563EB",
                    borderWidth: 2
                }
            ]
        },

        options: {
            maintainAspectRatio: false,

            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => fmt(context.parsed.y)
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: chartTextColor()
                    }
                },

                y: {
                    grid: {
                        color: chartGridColor()
                    },

                    ticks: {
                        color: chartTextColor(),
                        callback: (value) => fmt(value)
                    }
                }
            }
        }
    });

    /* Trend Chip */

    const current = data[data.length - 1];
    const previous = data[data.length - 2] || 0;

    const change = pct(current, previous);

    const chip = $("#spendingDelta");

    if (chip) {
    chip.textContent =
        (change >= 0 ? "▲ " : "▼ ") +
        Math.abs(change) +
        "% vs last month";

    chip.className =
        "chip " +
        (change >= 0
            ? "chip-danger"
            : "chip-success");
    }
}

/* ==========================================================
   Income vs Expense Chart
========================================================== */

function buildIEChart() {
    const ctx = $("#incomeExpenseChart");

    if (!ctx) return;

    const labels = [];
    const income = [];
    const expense = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();

        d.setMonth(d.getMonth() - i);
        d.setDate(1);

        const year = d.getFullYear();
const month = String(d.getMonth() + 1).padStart(2, "0");

const monthKey = `${year}-${month}`;

        labels.push(
            d.toLocaleDateString(undefined, {
                month: "short"
            })
        );

        const totals = monthTotals(monthKey);

        income.push(totals.income);
        expense.push(totals.expense);
    }

    if (charts.ie) {
        charts.ie.destroy();
    }

    charts.ie = new Chart(ctx, {
        type: "bar",

        data: {
            labels,

            datasets: [
                {
                    label: "Income",
                    data: income,
                    backgroundColor: "#22C55E",
                    borderRadius: 8,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6
                },
                {
                    label: "Expense",
                    data: expense,
                    backgroundColor: "#EF4444",
                    borderRadius: 8,
                    barPercentage: 0.6,
                    categoryPercentage: 0.6
                }
            ]
        },

        options: {
            maintainAspectRatio: false,

            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            context.dataset.label +
                            ": " +
                            fmt(context.parsed.y)
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: chartTextColor()
                    }
                },

                y: {
                    grid: {
                        color: chartGridColor()
                    },

                    ticks: {
                        color: chartTextColor(),
                        callback: (value) => fmt(value)
                    }
                }
            }
        }
    });
}
/* ==========================================================
   Category Doughnut Chart
========================================================== */

function buildCatChart(canvasId, holderKey) {
    const ctx = $("#" + canvasId);

    if (!ctx) return;

    const totals = monthTotals(thisMonth());

    const entries = Object.entries(totals.byCat).sort(
        (a, b) => b[1] - a[1]
    );

    const labels = entries.map(([id]) => catById(id).name);
    const values = entries.map(([, value]) => value);
    const colors = entries.map(([id]) => catById(id).color);

    if (charts[holderKey]) {
        charts[holderKey].destroy();
    }

    charts[holderKey] = new Chart(ctx, {
        type: "doughnut",

        data: {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 8
                }
            ]
        },

        options: {
            maintainAspectRatio: false,

            cutout: "70%",

            plugins: {
                legend: {
                    display: true,
                    position: "bottom",

                    labels: {
                        color: chartTextColor(),
                        boxWidth: 10,
                        padding: 12,

                        font: {
                            size: 11
                        }
                    }
                },

                tooltip: {
                    callbacks: {
                        label: (context) =>
                            context.label +
                            ": " +
                            fmt(context.parsed)
                    }
                }
            }
        }
    });
}

/* ==========================================================
   Savings Trend Chart
========================================================== */

function buildSavingsChart() {
    const ctx = $("#savingsChart");

    if (!ctx) return;

    const labels = [];
    const data = [];

    let cumulativeSavings = 0;

    for (let i = 11; i >= 0; i--) {
        const d = new Date();

        d.setMonth(d.getMonth() - i);
        d.setDate(1);

        const year = d.getFullYear();
const month = String(d.getMonth() + 1).padStart(2, "0");

const monthKey = `${year}-${month}`;

        labels.push(
            d.toLocaleDateString(undefined, {
                month: "short"
            })
        );

        const totals = monthTotals(monthKey);

        cumulativeSavings += totals.savings;

        data.push(cumulativeSavings);
    }

    const gradient = ctx
        .getContext("2d")
        .createLinearGradient(0, 0, 0, 240);

    gradient.addColorStop(0, "rgba(34,197,94,0.35)");
    gradient.addColorStop(1, "rgba(34,197,94,0.02)");

    if (charts.savings) {
        charts.savings.destroy();
    }

    charts.savings = new Chart(ctx, {
        type: "line",

        data: {
            labels,
            datasets: [
                {
                    data,
                    borderColor: "#22C55E",
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },

        options: {
            maintainAspectRatio: false,

            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            fmt(context.parsed.y)
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: chartTextColor()
                    }
                },

                y: {
                    grid: {
                        color: chartGridColor()
                    },

                    ticks: {
                        color: chartTextColor(),
                        callback: (value) => fmt(value)
                    }
                }
            }
        }
    });
}

/* ==========================================================
   Analytics Charts
========================================================== */

function buildAnalyticsCharts() {
    buildCatChart(
        "analyticsCatChart",
        "analyticsCat"
    );

    const ctx = $("#analyticsTrendChart");

    if (!ctx) return;

    const labels = [];
    const income = [];
    const expense = [];
    const savings = [];

    for (let i = 11; i >= 0; i--) {
        const d = new Date();

        d.setMonth(d.getMonth() - i);
        d.setDate(1);

        const monthKey = d.toISOString().slice(0, 7);

        labels.push(
            d.toLocaleDateString(undefined, {
                month: "short"
            })
        );

        const totals = monthTotals(monthKey);

        income.push(totals.income);
        expense.push(totals.expense);
        savings.push(totals.savings);
    }

    if (charts.analyticsTrend) {
        charts.analyticsTrend.destroy();
    }

    charts.analyticsTrend = new Chart(ctx, {
        type: "line",

        data: {
            labels,

            datasets: [
                {
                    label: "Income",
                    data: income,
                    borderColor: "#22C55E",
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: "Expense",
                    data: expense,
                    borderColor: "#EF4444",
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: "Savings",
                    data: savings,
                    borderColor: "#2563EB",
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },

        options: {
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: true,

                    labels: {
                        color: chartTextColor()
                    }
                },

                tooltip: {
                    callbacks: {
                        label: (context) =>
                            context.dataset.label +
                            ": " +
                            fmt(context.parsed.y)
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: chartTextColor()
                    }
                },

                y: {
                    grid: {
                        color: chartGridColor()
                    },

                    ticks: {
                        color: chartTextColor(),
                        callback: (value) => fmt(value)
                    }
                }
            }
        }
    });
}