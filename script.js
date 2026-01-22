/***********************
 * CONFIG
 ***********************/
const API_KEY_BASE64 =
  "QUl6YVN5QlBLOVZiOU9NUzhBWC0zNUZ6UDBRX0JmMWNNbU93UWVB";

const API_KEY = atob(API_KEY_BASE64);
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/***********************
 * STATE
 ***********************/
let DB = JSON.parse(localStorage.getItem('ecopulse_mobile_db') || '[]');
let currentData = { transport: 'walk', diet: 'vegan' };

/***********************
 * NAVIGATION
 ***********************/
const Nav = {
    go(id) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));

        document.getElementById(`tab-${id}`).classList.add('active');
        document.getElementById(`nav-${id}`)?.classList.add('active');
        document.getElementById(`m-nav-${id}`)?.classList.add('active');

        document.querySelector('main').scrollTo(0, 0);

        const titles = {
            dashboard: 'Analytics',
            log: 'Journal',
            history: 'Ledger',
            coach: 'Strategist'
        };
        document.getElementById('page-title').innerText = titles[id].toUpperCase();

        if (id === 'history') History.render();
        if (id === 'dashboard') Dashboard.update();

        lucide.createIcons();
    }
};

/***********************
 * JOURNAL
 ***********************/
const Log = {
    select(cat, val) {
        document.querySelectorAll(`[onclick*="Log.select('${cat}'"]`)
            .forEach(c => c.classList.remove('active'));

        event.currentTarget.classList.add('active');
        currentData[cat] = val;
    },

    submit() {
        const dist = parseFloat(document.getElementById('val-dist').value);
        const water = parseInt(document.getElementById('val-water').value);
        const digital = parseInt(document.getElementById('val-digital').value);

        const tMap = { walk: 0, transit: 0.1, ev: 0.04, car: 0.28, flight: 0.85 };
        const dMap = { vegan: 1.1, veg: 2.2, white: 4.4, red: 8.5 };

        const score =
            (dist * tMap[currentData.transport]) +
            dMap[currentData.diet] +
            (digital * 0.12);

        const entry = {
            id: Date.now(),
            date: new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
            }),
            carbon: score.toFixed(1),
            water: water * 9,
            meta: { ...currentData }
        };

        DB.unshift(entry);
        localStorage.setItem('ecopulse_mobile_db', JSON.stringify(DB));

        alert("Daily Log Saved.");
        Nav.go('dashboard');
    }
};

/***********************
 * DASHBOARD
 ***********************/
const Dashboard = {
    chart: null,

    update() {
        const logs = DB;

        document.getElementById('kpi-carbon').innerText =
            logs.length ? logs[0].carbon + ' kg' : '0.0 kg';

        document.getElementById('kpi-water').innerText =
            logs.length ? logs[0].water + ' L' : '0 L';

        document.getElementById('kpi-waste').innerText =
            logs.length ? (logs.length * 2) + ' items' : '0 items';

        document.getElementById('streak-count').innerText = logs.length;

        this.renderChart();
    },

    renderChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        const set = [...DB].slice(0, 5).reverse();

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: set.map(s => s.date),
                datasets: [{
                    data: set.map(s => s.carbon),
                    borderColor: '#143C28',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: '#143C28',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        grid: { color: '#F0EDE9' },
                        ticks: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 9, weight: 'bold' } }
                    }
                }
            }
        });
    }
};

/***********************
 * HISTORY
 ***********************/
const History = {
    render() {
        const list = document.getElementById('history-list');
        document.getElementById('history-badge').innerText =
            `${DB.length} ENTRIES`;

        if (!DB.length) {
            list.innerHTML =
                `<div class="p-20 text-center opacity-40 font-bold uppercase tracking-widest text-[9px]">
                    Ledger Empty
                </div>`;
            return;
        }

        list.innerHTML = DB.map(log => `
            <div class="bg-white p-4 rounded-2xl flex justify-between items-center border border-[#E8E4DE]">
                <div class="flex items-center gap-4">
                    <div class="bg-[#F7F5F2] w-10 h-10 flex items-center justify-center rounded-xl font-black text-[#143C28] text-sm">
                        ${log.date.split(' ')[1]}
                    </div>
                    <div>
                        <h4 class="font-bold text-[#143C28] text-[10px] uppercase tracking-widest">
                            ${log.meta.transport} • ${log.carbon}kg
                        </h4>
                        <p class="text-[8px] font-bold text-[#B0A89F]">
                            Resources: ${log.water}L H2O
                        </p>
                    </div>
                </div>
                <button onclick="Data.del(${log.id})" class="text-[#B0A89F] p-2">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');

        lucide.createIcons();
    }
};

/***********************
 * AI ENGINE (FIXED)
 ***********************/
const AI = {
    async getReport() {
        if (!DB.length) return alert("Log data first.");

        document.getElementById('ai-loading').classList.remove('hidden');
        document.getElementById('ai-results').classList.add('hidden');

        const context = DB.slice(0, 3)
            .map(l => `${l.carbon}kg CO2`)
            .join(', ');

        const prompt = `
Student Carbon History: ${context}

Return ONLY valid JSON.
No markdown. No formatting.

{
  "summary": "One plain sentence",
  "tips": [
    { "title": "Action", "desc": "Context" }
  ]
}
`;

        try {
            const r = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{
                        role: "user",
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!r.ok) {
                const err = await r.text();
                throw new Error(`HTTP ${r.status}: ${err}`);
            }

            const d = await r.json();

            const raw = d.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!raw) throw new Error("Empty AI response");

            const match = raw.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("No JSON in response");

            const json = JSON.parse(match[0]);

            document.getElementById('ai-summary').innerText = json.summary;
            document.getElementById('ai-grid').innerHTML = json.tips.map(t => `
                <div class="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <h4 class="text-[#D1E0D7] font-black text-[9px] uppercase mb-2 tracking-widest">
                        ${t.title}
                    </h4>
                    <p class="text-[11px] text-white/70 leading-relaxed font-medium">
                        ${t.desc}
                    </p>
                </div>
            `).join('');

            document.getElementById('ai-loading').classList.add('hidden');
            document.getElementById('ai-results').classList.remove('hidden');

        } catch (e) {
            console.error(e);
            alert("AI Sync Error – check console");
            document.getElementById('ai-loading').classList.add('hidden');
        }
    }
};

/***********************
 * DATA
 ***********************/
const Data = {
    del(id) {
        DB = DB.filter(l => l.id !== id);
        localStorage.setItem('ecopulse_mobile_db', JSON.stringify(DB));
        History.render();
        Dashboard.update();
    },

    wipe() {
        if (confirm("Confirm hard wipe?")) {
            localStorage.clear();
            location.reload();
        }
    }
};

/***********************
 * RANGE EVENTS
 ***********************/
document.getElementById('val-water').oninput =
    e => document.getElementById('label-water').innerText = e.target.value + ' Mins';

document.getElementById('val-dist').oninput =
    e => document.getElementById('label-dist').innerText = e.target.value + ' km';

document.getElementById('val-digital').oninput =
    e => document.getElementById('label-digital').innerText = e.target.value + ' Hrs';

/***********************
 * INIT
 ***********************/
window.onload = () => {
    lucide.createIcons();
    Dashboard.update();
};
