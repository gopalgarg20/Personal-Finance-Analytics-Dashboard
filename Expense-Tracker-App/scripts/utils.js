"use strict";

/* ==========================================================
   FINOVA - Utility Functions
   Part 1 : DOM, Currency & Date Helpers
========================================================== */

/* -------------------- DOM Helpers -------------------- */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    [...parent.querySelectorAll(selector)];

/* -------------------- Element Builder -------------------- */

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
        if (value == null) return;

        if (key === "class") {
            node.className = value;
        }
        else if (key === "style") {
            node.style.cssText = value;
        }
        else if (key.startsWith("data-")) {
            node.setAttribute(key, value);
        }
        else {
            node.setAttribute(key, value);
        }
    });

    children
        .flat()
        .filter(child => child != null)
        .forEach(child => {
            node.appendChild(
                child instanceof Node
                    ? child
                    : document.createTextNode(String(child))
            );
        });

    return node;
}

/* -------------------- Currency Helpers -------------------- */

const currency =
    () => load(K.settings, {}).currency || "INR";

const currencyFormatter =
    () =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency(),
            maximumFractionDigits: 0
        });

function fmt(value = 0) {
    return currencyFormatter().format(Number(value) || 0);
}

/* -------------------- Percentage -------------------- */

function pct(current, previous) {
    current = Number(current) || 0;
    previous = Number(previous) || 0;

    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }

    return Math.round(
        ((current - previous) / previous) * 100
    );
}

/* -------------------- Date Helpers -------------------- */

function thisMonth() {

    const d = new Date();

    const year = d.getFullYear();

    const month = String(d.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

function lastMonth() {
    const d = new Date();

    d.setMonth(d.getMonth() - 1);

    return d.toISOString().slice(0, 7);
}

function fmtDate(date) {
    return new Date(date).toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );
}
/* ==========================================================
   FINOVA - Utility Functions
   Part 2 : Financial Calculations
========================================================== */

/* -------------------- Transactions -------------------- */

function getTransactions() {
    return getUserTransactions();
}

/* -------------------- Balance -------------------- */

function balance() {
    const tx = getTransactions();

    return tx.reduce((total, t) => {
        const amount = Number(t.amount) || 0;

        if (t.type === "income")
            return total + amount;

        return total - amount;
    }, 0);
}

/* -------------------- Monthly Totals -------------------- */

function monthTotals(month) {

    const result = {
        income: 0,
        expense: 0,
        savings: 0,
        byCat: {}
    };

    const tx = getTransactions();
   

    tx.forEach(transaction => {

        if (!transaction.date) return;

        const txMonth = transaction.date.slice(0, 7);

        if (txMonth !== month)
            return;

        const amount = Number(transaction.amount) || 0;

        if (transaction.type === "income") {

            result.income += amount;

        } else {

            result.expense += amount;

            if (!result.byCat[transaction.category]) {
                result.byCat[transaction.category] = 0;
            }

            result.byCat[transaction.category] += amount;
        }

    });

    result.savings =
        result.income - result.expense;

    return result;
}

/* -------------------- Category Helpers -------------------- */

function totalCategoryExpense(categoryId, month = thisMonth()) {

    return monthTotals(month).byCat[categoryId] || 0;

}

function totalIncome(month = thisMonth()) {

    return monthTotals(month).income;

}

function totalExpense(month = thisMonth()) {

    return monthTotals(month).expense;

}

function totalSavings(month = thisMonth()) {

    return monthTotals(month).savings;

}

/* -------------------- Simple Stats -------------------- */

function transactionCount(month = null) {

    const tx = getTransactions();

    if (!month)
        return tx.length;

    return tx.filter(t =>
        t.date &&
        t.date.slice(0, 7) === month
    ).length;

}

function latestTransactions(limit = 5) {

    return getTransactions()
        .slice()
        .sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        )
        .slice(0, limit);

}
/* ==========================================================
   FINOVA - Utility Functions
   Part 3 : Category & General Helpers
========================================================== */

/* -------------------- Categories -------------------- */

function categories() {
    return load(K.categories, []);
}



/* -------------------- Budgets -------------------- */

function budgetByCategory(categoryId) {
    return load(K.budgets, []).find(
        b => b.category === categoryId
    );
}

/* -------------------- Goals -------------------- */

function totalGoalSavings() {
    return load(K.goals, []).reduce(
        (sum, goal) => sum + (Number(goal.saved) || 0),
        0
    );
}

/* -------------------- Monthly Helpers -------------------- */

function monthKey(date) {
    return new Date(date)
        .toISOString()
        .slice(0, 7);
}

function isCurrentMonth(date) {
    return monthKey(date) === thisMonth();
}

/* -------------------- Sorting -------------------- */

function sortNewest(arr) {
    return arr.sort(
        (a, b) =>
            new Date(b.date) -
            new Date(a.date)
    );
}

function sortOldest(arr) {
    return arr.sort(
        (a, b) =>
            new Date(a.date) -
            new Date(b.date)
    );
}


/* -------------------- Safe Number -------------------- */

function num(value) {
    value = Number(value);

    return isNaN(value) ? 0 : value;
}

/* -------------------- Clamp -------------------- */

function clamp(value, min, max) {
    return Math.min(
        Math.max(value, min),
        max
    );
}

/* -------------------- Percentage Helper -------------------- */

function percentage(value, total) {

    if (total <= 0)
        return 0;

    return Math.round(
        (value / total) * 100
    );
}

/* -------------------- Empty Check -------------------- */

function isEmpty(arr) {
    return !arr || arr.length === 0;
}

/* -------------------- Storage Wrapper -------------------- */

function saveData(key, value) {
    save(key, value);
}

function loadData(key, fallback) {
    return load(key, fallback);
}
/* ==========================================================
   FINOVA - Utility Functions
   Part 4 : Miscellaneous Helpers
========================================================== */

/* -------------------- Number Formatting -------------------- */

function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

/* -------------------- Date Comparison -------------------- */

function isToday(date) {
    const today = new Date().toISOString().slice(0, 10);
    return date === today;
}

/* -------------------- Deep Copy -------------------- */

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/* -------------------- Capitalize -------------------- */

function capitalize(text = "") {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/* -------------------- Sleep -------------------- */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------- Array Sum -------------------- */

function sum(arr) {
    return arr.reduce(
        (total, value) => total + (Number(value) || 0),
        0
    );
}

/* -------------------- Average -------------------- */

function average(arr) {
    if (!arr.length) return 0;

    return sum(arr) / arr.length;
}

/* -------------------- No-op -------------------- */

function noop() {}
