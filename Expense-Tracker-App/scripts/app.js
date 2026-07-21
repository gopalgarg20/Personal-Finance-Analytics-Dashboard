const welcomeText = document.getElementById("welcomeText");

if (welcomeText) {
    const userName = localStorage.getItem("currentUser") || "User";
    welcomeText.textContent = `👋 Hello, ${userName}`;
}
/* ==========================================================
   Dashboard
========================================================== */

function renderDashboard() {
    // Greeting
const hour = new Date().getHours();

const greet = $("#greetTime");
const welcome = $("#welcomeText");

let message = "";

if (hour < 12) {
    message = "Good Morning! Here's your financial overview.";
}
else if (hour < 17) {
    message = "Good Afternoon! Here's your financial overview.";
}
else {
    message = "Good Evening! Here's your financial overview.";
}

if (greet) {
    greet.textContent = message;
}

if (welcome) {

    const session = load(K.session, null);

    const name = session?.name || "User";

    welcome.textContent = `👋 Hello, ${name}`;
}

    renderSummaryCards();

    renderRecentTransactions();

   // renderBudgetProgress();
    buildSpendingChart();
    buildIEChart();
    buildCatChart("categoryChart", "cat");
    buildSavingsChart();

    // renderInsights();
    // renderTimeline();
    // renderRecurring();
    // renderAchievements();
    // renderRecommendations();
    // renderHealthScore();

    const streak = $("#sidebarStreak");

    if (streak) {
        streak.textContent =
            load(K.streak, { current: 0 }).current;
    }
}
/* ==========================================================
   Summary Cards
========================================================== */

function renderSummaryCards() {
    const now = monthTotals(thisMonth());
    const prev = monthTotals(lastMonth());

    const bal = balance();
    const cashFlow = now.income - now.expense;

    const cards = [
        {
            lbl: "Current Balance",
            val: bal,
            icon: "wallet",
            color: "#2563EB",
            delta: null
        },
        {
            lbl: "Monthly Income",
            val: now.income,
            icon: "arrow-down",
            color: "#22C55E",
            delta: pct(now.income, prev.income)
        },
        {
            lbl: "Monthly Expense",
            val: now.expense,
            icon: "arrow-up",
            color: "#EF4444",
            delta: pct(now.expense, prev.expense),
            invert: true
        },
        {
            lbl: "Savings",
            val: now.savings,
            icon: "piggy-bank",
            color: "#7C3AED",
            delta: pct(now.savings, prev.savings)
        },
        {
            lbl: "Cash Flow",
            val: cashFlow,
            icon: "arrows-up-down",
            color: "#F59E0B",
            delta: null
        }
    ];

    const grid = $("#summaryGrid");
    grid.innerHTML = "";

  
    cards.forEach((card) => {

        const deltaCls =
            card.delta == null
                ? ""
                : card.invert
                ? card.delta > 0
                    ? "down"
                    : "up"
                : card.delta >= 0
                ? "up"
                : "down";

        const deltaSym =
            card.delta == null
                ? ""
                : card.delta >= 0
                ? "▲"
                : "▼";

        const node = el(
            "div",
            {
                class: "card summary-card glass-card",
                style: `color:${card.color}`,
                "data-testid":
                    `summary-card-${card.lbl
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`
            },

            el(
                "div",
                {
                    class: "s-ic",
                    style:
                        `background:${card.color}1a; color:${card.color}`
                },
                el("i", {
                    class: `fa-solid fa-${card.icon}`
                })
            ),

            el(
                "div",
                {
                    class: "s-lbl",
                    style: "color:var(--text-3)"
                },
                card.lbl
            ),

            el(
                "div",
                {
                    class: "s-val",
                    style: "color:var(--text)",
                    "data-counter": card.val
                },
                fmt(0)
            ),

            card.delta != null
                ? el(
                      "div",
                      {
                          class: `s-delta ${deltaCls}`
                      },
                      `${deltaSym} ${Math.abs(card.delta)}%`
                  )
                : null
        );

        grid.appendChild(node);
    });

    $$("[data-counter]", grid).forEach((node) =>
        animateCounter(node, +node.dataset.counter)
    );
}

/* ==========================================================
   Recent Transactions
========================================================== */

function renderRecentTransactions() {

    const tbody = $("#recentTransactionsBody");

    if (!tbody) return;

    tbody.innerHTML = "";

    const transactions = load(userKey(K.tx), []).slice(0, 5);

    transactions.forEach(tx => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${fmtDate(tx.date)}</td>
            <td>${tx.title}</td>
            <td>${tx.category}</td>
            <td class="${tx.type === "income" ? "income" : "expense"}">
                ${tx.type === "income" ? "+" : "-"}${fmt(tx.amount)}
            </td>
            <td>${tx.type}</td>
            <td>
                <button class="edit-btn" data-id="${tx.id}">✏️</button>
                <button class="delete-btn" data-id="${tx.id}">🗑️</button>
            </td>
        `;

        tr.querySelector(".edit-btn").addEventListener("click", () => {
            editTransaction(tx.id);
        });

        tr.querySelector(".delete-btn").addEventListener("click", () => {
            deleteTransaction(tx.id);
        });

        tbody.appendChild(tr);

    });

}
function deleteTransaction(id) {

    if (!confirm("Delete this transaction?")) return;

    let transactions = load(userKey(K.tx), []);

    transactions = transactions.filter(tx => tx.id !== id);

    save(userKey(K.tx), transactions);

    renderDashboard();

}
/* ==========================================================
   Counter Animation
========================================================== */

function animateCounter(node, target) {
    const start = performance.now();
    const duration = 900;

    function tick(now) {
        const progress = Math.min(
            1,
            (now - start) / duration
        );

        const eased =
            1 - Math.pow(1 - progress, 3);

        node.textContent = fmt(target * eased);

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            node.textContent = fmt(target);
        }
    }

    requestAnimationFrame(tick);
}
/* ==========================================================
   Health Score
========================================================== */

function renderHealthScore() {
    const now = monthTotals(thisMonth());

    const rate = now.income
        ? Math.max(0, now.savings / now.income)
        : 0;

    const budgets = load(K.budgets, []);

    const overrun = budgets.filter(
        (b) => (now.byCat[b.category] || 0) > b.limit
    ).length;

    const expRatio = now.income
        ? now.expense / now.income
        : 1;

    let score = 0;

    score += Math.min(45, rate * 100 * 0.8);
    score += Math.max(0, 30 - overrun * 8);
    score += Math.max(0, 25 - (expRatio - 0.6) * 60);

    score = Math.max(0, Math.min(100, Math.round(score)));

    const label =
        score >= 80
            ? "Excellent"
            : score >= 65
            ? "Good"
            : score >= 45
            ? "Average"
            : "Poor";

    const color =
        score >= 80
            ? "#22C55E"
            : score >= 65
            ? "#2563EB"
            : score >= 45
            ? "#F59E0B"
            : "#EF4444";

    $("#healthScoreVal").textContent = score;
    $("#healthStatus").textContent = label;
    $("#healthStatus").style.color = color;

    const arc = $("#healthArc");

    arc.setAttribute("stroke-dasharray", `${score},100`);
    arc.style.stroke = color;
}
/* ==========================================================
   Recent Timeline
========================================================== */

function renderTimeline() {
    const list = $("#timeline");

    list.innerHTML = "";

    const tx = load(userkey(K.tx), []).slice(0, 6);

    tx.forEach((t) => {
        const c = catById(t.category);

        list.appendChild(
            el(
                "li",
                {},

                el(
                    "div",
                    {
                        class: "tl-ic",
                        style: `background:${c.color}22; color:${c.color}`
                    },
                    el("i", {
                        class: `fa-solid fa-${c.icon}`
                    })
                ),

                el(
                    "div",
                    {
                        class: "tl-body"
                    },

                    el(
                        "div",
                        {
                            class: "tl-title"
                        },
                        t.title
                    ),

                    el(
                        "div",
                        {
                            class: "tl-sub"
                        },
                        `${c.name} · ${fmtDate(t.date)}`
                    )
                ),

                el(
                    "div",
                    {
                        class: `tl-amt ${
                            t.type === "income"
                                ? "up"
                                : "down"
                        }`
                    },
                    `${
                        t.type === "income"
                            ? "+ "
                            : "− "
                    }${fmt(t.amount)}`
                )
            )
        );
    });
}

/* ==========================================================
   Recurring Payments
========================================================== */

function renderRecurring() {
    const list = $("#recurringList");

    list.innerHTML = "";

    load(K.recurring, []).forEach((r) => {
        list.appendChild(
            el(
                "li",
                {},

                el(
                    "div",
                    {
                        class: "rc-ic"
                    },
                    el("i", {
                        class: `fa-solid fa-${r.icon}`
                    })
                ),

                el(
                    "div",
                    {
                        style: "flex:1;min-width:0"
                    },

                    el(
                        "div",
                        {
                            style:
                                "font-weight:600;font-size:14px"
                        },
                        r.title
                    ),

                    el(
                        "div",
                        {
                            style:
                                "color:var(--text-3);font-size:12px"
                        },
                        "Next: " + fmtDate(r.nextDate)
                    )
                ),

                el(
                    "div",
                    {
                        style:
                            "font-family:var(--font-display);font-weight:700"
                    },
                    fmt(r.amount)
                )
            )
        );
    });
}
/* ==========================================================
   Achievements
========================================================== */

function renderAchievements() {
    const wrap = $("#achList");

    wrap.innerHTML = "";

    load(K.achievements, []).forEach((achievement) => {
        wrap.appendChild(
            el(
                "div",
                {
                    class: `ach ${
                        achievement.unlocked
                            ? "unlocked"
                            : "locked"
                    }`
                },

                el(
                    "div",
                    {
                        class: "ach-ic"
                    },
                    el("i", {
                        class: `fa-solid fa-${achievement.icon}`
                    })
                ),

                el(
                    "div",
                    {},

                    el(
                        "div",
                        {
                            class: "ach-title"
                        },
                        achievement.title
                    ),

                    el(
                        "div",
                        {
                            class: "ach-sub"
                        },
                        achievement.sub
                    )
                )
            )
        );
    });
}
/* ==========================================================
   Insights
========================================================== */

function renderInsights() {
    const list = $("#insightsList");

    list.innerHTML = "";

    const now = monthTotals(thisMonth());
    const prev = monthTotals(lastMonth());

    const insights = [];

    Object.keys(now.byCat).forEach((category) => {
        const previous = prev.byCat[category] || 0;
        const current = now.byCat[category];

        if (previous > 0) {
            const delta = Math.round(
                ((current - previous) / previous) * 100
            );

            if (delta >= 15) {
                insights.push({
                    i: "arrow-trend-up",
                    t: `You spent ${delta}% more on ${
                        catById(category).name
                    } this month.`
                });
            } else if (delta <= -15) {
                insights.push({
                    i: "arrow-trend-down",
                    t: `${
                        catById(category).name
                    } spending dropped ${Math.abs(delta)}% — nice work.`
                });
            }
        }
    });

    if (now.savings > prev.savings) {
        insights.push({
            i: "piggy-bank",
            t: `You saved ${fmt(
                now.savings - prev.savings
            )} more this month than last.`
        });
    }

    const budgets = load(K.budgets, []);

    budgets.forEach((budget) => {
        const spent = now.byCat[budget.category] || 0;
        const progress = spent / budget.limit;

        if (progress >= 1) {
            insights.push({
                i: "triangle-exclamation",
                t: `You've exceeded your ${
                    catById(budget.category).name
                } budget by ${fmt(spent - budget.limit)}.`
            });
        } else if (progress >= 0.85) {
            insights.push({
                i: "gauge-high",
                t: `You're close to exceeding your ${
                    catById(budget.category).name
                } budget (${Math.round(progress * 100)}%).`
            });
        }
    });

    if (insights.length === 0) {
        insights.push({
            i: "sparkles",
            t: "Your spending pattern looks steady. Keep it up!"
        });
    }

    insights
        .slice(0, 5)
        .forEach((insight) => {
            list.appendChild(
                el(
                    "li",
                    {},
                    el("i", {
                        class: `fa-solid fa-${insight.i}`
                    }),
                    el("span", {}, insight.t)
                )
            );
        });
}
/* ==========================================================
   Recommendations
========================================================== */

function renderRecommendations() {
    const list = $("#recoList");

    list.innerHTML = "";

    const now = monthTotals(thisMonth());

    const budgets = load(K.budgets, []);
    const goals = load(K.goals, []);

    const recommendations = [];

    budgets.forEach((budget) => {
        const spent = now.byCat[budget.category] || 0;

        if (spent > budget.limit) {
            recommendations.push({
                i: "scissors",
                t: `Reduce ${
                    catById(budget.category).name
                } spending by ${fmt(
                    spent - budget.limit
                )} to stay within budget next month.`
            });
        }
    });

    goals.forEach((goal) => {
        const remaining = goal.target - goal.saved;

        const daysLeft = Math.max(
            1,
            Math.round(
                (new Date(goal.deadline) - new Date()) /
                    86400000
            )
        );

        const monthsLeft = Math.max(
            1,
            Math.round(daysLeft / 30)
        );

        const perMonth = Math.ceil(
            remaining / monthsLeft
        );

        if (remaining > 0) {
            recommendations.push({
                i: "arrow-up-right-dots",
                t: `Save ${fmt(
                    perMonth
                )} per month to hit "${goal.title}" by ${fmtDate(
                    goal.deadline
                )}.`
            });

            const speedUp = Math.max(
                1000,
                Math.round(now.savings * 0.15)
            );

            recommendations.push({
                i: "bolt",
                t: `Add ${fmt(
                    speedUp
                )} extra to complete "${goal.title}" 2 months earlier.`
            });
        }
    });

    if (recommendations.length === 0) {
        recommendations.push({
            i: "thumbs-up",
            t: "You're on a healthy trajectory. Consider increasing your SIP by 10%."
        });
    }

    recommendations
        .slice(0, 5)
        .forEach((recommendation) => {
            list.appendChild(
                el(
                    "li",
                    {},
                    el("i", {
                        class: `fa-solid fa-${recommendation.i}`
                    }),
                    el("span", {}, recommendation.t)
                )
            );
        });
}

/* ==========================================================
   Transaction Modal
========================================================== */

function openTransactionModal() {

    const modal = $("#transactionModal");

    if (!modal) return;

    $("#txDate").value = new Date().toISOString().slice(0,10);

    modal.classList.remove("hidden");
}

function closeTransactionModal() {
    const modal = $("#transactionModal");

    if (!modal) return;

    modal.classList.add("hidden");
}

function initTransactionModal() {

    const openBtn = $("#addTransactionBtn");
    const closeBtn = $("#closeTransactionModal");

    if (openBtn) {
        openBtn.addEventListener("click", openTransactionModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeTransactionModal);
    }

    const form = $("#transactionForm");

    if (form) {
        form.addEventListener("submit", saveTransaction);
    }
    const modal = $("#transactionModal");

    if (modal) {
        modal.addEventListener("click", (e) => {

            if (e.target === modal) {
                closeTransactionModal();
            }

        });
    }
}
function saveTransaction(e) {

    e.preventDefault();

    const tx = {

        id: uid(),

        title: $("#txTitle").value.trim(),

        amount: Number($("#txAmount").value),

        category: $("#txCategory").value,

        type: $("#txType").value,

        date: $("#txDate").value,

        status: "completed",

        method: "Manual",

        notes: ""

    };

    if (!tx.title || !tx.amount || !tx.date) {
        alert("Please fill all fields.");
        return;
    }

    const transactions = load(userKey(K.tx), []);

    transactions.unshift(tx);

    save(userKey(K.tx), transactions);

    $("#transactionForm").reset();

    $("#txDate").value = new Date().toISOString().slice(0,10);

    closeTransactionModal();

    renderDashboard();

    alert("Transaction Added Successfully!");
}
/* ==========================================================
   Budget Progress
========================================================== */

function renderBudgetProgress() {

    const container = $("#budgetProgressList");

    if (!container) return;

    container.innerHTML = "";

    const budgets = load(K.budgets, []);

    const totals = monthTotals(thisMonth());

    budgets.forEach(budget => {

        const spent = totals.byCat[budget.category] || 0;

        const percent = Math.min(
            100,
            Math.round((spent / budget.limit) * 100)
        );

        const category = catById(budget.category);

        container.appendChild(

            el(
                "div",
                {
                    class: "progress-item"
                },

                el(
                    "div",
                    {
                        style: `
                        display:flex;
                        justify-content:space-between;
                        margin-bottom:8px;
                        `
                    },

                    el(
                        "span",
                        {},
                        category.name
                    ),

                    el(
                        "span",
                        {
                            style:"font-weight:600;"
                        },
                        `${fmt(spent)} / ${fmt(budget.limit)}`
                    )

                ),

                el(
                    "progress",
                    {
                        value: percent,
                        max: 100
                    }
                ),

                el(
                    "small",
                    {
                        style:`
                        display:block;
                        margin-top:8px;
                        color:#64748b;
                        `
                    },

                    `${percent}% used`

                )

            )

        );

    });

}

/* ==========================================================
   Theme
========================================================== */

function applyTheme(theme) {

    if (theme === "dark") {
        document.body.classList.add("dark");
        $("#themeIcon").className = "fa-solid fa-sun";
    } else {
        document.body.classList.remove("dark");
        $("#themeIcon").className = "fa-solid fa-moon";
    }

    localStorage.setItem("theme", theme);
}

function initTheme() {

    const savedTheme = localStorage.getItem("theme") || "light";

    applyTheme(savedTheme);

    $("#themeToggle")?.addEventListener("click", () => {

        const dark = document.body.classList.contains("dark");

        applyTheme(dark ? "light" : "dark");

    });

}
/* ==========================================================
   Profile Dropdown
========================================================== */

function initProfileMenu(){

    const profileBtn = $("#profileBtn");
    const profileMenu = $("#profileMenu");

    if(!profileBtn || !profileMenu) return;
    
    $("#logoutOption")?.addEventListener("click", () => {

    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;

    localStorage.removeItem(K.session);

    window.location.href = "../index.html";
});

profileBtn.addEventListener("click",(e)=>{

    e.stopPropagation();

    profileMenu.classList.toggle("hidden");

    profileBtn.classList.toggle("active");

});
    document.addEventListener("click",()=>{

        profileMenu.classList.add("hidden");

        profileBtn.classList.remove("active");

    });

    $("#themeOption")?.addEventListener("click",()=>{

        $("#themeToggle").click();

    });

}

/* ==========================================================
   Notifications
========================================================== */

/* ==========================================================
   Notifications
========================================================== */

function renderNotifications() {

    const list = $("#notificationList");
    const badge = $("#notificationBadge");

    if (!list) return;

    list.innerHTML = "";

    const notifications = load(K.notifs, []);

    badge.textContent = notifications.length;

    if (notifications.length === 0) {

        list.innerHTML = `
            <div class="notification-item">
                <p style="padding:20px;text-align:center;">
                    No notifications
                </p>
            </div>
        `;

        badge.style.display = "none";
        return;
    }

    badge.style.display = "flex";

    notifications.forEach(notification => {

        list.appendChild(

            el("div",
                { class: "notification-item" },

                el("h4", {}, notification.title),

                el("p", {}, notification.message)

            )

        );

    });

}

function initNotifications() {

    const btn = $("#notificationBtn");
    const panel = $("#notificationPanel");

    if (!btn || !panel) return;

    btn.addEventListener("click", (e) => {

        e.stopPropagation();

        panel.classList.toggle("hidden");

    });

    panel.addEventListener("click", (e) => {

        e.stopPropagation();

    });

    document.addEventListener("click", () => {

        panel.classList.add("hidden");

    });

    $("#clearNotifications")?.addEventListener("click", () => {

        save(K.notifs, []);

        renderNotifications();

    });

}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Dashboard Loaded");

    renderDashboard();



    initTransactionModal();

    if (load(K.notifs, []).length === 0) {

    save(K.notifs, [

        {
            title: "Welcome!",
            message: "Welcome to Finova 🚀"
        },

    ]);

}
    renderNotifications();

    initNotifications();
    initProfileMenu();
    initTheme();

    // ==========================================
// Register Elements
// ==========================================

const createAccount = document.getElementById("createAccount");
const forgotPassword = document.getElementById("forgotPassword");

const registerModal = document.getElementById("registerModal");
const forgotModal = document.getElementById("forgotModal");

const registerForm = document.getElementById("registerForm");
const forgotForm = document.getElementById("forgotForm");

const closeRegister = document.getElementById("closeRegister");
const closeForgot = document.getElementById("closeForgot");
});