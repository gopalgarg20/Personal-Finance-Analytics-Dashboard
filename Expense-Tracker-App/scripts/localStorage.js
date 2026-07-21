"use strict";

/* ==========================================================
   FINOVA - Local Storage & Seed Data
========================================================== */

/* -------------------- Storage Keys -------------------- */

const K = {
    user: "finova.user",
    session: "finova.session",
    tx: "finova.tx",
    budgets: "finova.budgets",
    goals: "finova.goals",
    settings: "finova.settings",
    notifs: "finova.notifs",
    achievements: "finova.achievements",
    streak: "finova.streak",
    recurring: "finova.recurring",
    seeded: "finova.seeded",
};

function currentStorageKey(baseKey) {

    const session = load(K.session, null);

    if (!session || !session.email) {
        return baseKey;
    }

    return `${baseKey}.${session.email}`;

}
// ==========================================
// Current User Storage Keys
// ==========================================

function getCurrentUser() {
    return localStorage.getItem("currentUser") || "Guest";
}

function getStorageKey(baseKey) {
    return `${baseKey}_${getCurrentUser()}`;
}
/* -------------------- Storage Helpers -------------------- */

const load = (key, defaultValue) => {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch {
        return defaultValue;
    }
};

const save = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

function userKey(key) {

    const session = load(K.session, null);

    if (!session || !session.email) {
        return key;
    }

    return `${key}.${session.email}`;

}

/* -------------------- Transaction Storage -------------------- */

// Transactions are always stored per signed-in user. This prevents one
// account's financial data from appearing in another account's dashboard.
function getUserTransactions() {
    return load(userKey(K.tx), []);
}

function saveUserTransactions(transactions) {
    save(userKey(K.tx), transactions);
}

// Keeps old demo data available to the original demo account only.
// Newly registered accounts intentionally begin with an empty transaction list.
function migrateLegacyDemoTransactions() {
    const session = load(K.session, null);
    const isDemoUser = session?.email === "demo@finova.com";
    const scopedTransactionKey = userKey(K.tx);

    if (
        isDemoUser &&
        localStorage.getItem(scopedTransactionKey) === null &&
        localStorage.getItem(K.tx) !== null
    ) {
        save(scopedTransactionKey, load(K.tx, []));
    }
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* -------------------- Categories -------------------- */

const CATEGORIES = [
    {
        id: "food",
        name: "Food",
        icon: "utensils",
        color: "#F59E0B",
    },
    {
        id: "shopping",
        name: "Shopping",
        icon: "bag-shopping",
        color: "#EC4899",
    },
    {
        id: "transport",
        name: "Transport",
        icon: "car",
        color: "#14B8A6",
    },
    {
        id: "bills",
        name: "Bills",
        icon: "file-invoice",
        color: "#EF4444",
    },
    {
        id: "entertain",
        name: "Entertainment",
        icon: "clapperboard",
        color: "#7C3AED",
    },
    {
        id: "health",
        name: "Health",
        icon: "heart-pulse",
        color: "#22C55E",
    },
    {
        id: "education",
        name: "Education",
        icon: "book-open",
        color: "#2563EB",
    },
    {
        id: "travel",
        name: "Travel",
        icon: "plane",
        color: "#0EA5E9",
    },
    {
        id: "salary",
        name: "Salary",
        icon: "sack-dollar",
        color: "#22C55E",
    },
    {
        id: "freelance",
        name: "Freelance",
        icon: "briefcase",
        color: "#2563EB",
    },
    {
        id: "invest",
        name: "Investments",
        icon: "chart-line",
        color: "#10B981",
    },
    {
        id: "other",
        name: "Other",
        icon: "ellipsis",
        color: "#64748B",
    },
];

const catById = (id) => {
    return (
        CATEGORIES.find((category) => category.id === id) ||
        CATEGORIES[CATEGORIES.length - 1]
    );
};

/* -------------------- Seed Data -------------------- */

function seed() {
        if (load(K.seeded)) return;

    const today = new Date();
    const tx = [];

    // Generate data for the last 3 months
    for (let m = 2; m >= 0; m--) {

        const base = new Date(
            today.getFullYear(),
            today.getMonth() - m,
            1
        );

        /* ---------------- Income ---------------- */

        tx.push({
            id: uid(),
            title: "Monthly Salary",
            amount: 85000,
            type: "income",
            category: "salary",
            date: new Date(
                base.getFullYear(),
                base.getMonth(),
                1
            ).toISOString().slice(0, 10),
            method: "Bank Transfer",
            status: "completed",
            notes: ""
        });

        if (m !== 1) {
            tx.push({
                id: uid(),
                title: "Freelance Project",
                amount: 12000 + Math.floor(Math.random() * 8000),
                type: "income",
                category: "freelance",
                date: new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    14
                ).toISOString().slice(0, 10),
                method: "UPI",
                status: "completed"
            });
        }

        /* ---------------- Bills ---------------- */

        tx.push({
            id: uid(),
            title: "Netflix",
            amount: 649,
            type: "expense",
            category: "entertain",
            date: new Date(
                base.getFullYear(),
                base.getMonth(),
                5
            ).toISOString().slice(0, 10),
            method: "Credit Card",
            status: "completed"
        });

        tx.push({
            id: uid(),
            title: "Spotify",
            amount: 119,
            type: "expense",
            category: "entertain",
            date: new Date(
                base.getFullYear(),
                base.getMonth(),
                6
            ).toISOString().slice(0, 10),
            method: "Credit Card",
            status: "completed"
        });

        tx.push({
            id: uid(),
            title: "Electricity Bill",
            amount: 1850,
            type: "expense",
            category: "bills",
            date: new Date(
                base.getFullYear(),
                base.getMonth(),
                10
            ).toISOString().slice(0, 10),
            method: "UPI",
            status: "completed"
        });

        tx.push({
            id: uid(),
            title: "Internet - Airtel",
            amount: 999,
            type: "expense",
            category: "bills",
            date: new Date(
                base.getFullYear(),
                base.getMonth(),
                8
            ).toISOString().slice(0, 10),
            method: "Credit Card",
            status: "completed"
        });

        tx.push({
            id: uid(),
            title: "Rent",
            amount: 22000,
            type: "expense",
            category: "bills",
            date: new Date(
                base.getFullYear(),
                base.getMonth(),
                3
            ).toISOString().slice(0, 10),
            method: "Bank Transfer",
            status: "completed"
        });

        /* ---------------- Food ---------------- */

        const foodTitles = [
            "Blinkit",
            "Swiggy Order",
            "Zomato",
            "Groceries",
            "Cafe",
            "Restaurant"
        ];

        for (let i = 0; i < foodTitles.length; i++) {
            tx.push({
                id: uid(),
                title: foodTitles[i],
                amount: 250 + Math.floor(Math.random() * 900),
                type: "expense",
                category: "food",
                date: new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    3 + i * 4
                ).toISOString().slice(0, 10),
                method: ["UPI", "Credit Card", "Cash"][i % 3],
                status: "completed"
            });
        }

        /* ---------------- Shopping ---------------- */

        const shopping = ["Myntra", "Amazon", "Zara"];

        for (let i = 0; i < shopping.length; i++) {
            tx.push({
                id: uid(),
                title: shopping[i],
                amount: 800 + Math.floor(Math.random() * 3500),
                type: "expense",
                category: "shopping",
                date: new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    7 + i * 7
                ).toISOString().slice(0, 10),
                method: "Credit Card",
                status: "completed"
            });
        }
                /* ---------------- Transport ---------------- */

        const transport = ["Uber", "Ola", "Fuel", "Metro"];

        for (let i = 0; i < transport.length; i++) {
            tx.push({
                id: uid(),
                title: transport[i],
                amount: 120 + Math.floor(Math.random() * 600),
                type: "expense",
                category: "transport",
                date: new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    2 + i * 6
                ).toISOString().slice(0, 10),
                method: "UPI",
                status: "completed"
            });
        }

        /* ---------------- Occasional Expenses ---------------- */

        if (m === 1) {
            tx.push({
                id: uid(),
                title: "Weekend Trip",
                amount: 8500,
                type: "expense",
                category: "travel",
                date: new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    18
                ).toISOString().slice(0, 10),
                method: "Credit Card",
                status: "completed"
            });
        }

        if (m === 0) {
            tx.push({
                id: uid(),
                title: "Gym Membership",
                amount: 1500,
                type: "expense",
                category: "health",
                date: new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    4
                ).toISOString().slice(0, 10),
                method: "UPI",
                status: "completed"
            });
        }

        if (m === 2) {
            tx.push({
                id: uid(),
                title: "Online Course",
                amount: 4999,
                type: "expense",
                category: "education",
                date: new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    22
                ).toISOString().slice(0, 10),
                method: "Credit Card",
                status: "completed"
            });
        }

        /* ---------------- Investments ---------------- */

        tx.push({
            id: uid(),
            title: "SIP - Index Fund",
            amount: 10000,
            type: "expense",
            category: "invest",
            date: new Date(
                base.getFullYear(),
                base.getMonth(),
                15
            ).toISOString().slice(0, 10),
            method: "Bank Transfer",
            status: "completed"
        });
    }

    save(
        K.tx,
        tx.sort((a, b) => b.date.localeCompare(a.date))
    );

    /* ---------------- Budgets ---------------- */

    save(K.budgets, [
        {
            id: uid(),
            category: "food",
            limit: 8000
        },
        {
            id: uid(),
            category: "shopping",
            limit: 5000
        },
        {
            id: uid(),
            category: "transport",
            limit: 3000
        },
        {
            id: uid(),
            category: "entertain",
            limit: 2000
        },
        {
            id: uid(),
            category: "bills",
            limit: 26000
        }
    ]);

    const d = (days) => {
        const t = new Date();
        t.setDate(t.getDate() + days);
        return t.toISOString().slice(0, 10);
    };

    /* ---------------- Goals ---------------- */

    save(K.goals, [
        {
            id: uid(),
            title: "New MacBook Pro",
            target: 180000,
            saved: 62000,
            deadline: d(180),
            icon: "laptop"
        },
        {
            id: uid(),
            title: "Royal Enfield",
            target: 220000,
            saved: 48000,
            deadline: d(300),
            icon: "motorcycle"
        },
        {
            id: uid(),
            title: "Japan Trip",
            target: 250000,
            saved: 95000,
            deadline: d(365),
            icon: "plane"
        },
        {
            id: uid(),
            title: "Emergency Fund",
            target: 300000,
            saved: 210000,
            deadline: d(120),
            icon: "shield-halved"
        }
    ]);
        /* ---------------- Recurring Payments ---------------- */

    save(K.recurring, [
        {
            title: "Netflix",
            amount: 649,
            icon: "clapperboard",
            nextDate: d(4)
        },
        {
            title: "Spotify",
            amount: 119,
            icon: "music",
            nextDate: d(6)
        },
        {
            title: "Electricity",
            amount: 1850,
            icon: "bolt",
            nextDate: d(10)
        },
        {
            title: "Internet",
            amount: 999,
            icon: "wifi",
            nextDate: d(8)
        },
        {
            title: "Rent",
            amount: 22000,
            icon: "house",
            nextDate: d(3)
        }
    ]);

    /* ---------------- Notifications ---------------- */

    save(K.notifs, [
        {
            id: uid(),
            title: "Salary received",
            sub: "₹85,000 credited to your account",
            type: "success",
            icon: "sack-dollar",
            ts: Date.now() - 3 * 3600e3,
            unread: true
        },
        {
            id: uid(),
            title: "Budget alert",
            sub: "Food budget 82% used",
            type: "warning",
            icon: "triangle-exclamation",
            ts: Date.now() - 6 * 3600e3,
            unread: true
        },
        {
            id: uid(),
            title: "Recurring payment",
            sub: "Rent due in 3 days",
            type: "info",
            icon: "clock",
            ts: Date.now() - 12 * 3600e3,
            unread: true
        },
        {
            id: uid(),
            title: "Goal progress",
            sub: "Emergency Fund at 70%!",
            type: "success",
            icon: "bullseye",
            ts: Date.now() - 26 * 3600e3,
            unread: false
        }
    ]);

    /* ---------------- Achievements ---------------- */

    save(K.achievements, [
        {
            id: "first-tx",
            title: "First Transaction",
            sub: "Logged your first entry",
            icon: "flag",
            unlocked: true
        },
        {
            id: "saved-10k",
            title: "₹10,000 Saved",
            sub: "Reached your first milestone",
            icon: "piggy-bank",
            unlocked: true
        },
        {
            id: "tracked-30d",
            title: "30 Days Tracking",
            sub: "One month of consistency",
            icon: "calendar-check",
            unlocked: true
        },
        {
            id: "under-budget",
            title: "Stayed Under Budget",
            sub: "One month within limits",
            icon: "shield-halved",
            unlocked: false
        },
        {
            id: "saved-1l",
            title: "₹1,00,000 Saved",
            sub: "Six-figure savings",
            icon: "trophy",
            unlocked: false
        },
        {
            id: "streak-7",
            title: "7-Day Streak",
            sub: "A week of tracking",
            icon: "fire",
            unlocked: true
        }
    ]);

    /* ---------------- User Data ---------------- */

    save(K.streak, {
        current: 12,
        longest: 21,
        lastDate: new Date().toISOString().slice(0, 10)
    });

    save(K.settings, {
        name: "Aarav Kapoor",
        email: "demo@finova.com",
        currency: "INR",
        language: "English",
        notifications: true,
        theme: "light"
    });

    save(K.seeded, true);
}
