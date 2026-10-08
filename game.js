/* =========================================================
   NEON DASH
   Game Engine
   Original neon rhythm-platformer
   ========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const app = document.getElementById("app") || document.body;

    /* =====================================================
       SAVE SYSTEM
       ===================================================== */

    const SAVE_KEY = "neonDashSave_v1";

    const defaultSave = {
        username: "SAII",
        coins: 0,
        diamonds: 0,
        stars: 0,
        creatorPoints: 0,

        completedLevels: [],
        attempts: {},
        bestProgress: {},
        collectedCoins: {},
        achievements: [],

        createdLevels: 0,

        selectedCharacter: "cube",
        primaryColor: "#00f7ff",
        secondaryColor: "#8a2be2",
        trailEnabled: true,

        settings: {
            music: true,
            sound: true,
            musicVolume: 0.7,
            soundVolume: 0.8,
            screenShake: true,
            particles: true,
            glow: true,
            practiceMode: true,
            background: true
        },

        ownedItems: [
            "default-cube",
            "cyan-trail"
        ],

        selectedTrail: "cyan-trail"
    };

    function cloneDefaultSave() {
        return JSON.parse(JSON.stringify(defaultSave));
    }

    function loadSave() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);

            if (!raw) {
                return cloneDefaultSave();
            }

            const parsed = JSON.parse(raw);

            return mergeObjects(cloneDefaultSave(), parsed);
        } catch (error) {
            console.warn("Save data was invalid. Creating a new save.");
            return cloneDefaultSave();
        }
    }

    function mergeObjects(base, incoming) {
        if (!incoming || typeof incoming !== "object") {
            return base;
        }

        for (const key of Object.keys(incoming)) {
            if (
                incoming[key] &&
                typeof incoming[key] === "object" &&
                !Array.isArray(incoming[key]) &&
                base[key] &&
                typeof base[key] === "object"
            ) {
                base[key] = mergeObjects(base[key], incoming[key]);
            } else {
                base[key] = incoming[key];
            }
        }

        return base;
    }

    function saveGame() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(save));
        } catch (error) {
            console.warn("Unable to save game.");
        }
    }

    function resetSave() {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    }

    let save = loadSave();

    /* =====================================================
       LEVEL DATA
       ===================================================== */

    const LEVELS = [
        {
            id: 1,
            name: "Neon Start",
            difficulty: "Easy",
            stars: 5,
            length: 7000,
            speed: 270
        },
        {
            id: 2,
            name: "Neon Rush",
            difficulty: "Normal",
            stars: 7,
            length: 7800,
            speed: 300
        },
        {
            id: 3,
            name: "Neon Circuit",
            difficulty: "Hard",
            stars: 10,
            length: 8600,
            speed: 330
        },
        {
            id: 4,
            name: "Neon Factory",
            difficulty: "Harder",
            stars: 12,
            length: 9500,
            speed: 360
        },
        {
            id: 5,
            name: "Neon Storm",
            difficulty: "Insane",
            stars: 15,
            length: 10500,
            speed: 390
        },
        {
            id: 6,
            name: "Neon Apocalypse",
            difficulty: "Extreme",
            stars: 20,
            length: 11600,
            speed: 420
        }
    ];

    /* =====================================================
       GAME STATE
       ===================================================== */

    const state = {
        screen: "menu",
        selectedLevel: 1,

        running: false,
        paused: false,
        practice: false,

        lastTime: 0,
        accumulator: 0,

        audioStarted: false,

        game: null
    };

    /* =====================================================
       GAME OBJECT
       ===================================================== */

    function createGame(levelId, practice = false) {
        const level = LEVELS.find(item => item.id === levelId);

        const game = {
            level,
            practice,

            worldX: 0,
            speed: level.speed,

            player: {
                x: 180,
                y: 470,
                width: 42,
                height: 42,

                vy: 0,
                gravity: 1450,

                jumpPower: 575,

                grounded: false,
                dead: false,

                rotation: 0,

                color: save.primaryColor
            },

            cameraX: 0,

            objects: [],
            coins: [],
            portals: [],

            particles: [],

            attempts: (save.attempts[levelId] || 0) + 1,
            bestProgress: save.bestProgress[levelId] || 0,

            completed: false,
            completionRewarded: false,

            checkpoint: null
        };

        buildLevel(game);

        return game;
    }

    /* =====================================================
       LEVEL GENERATION
       ===================================================== */

    function addBlock(game, x, y, width, height) {
        game.objects.push({
            type: "block",
            x,
            y,
            width,
            height
        });
    }

    function addSpike(game, x, y, size = 42) {
        game.objects.push({
            type: "spike",
            x,
            y,
            width: size,
            height: size
        });
    }

    function addCoin(game, x, y) {
        game.coins.push({
            x,
            y,
            radius: 14,
            collected: false,
            rotation: 0
        });
    }

    function addSpeedPortal(game, x, multiplier) {
        game.portals.push({
            type: "speed",
            x,
            y: 310,
            width: 46,
            height: 120,
            multiplier
        });
    }

    function addGravityPortal(game, x) {
        game.portals.push({
            type: "gravity",
            x,
            y: 310,
            width: 46,
            height: 120
        });
    }

    function buildLevel(game) {
        const level = game.level;
        const id = level.id;

        // Ground sections.
        let groundX = 0;

        while (groundX < level.length + 1000) {
            addBlock(game, groundX, 560, 700, 160);
            groundX += 700;
        }

        // Original level patterns.
        const patterns = [
            [800, "spike"],
            [1050, "spike"],
            [1300, "double"],
            [1600, "block"],
            [1900, "spike"],
            [2200, "triple"],
            [2550, "block"],
            [2850, "spike"],
            [3200, "double"],
            [3500, "spike"],
            [3800, "block"],
            [4150, "triple"],
            [4500, "spike"],
            [4800, "double"],
            [5150, "block"],
            [5500, "spike"],
            [5850, "triple"],
            [6250, "block"],
            [6600, "double"],
            [7000, "spike"],
            [7350, "triple"],
            [7700, "block"],
            [8100, "spike"],
            [8500, "double"],
            [8900, "triple"],
            [9300, "spike"],
            [9700, "block"],
            [10100, "double"],
            [10500, "triple"],
            [10900, "spike"]
        ];

        patterns.forEach(([x, type], index) => {
            if (x >= level.length - 300) return;

            const difficultyOffset = Math.min(id * 7, 42);

            if (type === "spike") {
                addSpike(game, x, 518, 42);
            }

            if (type === "double") {
                addSpike(game, x, 518, 42);
                addSpike(game, x + 43, 518, 42);
            }

            if (type === "triple") {
                addSpike(game, x, 518, 42);
                addSpike(game, x + 43, 518, 42);
                addSpike(game, x + 86, 518, 42);
            }

            if (type === "block") {
                const height = 70 + difficultyOffset;
                addBlock(game, x, 560 - height, 80, height);
                addSpike(game, x + 80, 518, 42);
            }

            // Additional elevated platforms on harder levels.
            if (id >= 3 && index % 4 === 0) {
                addBlock(
                    game,
                    x + 150,
                    420,
                    130,
                    40
                );
            }
        });

        // Exactly three official coins.
        addCoin(game, level.length * 0.25, 430);
        addCoin(game, level.length * 0.52, 350);
        addCoin(game, level.length * 0.79, 430);

        // Speed progression.
        if (id >= 2) {
            addSpeedPortal(game, level.length * 0.35, 1.25);
        }

        if (id >= 4) {
            addSpeedPortal(game, level.length * 0.62, 1.45);
        }

        if (id >= 5) {
            addGravityPortal(game, level.length * 0.72);
        }

        if (id === 6) {
            addSpeedPortal(game, level.length * 0.82, 1.65);
        }
    }

    /* =====================================================
       DOM
       ===================================================== */

    let root;
    let canvas;
    let ctx;

    let currentScreenElement;

    function createInterface() {
        /*
         * We keep the original HTML loading structure,
         * then create the working application after startup.
         */

        app.innerHTML = "";

        root = document.createElement("div");
        root.id = "neonDashRoot";

        root.innerHTML = `
            <div id="nd-background"></div>

            <main id="nd-main">

                <section class="nd-screen" data-screen="menu">
                    <div class="nd-menu">

                        <div class="nd-logo">
                            <span>NEON</span>
                            <strong>DASH</strong>
                        </div>

                        <p class="nd-subtitle">
                            ORIGINAL NEON PLATFORM EXPERIENCE
                        </p>

                        <div class="nd-player-card">
                            <div class="nd-cube-preview">
                                <div class="nd-cube"></div>
                            </div>

                            <div>
                                <div class="nd-small-label">PLAYER</div>
                                <div class="nd-username" id="menuUsername"></div>
                            </div>

                            <div class="nd-stats">
                                <div>
                                    <span>COINS</span>
                                    <b id="menuCoins">0</b>
                                </div>
                                <div>
                                    <span>STARS</span>
                                    <b id="menuStars">0</b>
                                </div>
                                <div>
                                    <span>DIAMONDS</span>
                                    <b id="menuDiamonds">0</b>
                                </div>
                            </div>
                        </div>

                        <div class="nd-menu-buttons">
                            <button class="nd-primary" data-action="levels">
                                PLAY
                            </button>

                            <button data-action="editor">
                                CREATE
                            </button>

                            <button data-action="online">
                                ONLINE
                            </button>

                            <button data-action="profile">
                                PROFILE
                            </button>

                            <button data-action="achievements">
                                ACHIEVEMENTS
                            </button>

                            <button data-action="shop">
                                SHOP
                            </button>

                            <button data-action="settings">
                                SETTINGS
                            </button>
                        </div>

                        <div class="nd-daily">
                            <div>
                                <span class="nd-small-label">DAILY CHALLENGE</span>
                                <strong id="dailyName"></strong>
                            </div>
                            <button data-action="daily">PLAY</button>
                        </div>

                    </div>
                </section>

                <section class="nd-screen" data-screen="levels">
                    <div class="nd-header">
                        <button class="nd-back" data-action="menu">BACK</button>
                        <h1>LEVEL SELECT</h1>
                        <div></div>
                    </div>

                    <div class="nd-filters" id="difficultyFilters"></div>

                    <div class="nd-level-grid" id="levelGrid"></div>
                </section>

                <section class="nd-screen" data-screen="details">
                    <div class="nd-header">
                        <button class="nd-back" data-action="levels">BACK</button>
                        <h1>LEVEL DETAILS</h1>
                        <div></div>
                    </div>

                    <div id="levelDetails"></div>
                </section>

                <section class="nd-screen" data-screen="profile">
                    <div class="nd-header">
                        <button class="nd-back" data-action="menu">BACK</button>
                        <h1>PROFILE</h1>
                        <div></div>
                    </div>

                    <div id="profileContent"></div>
                </section>

                <section class="nd-screen" data-screen="achievements">
                    <div class="nd-header">
                        <button class="nd-back" data-action="menu">BACK</button>
                        <h1>ACHIEVEMENTS</h1>
                        <div></div>
                    </div>

                    <div id="achievementContent"></div>
                </section>

                <section class="nd-screen" data-screen="shop">
                    <div class="nd-header">
                        <button class="nd-back" data-action="menu">BACK</button>
                        <h1>SHOP</h1>
                        <div></div>
                    </div>

                    <div class="nd-currency">
                        COINS: <strong id="shopCoins">0</strong>
                    </div>

                    <div class="nd-shop-grid" id="shopGrid"></div>
                </section>

                <section class="nd-screen" data-screen="settings">
                    <div class="nd-header">
                        <button class="nd-back" data-action="menu">BACK</button>
                        <h1>SETTINGS</h1>
                        <div></div>
                    </div>

                    <div class="nd-settings" id="settingsContent"></div>
                </section>

                <section class="nd-screen" data-screen="online">
                    <div class="nd-header">
                        <button class="nd-back" data-action="menu">BACK</button>
                        <h1>ONLINE</h1>
                        <div></div>
                    </div>

                    <div class="nd-panel">
                        <h2>ONLINE HUB</h2>
                        <p>
                            Online services are prepared as a future
                            expansion. Your local progression is fully
                            available without an account or server.
                        </p>
                        <div class="nd-status">LOCAL MODE ACTIVE</div>
                    </div>
                </section>

                <section class="nd-screen" data-screen="editor">
                    <div class="nd-header">
                        <button class="nd-back" data-action="menu">BACK</button>
                        <h1>CREATE</h1>
                        <button data-action="editorSave">SAVE</button>
                    </div>

                    <div class="nd-editor">
                        <div class="nd-editor-toolbar">
                            <button data-tool="block">BLOCK</button>
                            <button data-tool="spike">SPIKE</button>
                            <button data-tool="coin">COIN</button>
                            <button data-tool="erase">ERASE</button>
                            <button data-action="editorTest">TEST</button>
                        </div>

                        <div class="nd-editor-info">
                            <span id="editorTool">BLOCK</span>
                            <span id="editorCount">0 OBJECTS</span>
                        </div>

                        <canvas id="editorCanvas"></canvas>
                    </div>
                </section>

                <section class="nd-screen" data-screen="game">
                    <div id="gameWrapper">

                        <canvas id="gameCanvas"></canvas>

                        <div id="gameHud">
                            <div class="nd-hud-left">
                                <strong id="hudLevel">NEON START</strong>
                                <span id="hudAttempt">ATTEMPT 1</span>
                            </div>

                            <div class="nd-progress">
                                <div id="progressBar"></div>
                            </div>

                            <div class="nd-hud-right">
                                <span id="hudProgress">0%</span>
                                <button id="pauseButton">PAUSE</button>
                            </div>
                        </div>

                        <div id="touchControls">
                            <button id="touchJump">JUMP</button>
                        </div>

                        <div id="gameOverlay" class="nd-game-overlay hidden"></div>
                    </div>
                </section>

            </main>
        `;

        app.appendChild(root);

        injectRuntimeStyles();

        canvas = document.getElementById("gameCanvas");
        ctx = canvas.getContext("2d");

        bindInterface();

        updateMenu();
        updateDailyChallenge();

        showScreen("menu");
    }

    /* =====================================================
       RUNTIME CSS
       ===================================================== */

    function injectRuntimeStyles() {
        const style = document.createElement("style");

        style.id = "neonDashRuntimeStyles";

        style.textContent = `
            #neonDashRoot {
                position: fixed;
                inset: 0;
                overflow: hidden;
                background: #03050d;
                color: #f4f7ff;
                font-family: Inter,system-ui,sans-serif;
            }

            #nd-background {
                position:absolute;
                inset:0;
                pointer-events:none;
                background:
                    radial-gradient(circle at 50% 35%,rgba(0,246,255,.10),transparent 28%),
                    radial-gradient(circle at 80% 70%,rgba(139,53,255,.12),transparent 30%),
                    linear-gradient(135deg,#02040b,#070b19 55%,#03050d);
            }

            #nd-background::before {
                content:"";
                position:absolute;
                inset:0;
                background-image:
                    linear-gradient(rgba(0,246,255,.035) 1px,transparent 1px),
                    linear-gradient(90deg,rgba(0,246,255,.035) 1px,transparent 1px);
                background-size:45px 45px;
                transform:perspective(500px) rotateX(55deg) scale(1.6);
                transform-origin:center bottom;
                opacity:.7;
            }

            #nd-main {
                position:relative;
                z-index:2;
                width:100%;
                height:100%;
            }

            .nd-screen {
                position:absolute;
                inset:0;
                display:none;
                overflow:auto;
                padding:24px;
            }

            .nd-screen.active {
                display:block;
            }

            .nd-menu {
                width:min(760px,100%);
                min-height:100%;
                margin:auto;
                display:flex;
                flex-direction:column;
                justify-content:center;
                align-items:center;
                gap:18px;
                text-align:center;
            }

            .nd-logo {
                font-size:clamp(48px,9vw,105px);
                font-weight:1000;
                letter-spacing:.08em;
                line-height:.9;
                text-shadow:
                    0 0 12px rgba(0,246,255,.65),
                    0 0 35px rgba(139,53,255,.35);
            }

            .nd-logo span {
                color:#00f6ff;
            }

            .nd-logo strong {
                color:#8b35ff;
            }

            .nd-subtitle,
            .nd-small-label {
                color:#7f8baa;
                letter-spacing:.18em;
                font-size:11px;
            }

            .nd-player-card {
                width:min(650px,100%);
                display:flex;
                align-items:center;
                gap:18px;
                padding:16px;
                border:1px solid rgba(0,246,255,.16);
                border-radius:18px;
                background:rgba(7,12,28,.78);
                box-shadow:0 0 30px rgba(0,246,255,.07);
            }

            .nd-cube-preview {
                width:60px;
                height:60px;
                display:grid;
                place-items:center;
            }

            .nd-cube {
                width:40px;
                height:40px;
                background:linear-gradient(135deg,#00f6ff,#8b35ff);
                border:2px solid white;
                box-shadow:0 0 20px #00f6ff;
                transform:rotate(8deg);
            }

            .nd-username {
                margin-top:5px;
                font-weight:800;
                font-size:20px;
            }

            .nd-stats {
                margin-left:auto;
                display:flex;
                gap:18px;
            }

            .nd-stats div {
                display:flex;
                flex-direction:column;
                gap:4px;
            }

            .nd-stats span {
                font-size:9px;
                color:#77829f;
                letter-spacing:.1em;
            }

            .nd-stats b {
                font-size:17px;
            }

            .nd-menu-buttons {
                width:min(480px,100%);
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
            }

            .nd-menu-buttons button,
            .nd-primary,
            .nd-header button,
            .nd-back,
            .nd-panel button,
            .nd-shop-item button,
            .nd-editor-toolbar button,
            #pauseButton {
                min-height:48px;
                padding:12px 18px;
                border-radius:11px;
                border:1px solid rgba(0,246,255,.20);
                background:rgba(10,17,38,.9);
                color:#f4f7ff;
                font-weight:800;
                letter-spacing:.08em;
                transition:.18s ease;
            }

            .nd-menu-buttons button:hover,
            .nd-header button:hover,
            .nd-editor-toolbar button:hover,
            .nd-shop-item button:hover {
                border-color:#00f6ff;
                transform:translateY(-2px);
                box-shadow:0 0 18px rgba(0,246,255,.18);
            }

            .nd-menu-buttons .nd-primary {
                grid-column:1/-1;
                background:linear-gradient(100deg,#00cfe0,#7c35ff);
                border-color:transparent;
                font-size:18px;
                box-shadow:0 0 28px rgba(0,246,255,.22);
            }

            .nd-daily {
                width:min(480px,100%);
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:15px;
                padding:13px 16px;
                border:1px solid rgba(255,228,92,.18);
                border-radius:12px;
                background:rgba(255,228,92,.04);
                text-align:left;
            }

            .nd-daily strong {
                display:block;
                margin-top:5px;
            }

            .nd-daily button {
                padding:10px 15px;
                border-radius:8px;
                background:#ffe45c;
                color:#111;
                font-weight:900;
            }

            .nd-header {
                max-width:1200px;
                margin:0 auto 24px;
                min-height:58px;
                display:grid;
                grid-template-columns:120px 1fr 120px;
                align-items:center;
                gap:12px;
                border-bottom:1px solid rgba(0,246,255,.12);
            }

            .nd-header h1 {
                text-align:center;
                font-size:clamp(20px,4vw,34px);
                letter-spacing:.1em;
            }

            .nd-header > :last-child {
                justify-self:end;
            }

            .nd-level-grid {
                max-width:1200px;
                margin:auto;
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:16px;
            }

            .nd-level-card {
                padding:20px;
                min-height:190px;
                border:1px solid rgba(0,246,255,.14);
                border-radius:18px;
                background:linear-gradient(145deg,rgba(10,17,38,.95),rgba(5,9,22,.95));
                cursor:pointer;
                transition:.2s ease;
            }

            .nd-level-card:hover {
                transform:translateY(-4px);
                border-color:rgba(0,246,255,.5);
                box-shadow:0 0 25px rgba(0,246,255,.12);
            }

            .nd-level-number {
                color:#00f6ff;
                font-size:12px;
                letter-spacing:.15em;
            }

            .nd-level-card h2 {
                margin:10px 0 5px;
                font-size:24px;
            }

            .nd-level-difficulty {
                color:#a28bff;
                font-weight:800;
            }

            .nd-level-meta {
                display:flex;
                justify-content:space-between;
                margin-top:28px;
                color:#8e9ab9;
                font-size:13px;
            }

            .nd-panel,
            .nd-details,
            .nd-profile-card,
            .nd-achievement,
            .nd-shop-item,
            .nd-setting {
                max-width:900px;
                margin:0 auto 14px;
                padding:22px;
                border:1px solid rgba(0,246,255,.14);
                border-radius:16px;
                background:rgba(8,14,31,.88);
            }

            .nd-panel h2 {
                margin-bottom:12px;
            }

            .nd-panel p {
                color:#a3adc4;
                line-height:1.6;
            }

            .nd-status {
                margin-top:20px;
                color:#32ff9a;
                font-weight:800;
            }

            .nd-details {
                text-align:center;
            }

            .nd-details h2 {
                font-size:38px;
                margin-bottom:8px;
            }

            .nd-big-play {
                margin-top:25px;
                width:min(360px,100%);
                min-height:58px;
                border-radius:12px;
                background:linear-gradient(100deg,#00d9e8,#8b35ff);
                color:white;
                font-weight:900;
                letter-spacing:.12em;
            }

            .nd-progress-large {
                height:12px;
                margin:18px 0;
                border-radius:20px;
                overflow:hidden;
                background:#151c32;
            }

            .nd-progress-large div {
                height:100%;
                background:linear-gradient(90deg,#00f6ff,#8b35ff,#ff29c8);
            }

            .nd-currency {
                max-width:900px;
                margin:0 auto 15px;
                text-align:right;
                font-weight:800;
            }

            .nd-shop-grid {
                max-width:1000px;
                margin:auto;
                display:grid;
                grid-template-columns:repeat(3,1fr);
                gap:15px;
            }

            .nd-shop-item {
                margin:0;
                min-height:180px;
            }

            .nd-shop-preview {
                height:70px;
                display:grid;
                place-items:center;
            }

            .nd-shop-cube {
                width:44px;
                height:44px;
                border:2px solid white;
                box-shadow:0 0 18px currentColor;
                transform:rotate(8deg);
            }

            .nd-shop-item h3 {
                margin:8px 0 5px;
            }

            .nd-shop-item p {
                color:#8e9ab9;
                font-size:13px;
                margin-bottom:12px;
            }

            .nd-setting {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:20px;
            }

            .nd-setting-info strong {
                display:block;
                margin-bottom:5px;
            }

            .nd-setting-info span {
                color:#7f8baa;
                font-size:13px;
            }

            .nd-switch {
                width:54px;
                height:30px;
                border-radius:30px;
                padding:3px;
                background:#20283e;
            }

            .nd-switch span {
                display:block;
                width:24px;
                height:24px;
                border-radius:50%;
                background:#76809a;
                transition:.2s;
            }

            .nd-switch.on {
                background:#075e69;
                box-shadow:0 0 15px rgba(0,246,255,.3);
            }

            .nd-switch.on span {
                transform:translateX(24px);
                background:#00f6ff;
            }

            #gameWrapper {
                position:absolute;
                inset:0;
                background:#02040b;
                overflow:hidden;
                touch-action:none;
            }

            #gameCanvas {
                position:absolute;
                inset:0;
                width:100%;
                height:100%;
                display:block;
                touch-action:none;
            }

            #gameHud {
                position:absolute;
                top:0;
                left:0;
                right:0;
                height:70px;
                padding:12px 18px;
                display:grid;
                grid-template-columns:220px 1fr 220px;
                align-items:center;
                gap:18px;
                pointer-events:none;
                background:linear-gradient(180deg,rgba(2,4,11,.85),transparent);
            }

            .nd-hud-left,
            .nd-hud-right {
                display:flex;
                align-items:center;
                gap:12px;
            }

            .nd-hud-left {
                flex-direction:column;
                align-items:flex-start;
            }

            .nd-hud-left strong {
                font-size:14px;
                letter-spacing:.1em;
            }

            .nd-hud-left span {
                color:#77829f;
                font-size:11px;
            }

            .nd-hud-right {
                justify-content:flex-end;
            }

            #hudProgress {
                font-weight:900;
            }

            .nd-progress {
                height:7px;
                border-radius:20px;
                background:rgba(255,255,255,.1);
                overflow:hidden;
            }

            #progressBar {
                width:0%;
                height:100%;
                background:linear-gradient(90deg,#00f6ff,#8b35ff,#ff29c8);
                box-shadow:0 0 14px #00f6ff;
            }

            #pauseButton {
                pointer-events:auto;
                min-height:36px;
                padding:7px 12px;
                font-size:11px;
                background:rgba(5,10,23,.85);
            }

            #touchControls {
                position:absolute;
                left:0;
                right:0;
                bottom:0;
                height:150px;
                pointer-events:none;
                display:none;
                align-items:flex-end;
                justify-content:flex-end;
                padding:20px;
            }

            #touchJump {
                pointer-events:auto;
                width:105px;
                height:105px;
                border-radius:50%;
                border:2px solid rgba(0,246,255,.6);
                background:rgba(0,246,255,.12);
                color:white;
                font-weight:900;
                box-shadow:0 0 30px rgba(0,246,255,.2);
                touch-action:none;
            }

            .nd-game-overlay {
                position:absolute;
                inset:0;
                z-index:10;
                display:flex;
                align-items:center;
                justify-content:center;
                background:rgba(2,4,12,.72);
                backdrop-filter:blur(8px);
            }

            .nd-game-overlay.hidden {
                display:none;
            }

            .nd-overlay-card {
                width:min(440px,90%);
                padding:30px;
                text-align:center;
                border:1px solid rgba(0,246,255,.3);
                border-radius:20px;
                background:rgba(8,14,31,.97);
                box-shadow:0 0 45px rgba(0,246,255,.13);
            }

            .nd-overlay-card h2 {
                font-size:32px;
                margin-bottom:10px;
            }

            .nd-overlay-card p {
                color:#8e9ab9;
                line-height:1.6;
                margin-bottom:20px;
            }

            .nd-overlay-buttons {
                display:grid;
                grid-template-columns:1fr 1fr;
                gap:10px;
            }

            .nd-overlay-buttons button {
                min-height:46px;
                border-radius:10px;
                background:#111a35;
                border:1px solid rgba(0,246,255,.2);
                color:white;
                font-weight:800;
            }

            .nd-overlay-buttons button:first-child {
                background:linear-gradient(100deg,#00cfe0,#793cff);
            }

            .nd-filters {
                max-width:1200px;
                margin:0 auto 18px;
                display:flex;
                flex-wrap:wrap;
                gap:8px;
            }

            .nd-filter {
                padding:8px 13px;
                border-radius:8px;
                border:1px solid rgba(0,246,255,.15);
                background:rgba(10,17,38,.8);
                color:#8995b2;
            }

            .nd-filter.active {
                color:#fff;
                border-color:#00f6ff;
                background:rgba(0,246,255,.1);
            }

            .nd-editor {
                max-width:1200px;
                height:calc(100% - 90px);
                margin:auto;
                display:flex;
                flex-direction:column;
                gap:10px;
            }

            .nd-editor-toolbar {
                display:flex;
                flex-wrap:wrap;
                gap:8px;
            }

            .nd-editor-toolbar button.active {
                border-color:#00f6ff;
                background:rgba(0,246,255,.12);
            }

            .nd-editor-info {
                display:flex;
                justify-content:space-between;
                color:#7f8baa;
                font-size:12px;
            }

            #editorCanvas {
                width:100%;
                flex:1;
                min-height:300px;
                border:1px solid rgba(0,246,255,.15);
                border-radius:15px;
                background:#03050d;
                touch-action:none;
            }

            @media (max-width:900px) {
                .nd-level-grid {
                    grid-template-columns:repeat(2,1fr);
                }

                .nd-shop-grid {
                    grid-template-columns:repeat(2,1fr);
                }

                #gameHud {
                    grid-template-columns:170px 1fr 130px;
                }
            }

            @media (max-width:650px) {
                .nd-screen {
                    padding:14px;
                }

                .nd-player-card {
                    flex-wrap:wrap;
                }

                .nd-stats {
                    width:100%;
                    margin-left:0;
                    justify-content:space-around;
                }

                .nd-menu-buttons {
                    grid-template-columns:1fr;
                }

                .nd-menu-buttons .nd-primary {
                    grid-column:auto;
                }

                .nd-level-grid,
                .nd-shop-grid {
                    grid-template-columns:1fr;
                }

                .nd-header {
                    grid-template-columns:80px 1fr 80px;
                }

                .nd-header h1 {
                    font-size:17px;
                }

                #gameHud {
                    height:58px;
                    grid-template-columns:1fr 80px;
                }

                .nd-progress {
                    display:none;
                }

                .nd-hud-left {
                    flex-direction:row;
                    gap:8px;
                }

                .nd-hud-left span {
                    display:none;
                }

                #touchControls {
                    display:flex;
                }
            }

            @media (orientation:portrait) and (max-width:700px) {
                #gameWrapper::after {
                    content:"ROTATE YOUR DEVICE TO LANDSCAPE";
                    position:absolute;
                    inset:0;
                    z-index:50;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:30px;
                    text-align:center;
                    font-weight:900;
                    letter-spacing:.15em;
                    font-size:18px;
                    background:#02040b;
                    color:#00f6ff;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* =====================================================
       NAVIGATION
       ===================================================== */

    function showScreen(name) {
        state.screen = name;

        document.querySelectorAll(".nd-screen").forEach(screen => {
            screen.classList.toggle(
                "active",
                screen.dataset.screen === name
            );
        });

        currentScreenElement =
            document.querySelector(
                `.nd-screen[data-screen="${name}"]`
            );

        if (name === "menu") updateMenu();
        if (name === "levels") renderLevels();
        if (name === "profile") renderProfile();
        if (name === "achievements") renderAchievements();
        if (name === "shop") renderShop();
        if (name === "settings") renderSettings();
        if (name === "editor") initEditor();
    }

    /* =====================================================
       BIND UI
       ===================================================== */

    function bindInterface() {
        root.addEventListener("click", event => {
            const actionButton =
                event.target.closest("[data-action]");

            if (actionButton) {
                handleAction(actionButton.dataset.action);
                return;
            }

            const levelCard =
                event.target.closest("[data-level]");

            if (levelCard) {
                state.selectedLevel =
                    Number(levelCard.dataset.level);

                renderLevelDetails();
                showScreen("details");
            }

            const filter =
                event.target.closest("[data-filter]");

            if (filter) {
                document
                    .querySelectorAll(".nd-filter")
                    .forEach(button =>
                        button.classList.remove("active")
                    );

                filter.classList.add("active");

                renderLevels(filter.dataset.filter);
            }

            const shopButton =
                event.target.closest("[data-buy]");

            if (shopButton) {
                buyShopItem(shopButton.dataset.buy);
            }

            const setting =
                event.target.closest("[data-setting]");

            if (setting) {
                toggleSetting(setting.dataset.setting);
            }

            const tool =
                event.target.closest("[data-tool]");

            if (tool) {
                selectEditorTool(tool.dataset.tool);
            }
        });

        document.addEventListener("keydown", handleKeyDown);

        canvas.addEventListener("pointerdown", event => {
            if (state.screen === "game") {
                event.preventDefault();
                jump();
            }
        });

        document.getElementById("touchJump")
            .addEventListener("pointerdown", event => {
                event.preventDefault();
                jump();
            });

        document.getElementById("pauseButton")
            .addEventListener("click", togglePause);

        window.addEventListener("resize", resizeCanvas);

        document.addEventListener(
            "visibilitychange",
            () => {
                if (
                    document.hidden &&
                    state.screen === "game" &&
                    state.running
                ) {
                    pauseGame();
                }
            }
        );
    }

    function handleAction(action) {
        switch (action) {
            case "menu":
                stopGame();
                showScreen("menu");
                break;

            case "levels":
                stopGame();
                showScreen("levels");
                break;

            case "profile":
                showScreen("profile");
                break;

            case "achievements":
                showScreen("achievements");
                break;

            case "shop":
                showScreen("shop");
                break;

            case "settings":
                showScreen("settings");
                break;

            case "online":
                showScreen("online");
                break;

            case "editor":
                showScreen("editor");
                break;

            case "daily":
                state.selectedLevel = getDailyLevel();
                renderLevelDetails();
                showScreen("details");
                break;

            case "play":
                startGame(state.selectedLevel, false);
                break;

            case "practice":
                startGame(state.selectedLevel, true);
                break;

            case "retry":
                startGame(state.selectedLevel, state.practice);
                break;

            case "resume":
                resumeGame();
                break;

            case "exitGame":
                stopGame();
                showScreen("levels");
                break;

            case "pause":
                togglePause();
                break;

            case "editorSave":
                saveEditor();
                break;

            case "editorTest":
                testEditor();
                break;
        }
    }

    /* =====================================================
       MENU
       ===================================================== */

    function updateMenu() {
        const username =
            document.getElementById("menuUsername");

        const coins =
            document.getElementById("menuCoins");

        const stars =
            document.getElementById("menuStars");

        const diamonds =
            document.getElementById("menuDiamonds");

        if (username) username.textContent = save.username;
        if (coins) coins.textContent = save.coins;
        if (stars) stars.textContent = save.stars;
        if (diamonds) diamonds.textContent = save.diamonds;
    }

    /* =====================================================
       DAILY CHALLENGE
       ===================================================== */

    function getDailyLevel() {
        const date = new Date();

        const seed =
            date.getFullYear() * 10000 +
            (date.getMonth() + 1) * 100 +
            date.getDate();

        return (seed % LEVELS.length) + 1;
    }

    function updateDailyChallenge() {
        const level = LEVELS[getDailyLevel() - 1];

        const element =
            document.getElementById("dailyName");

        if (element) {
            element.textContent =
                `${level.name} — ${level.difficulty}`;
        }
    }

    /* =====================================================
       LEVEL SELECT
       ===================================================== */

    let selectedFilter = "ALL";

    function renderLevels(filter = selectedFilter) {
        selectedFilter = filter;

        const filters =
            document.getElementById("difficultyFilters");

        const grid =
            document.getElementById("levelGrid");

        if (!filters || !grid) return;

        const difficulties = [
            "ALL",
            "Easy",
            "Normal",
            "Hard",
            "Harder",
            "Insane",
            "Extreme"
        ];

        filters.innerHTML = difficulties
            .map(item => `
                <button
                    class="nd-filter ${item === selectedFilter ? "active" : ""}"
                    data-filter="${item}">
                    ${item}
                </button>
            `)
            .join("");

        const levels =
            selectedFilter === "ALL"
                ? LEVELS
                : LEVELS.filter(
                    level =>
                        level.difficulty === selectedFilter
                );

        grid.innerHTML = levels
            .map(level => {
                const completed =
                    save.completedLevels.includes(level.id);

                const best =
                    save.bestProgress[level.id] || 0;

                const collected =
                    getCollectedCoins(level.id);

                return `
                    <div class="nd-level-card"
                         data-level="${level.id}">

                        <div class="nd-level-number">
                            LEVEL ${level.id}
                        </div>

                        <h2>${level.name}</h2>

                        <div class="nd-level-difficulty">
                            ${level.difficulty}
                        </div>

                        <div class="nd-level-meta">
                            <span>
                                ${level.stars} STARS
                            </span>

                            <span>
                                ${collected}/3 COINS
                            </span>

                            <span>
                                ${completed ? "COMPLETE" : best + "%"}
                            </span>
                        </div>
                    </div>
                `;
            })
            .join("");
    }

    /* =====================================================
       LEVEL DETAILS
       ===================================================== */

    function renderLevelDetails() {
        const level =
            LEVELS.find(
                item => item.id === state.selectedLevel
            );

        const container =
            document.getElementById("levelDetails");

        if (!container || !level) return;

        const best =
            save.bestProgress[level.id] || 0;

        const attempts =
            save.attempts[level.id] || 0;

        const collected =
            getCollectedCoins(level.id);

        const completed =
            save.completedLevels.includes(level.id);

        container.innerHTML = `
            <div class="nd-details">

                <div class="nd-small-label">
                    LEVEL ${level.id}
                </div>

                <h2>${level.name}</h2>

                <div class="nd-level-difficulty">
                    ${level.difficulty}
                </div>

                <div class="nd-progress-large">
                    <div style="width:${best}%"></div>
                </div>

                <p>
                    BEST PROGRESS: ${best}%<br>
                    ATTEMPTS: ${attempts}<br>
                    COINS: ${collected}/3<br>
                    REWARD: ${level.stars} STARS
                </p>

                <button
                    class="nd-big-play"
                    data-action="play">
                    ${completed ? "REPLAY LEVEL" : "PLAY LEVEL"}
                </button>

                <br><br>

                <button
                    data-action="practice"
                    class="nd-header-button">
                    PRACTICE MODE
                </button>

            </div>
        `;
    }

    /* =====================================================
       GAME START
       ===================================================== */

    function startGame(levelId, practice = false) {
        unlockAudio();

        state.selectedLevel = levelId;
        state.practice = practice;
        state.running = true;
        state.paused = false;

        state.game = createGame(levelId, practice);

        showScreen("game");

        resizeCanvas();

        updateHUD();

        requestAnimationFrame(gameLoop);

        attemptLandscape();
    }

    function stopGame() {
        state.running = false;
        state.paused = false;
        state.game = null;
        hideOverlay();
    }

    /* =====================================================
       LANDSCAPE
       ===================================================== */

    async function attemptLandscape() {
        try {
            if (
                screen.orientation &&
                screen.orientation.lock
            ) {
                await screen.orientation.lock("landscape");
            }
        } catch (error) {
            // Browser/device does not permit automatic locking.
        }
    }

    /* =====================================================
       CANVAS
       ===================================================== */

    function resizeCanvas() {
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();

        const dpr =
            Math.min(window.devicePixelRatio || 1, 2);

        canvas.width =
            Math.max(1, Math.floor(rect.width * dpr));

        canvas.height =
            Math.max(1, Math.floor(rect.height * dpr));

        ctx.setTransform(
            canvas.width / 1280,
            0,
            0,
            canvas.height / 720,
            0,
            0
        );
    }

    /* =====================================================
       INPUT
       ===================================================== */

    function handleKeyDown(event) {
        if (
            event.code === "Space" ||
            event.code === "ArrowUp" ||
            event.code === "KeyW"
        ) {
            event.preventDefault();

            if (state.screen === "game") {
                jump();
            }
        }

        if (
            event.code === "Escape" ||
            event.code === "KeyP"
        ) {
            if (state.screen === "game") {
                togglePause();
            }
        }
    }

    function jump() {
        if (
            !state.running ||
            state.paused ||
            !state.game
        ) {
            return;
        }

        const player = state.game.player;

        if (player.dead) return;

        if (player.grounded) {
            player.vy = -player.jumpPower;
            player.grounded = false;

            playTone(520, 0.07, "square");

            createParticles(
                player.x,
                player.y + player.height,
                8
            );
        }
    }

    /* =====================================================
       PHYSICS
       ===================================================== */

    function updateGame(dt) {
        const game = state.game;

        if (!game) return;

        const player = game.player;

        game.worldX += game.speed * dt;

        player.vy += player.gravity * dt;
        player.y += player.vy * dt;

        player.grounded = false;

        // Ground/platform collision.
        for (const object of game.objects) {
            if (
                object.type !== "block" &&
                object.type !== "platform"
            ) {
                continue;
            }

            if (
                player.x + player.width > object.x &&
                player.x < object.x + object.width &&
                player.y + player.height > object.y &&
                player.y + player.height - player.vy * dt <= object.y + 8 &&
                player.vy >= 0
            ) {
                player.y =
                    object.y - player.height;

                player.vy = 0;
                player.grounded = true;
            }
        }

        // Fall below world.
        if (player.y > 800) {
            killPlayer();
            return;
        }

        // Spike collision.
        for (const object of game.objects) {
            if (object.type !== "spike") continue;

            const hit =
                player.x + player.width - 7 > object.x &&
                player.x + 7 < object.x + object.width &&
                player.y + player.height - 5 > object.y + 8 &&
                player.y + 8 < object.y + object.height;

            if (hit) {
                killPlayer();
                return;
            }
        }

        // Coins.
        for (const coin of game.coins) {
            if (coin.collected) continue;

            coin.rotation += dt * 4;

            const dx =
                player.x +
                player.width / 2 -
                coin.x;

            const dy =
                player.y +
                player.height / 2 -
                coin.y;

            if (
                Math.sqrt(dx * dx + dy * dy) <
                32
            ) {
                collectCoin(game, coin);
            }
        }

        // Portals.
        for (const portal of game.portals) {
            if (
                player.x + player.width > portal.x &&
                player.x < portal.x + portal.width &&
                player.y + player.height > portal.y &&
                player.y < portal.y + portal.height
            ) {
                activatePortal(game, portal);
            }
        }

        // Rotation.
        if (!player.grounded) {
            player.rotation += dt * 7;
        } else {
            const quarterTurn =
                Math.PI / 2;

            player.rotation =
                Math.round(
                    player.rotation /
                    quarterTurn
                ) * quarterTurn;
        }

        // Progress based on world position.
        const progress =
            Math.min(
                100,
                Math.max(
                    0,
                    (game.worldX /
                        game.level.length) *
                    100
                )
            );

        if (
            progress >
            game.bestProgress
        ) {
            game.bestProgress =
                Math.floor(progress);

            if (!game.practice) {
                save.bestProgress[
                    game.level.id
                ] = game.bestProgress;

                saveGame();
            }
        }

        if (progress >= 100) {
            completeLevel();
        }

        updateParticles(dt);
    }

    /* =====================================================
       CAMERA
       ===================================================== */

    function updateCamera() {
        if (!state.game) return;

        state.game.cameraX =
            Math.max(
                0,
                state.game.worldX - 250
            );
    }

    /* =====================================================
       DEATH
       ===================================================== */

    function killPlayer() {
        const game = state.game;

        if (!game || game.player.dead) return;

        game.player.dead = true;

        createParticles(
            game.player.x,
            game.player.y,
            25
        );

        playTone(120, 0.22, "sawtooth");

        state.running = false;

        if (!game.practice) {
            save.attempts[game.level.id] =
                game.attempts;

            save.bestProgress[game.level.id] =
                game.bestProgress;

            saveGame();
        }

        setTimeout(() => {
            showDeathOverlay();
        }, 250);
    }

    function showDeathOverlay() {
        const game = state.game;

        if (!game) return;

        const progress =
            Math.floor(
                Math.min(
                    100,
                    game.bestProgress
                )
            );

        showOverlay(`
            <div class="nd-overlay-card">
                <div class="nd-small-label">
                    RUN ENDED
                </div>

                <h2>TRY AGAIN</h2>

                <p>
                    Progress: ${progress}%<br>
                    Attempt: ${game.attempts}
                </p>

                <div class="nd-overlay-buttons">
                    <button data-action="retry">
                        RETRY
                    </button>

                    <button data-action="exitGame">
                        EXIT
                    </button>
                </div>
            </div>
        `);
    }

    /* =====================================================
       COMPLETION
       ===================================================== */

    function completeLevel() {
        const game = state.game;

        if (
            !game ||
            game.completed ||
            game.completionRewarded
        ) {
            return;
        }

        game.completed = true;
        game.completionRewarded = true;

        state.running = false;

        playTone(740, 0.12, "sine");
        setTimeout(
            () => playTone(980, 0.18, "sine"),
            100
        );

        if (!game.practice) {
            const id = game.level.id;

            if (!save.completedLevels.includes(id)) {
                save.completedLevels.push(id);
                save.stars += game.level.stars;
            }

            save.attempts[id] =
                game.attempts;

            save.bestProgress[id] = 100;

            updateAchievements();

            saveGame();
        }

        showCompletionOverlay();
    }

    function showCompletionOverlay() {
        const game = state.game;

        const collected =
            game.coins.filter(
                coin => coin.collected
            ).length;

        showOverlay(`
            <div class="nd-overlay-card">
                <div class="nd-small-label">
                    LEVEL COMPLETE
                </div>

                <h2>COMPLETE</h2>

                <p>
                    ${game.level.name}<br>
                    STARS: ${game.level.stars}<br>
                    COINS: ${collected}/3<br>
                    ATTEMPTS: ${game.attempts}
                </p>

                <div class="nd-overlay-buttons">
                    <button data-action="retry">
                        REPLAY
                    </button>

                    <button data-action="levels">
                        LEVELS
                    </button>
                </div>
            </div>
        `);
    }

    /* =====================================================
       OVERLAY
       ===================================================== */

    function showOverlay(html) {
        const overlay =
            document.getElementById("gameOverlay");

        if (!overlay) return;

        overlay.innerHTML = html;
        overlay.classList.remove("hidden");
    }

    function hideOverlay() {
        const overlay =
            document.getElementById("gameOverlay");

        if (!overlay) return;

        overlay.innerHTML = "";
        overlay.classList.add("hidden");
    }

    /* =====================================================
       PAUSE
       ===================================================== */

    function togglePause() {
        if (
            !state.game ||
            !state.running
        ) {
            return;
        }

        if (state.paused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }

    function pauseGame() {
        if (!state.game) return;

        state.paused = true;

        showOverlay(`
            <div class="nd-overlay-card">
                <div class="nd-small-label">
                    GAME PAUSED
                </div>

                <h2>PAUSED</h2>

                <div class="nd-overlay-buttons">
                    <button data-action="resume">
                        RESUME
                    </button>

                    <button data-action="retry">
                        RESTART
                    </button>

                    <button data-action="settings">
                        SETTINGS
                    </button>

                    <button data-action="exitGame">
                        EXIT
                    </button>
                </div>
            </div>
        `);
    }

    function resumeGame() {
        state.paused = false;
        state.running = true;
        hideOverlay();
    }

    /* =====================================================
       COINS
       ===================================================== */

    function getCollectedCoins(levelId) {
        const coins =
            save.collectedCoins[levelId];

        if (!Array.isArray(coins)) {
            return 0;
        }

        return coins.length;
    }

    function collectCoin(game, coin) {
        coin.collected = true;

        const coinIndex =
            game.coins.indexOf(coin);

        if (!game.practice) {
            if (!save.collectedCoins[game.level.id]) {
                save.collectedCoins[game.level.id] = [];
            }

            if (
                !save.collectedCoins[
                    game.level.id
                ].includes(coinIndex)
            ) {
                save.collectedCoins[
                    game.level.id
                ].push(coinIndex);

                save.coins += 1;
            }

            updateAchievements();
            saveGame();
        }

        createParticles(
            coin.x,
            coin.y,
            12
        );

        playTone(880, 0.08, "triangle");
    }

    /* =====================================================
       PORTALS
       ===================================================== */

    function activatePortal(game, portal) {
        if (portal.used) return;

        portal.used = true;

        if (portal.type === "speed") {
            game.speed =
                game.level.speed *
                portal.multiplier;

            playTone(420, 0.1, "sawtooth");
        }

        if (portal.type === "gravity") {
            game.player.gravity *= -1;
            game.player.jumpPower *= -1;

            playTone(300, 0.12, "square");
        }

        createParticles(
            portal.x,
            portal.y + portal.height / 2,
            20
        );
    }

    /* =====================================================
       PARTICLES
       ===================================================== */

    function createParticles(x, y, amount) {
        if (!save.settings.particles) return;

        if (!state.game) return;

        for (let i = 0; i < amount; i++) {
            state.game.particles.push({
                x,
                y,
                vx:
                    (Math.random() - 0.5) *
                    240,
                vy:
                    (Math.random() - 0.5) *
                    240,
                life: 0.4 + Math.random() * 0.5,
                maxLife: 0.9
            });
        }
    }

    function updateParticles(dt) {
        if (!state.game) return;

        for (
            let i = state.game.particles.length - 1;
            i >= 0;
            i--
        ) {
            const particle =
                state.game.particles[i];

            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;

            particle.life -= dt;

            if (particle.life <= 0) {
                state.game.particles.splice(i, 1);
            }
        }
    }

    /* =====================================================
       DRAW GAME
       ===================================================== */

    function drawGame() {
        if (!ctx || !state.game) return;

        const game = state.game;

        ctx.setTransform(
            canvas.width / 1280,
            0,
            0,
            canvas.height / 720,
            0,
            0
        );

        ctx.clearRect(0, 0, 1280, 720);

        drawBackground(game);

        ctx.save();

        ctx.translate(
            -game.cameraX,
            0
        );

        drawWorld(game);
        drawCoins(game);
        drawPortals(game);
        drawParticles(game);
        drawPlayer(game);

        ctx.restore();
    }

    function drawBackground(game) {
        const gradient =
            ctx.createLinearGradient(
                0,
                0,
                0,
                720
            );

        gradient.addColorStop(
            0,
            "#02040d"
        );

        gradient.addColorStop(
            1,
            "#08132a"
        );

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1280, 720);

        if (!save.settings.background) {
            return;
        }

        ctx.strokeStyle =
            "rgba(0,246,255,.07)";

        ctx.lineWidth = 1;

        const offset =
            -(state.game.worldX % 60);

        for (
            let x = offset;
            x < 1280;
            x += 60
        ) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 720);
            ctx.stroke();
        }

        for (
            let y = 80;
            y < 720;
            y += 60
        ) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(1280, y);
            ctx.stroke();
        }

        // Neon horizon.
        ctx.fillStyle =
            "rgba(0,246,255,.06)";

        ctx.fillRect(
            0,
            550,
            1280,
            3
        );
    }

    function drawWorld(game) {
        for (const object of game.objects) {
            const screenX =
                object.x;

            if (
                screenX <
                    game.cameraX - 150 ||
                screenX >
                    game.cameraX + 1450
            ) {
                continue;
            }

            if (
                object.type === "block" ||
                object.type === "platform"
            ) {
                drawBlock(object);
            }

            if (object.type === "spike") {
                drawSpike(object);
            }
        }
    }

    function drawBlock(object) {
        const gradient =
            ctx.createLinearGradient(
                object.x,
                object.y,
                object.x,
                object.y +
                    object.height
            );

        gradient.addColorStop(
            0,
            "#112d4f"
        );

        gradient.addColorStop(
            1,
            "#081124"
        );

        ctx.fillStyle = gradient;

        ctx.shadowBlur =
            save.settings.glow ? 15 : 0;

        ctx.shadowColor =
            "#00f6ff";

        ctx.fillRect(
            object.x,
            object.y,
            object.width,
            object.height
        );

        ctx.shadowBlur = 0;

        ctx.strokeStyle =
            "rgba(0,246,255,.65)";

        ctx.lineWidth = 2;

        ctx.strokeRect(
            object.x,
            object.y,
            object.width,
            object.height
        );
    }

    function drawSpike(object) {
        ctx.beginPath();

        ctx.moveTo(
            object.x,
            object.y +
                object.height
        );

        ctx.lineTo(
            object.x +
                object.width / 2,
            object.y
        );

        ctx.lineTo(
            object.x +
                object.width,
            object.y +
                object.height
        );

        ctx.closePath();

        ctx.fillStyle = "#ff29c8";

        ctx.shadowBlur =
            save.settings.glow ? 18 : 0;

        ctx.shadowColor =
            "#ff29c8";

        ctx.fill();

        ctx.shadowBlur = 0;
    }

    function drawCoins(game) {
        for (const coin of game.coins) {
            if (coin.collected) continue;

            ctx.save();

            ctx.translate(
                coin.x,
                coin.y
            );

            ctx.rotate(
                coin.rotation
            );

            ctx.beginPath();

            ctx.arc(
                0,
                0,
                coin.radius,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "#ffe45c";

            ctx.shadowBlur =
                save.settings.glow ? 22 : 0;

            ctx.shadowColor =
                "#ffe45c";

            ctx.fill();

            ctx.shadowBlur = 0;

            ctx.strokeStyle =
                "#fff7b0";

            ctx.lineWidth = 3;

            ctx.stroke();

            ctx.restore();
        }
    }

    function drawPortals(game) {
        for (const portal of game.portals) {
            if (portal.used) continue;

            const color =
                portal.type === "speed"
                    ? "#8b35ff"
                    : "#ff29c8";

            ctx.save();

            ctx.strokeStyle = color;
            ctx.lineWidth = 5;

            ctx.shadowBlur =
                save.settings.glow ? 25 : 0;

            ctx.shadowColor = color;

            ctx.beginPath();

            ctx.ellipse(
                portal.x +
                    portal.width / 2,
                portal.y +
                    portal.height / 2,
                portal.width / 2,
                portal.height / 2,
                0,
                0,
                Math.PI * 2
            );

            ctx.stroke();

            ctx.restore();
        }
    }

    function drawParticles(game) {
        for (const particle of game.particles) {
            const alpha =
                Math.max(
                    0,
                    particle.life /
                        particle.maxLife
                );

            ctx.globalAlpha = alpha;

            ctx.fillStyle =
                "#00f6ff";

            ctx.fillRect(
                particle.x,
                particle.y,
                5,
                5
            );

            ctx.globalAlpha = 1;
        }
    }

    function drawPlayer(game) {
        const player = game.player;

        ctx.save();

        ctx.translate(
            player.x +
                player.width / 2,
            player.y +
                player.height / 2
        );

        ctx.rotate(
            player.rotation
        );

        ctx.shadowBlur =
            save.settings.glow ? 25 : 0;

        ctx.shadowColor =
            player.color;

        const gradient =
            ctx.createLinearGradient(
                -20,
                -20,
                20,
                20
            );

        gradient.addColorStop(
            0,
            player.color
        );

        gradient.addColorStop(
            1,
            save.secondaryColor
        );

        ctx.fillStyle = gradient;

        ctx.fillRect(
            -21,
            -21,
            42,
            42
        );

        ctx.shadowBlur = 0;

        ctx.strokeStyle =
            "#ffffff";

        ctx.lineWidth = 2;

        ctx.strokeRect(
            -21,
            -21,
            42,
            42
        );

        // Original simple face.
        ctx.fillStyle = "#03101b";

        ctx.fillRect(
            -12,
            -7,
            7,
            7
        );

        ctx.fillRect(
            5,
            -7,
            7,
            7
        );

        ctx.restore();
    }

    /* =====================================================
       GAME LOOP
       ===================================================== */

    function gameLoop(timestamp) {
        if (!state.running) {
            drawGame();
            return;
        }

        if (!state.lastTime) {
            state.lastTime = timestamp;
        }

        let dt =
            (timestamp -
                state.lastTime) /
            1000;

        state.lastTime = timestamp;

        // Prevent huge physics jumps.
        dt = Math.min(dt, 0.033);

        if (!state.paused) {
            updateGame(dt);
            updateCamera();
            updateHUD();
            drawGame();
        }

        requestAnimationFrame(gameLoop);
    }

    /* =====================================================
       HUD
       ===================================================== */

    function updateHUD() {
        const game = state.game;

        if (!game) return;

        const progress =
            Math.min(
                100,
                Math.floor(
                    (game.worldX /
                        game.level.length) *
                    100
                )
            );

        document.getElementById(
            "hudLevel"
        ).textContent =
            game.level.name;

        document.getElementById(
            "hudAttempt"
        ).textContent =
            `ATTEMPT ${game.attempts}`;

        document.getElementById(
            "hudProgress"
        ).textContent =
            `${progress}%`;

        document.getElementById(
            "progressBar"
        ).style.width =
            `${progress}%`;
    }

    /* =====================================================
       PROFILE
       ===================================================== */

    function renderProfile() {
        const container =
            document.getElementById(
                "profileContent"
            );

        if (!container) return;

        const completed =
            save.completedLevels.length;

        const totalStars =
            LEVELS.reduce(
                (sum, level) =>
                    sum + level.stars,
                0
            );

        const progress =
            Math.floor(
                (completed /
                    LEVELS.length) *
                100
            );

        container.innerHTML = `
            <div class="nd-profile-card">
                <div class="nd-small-label">
                    PLAYER
                </div>

                <h2>${save.username}</h2>

                <p>
                    Levels completed:
                    ${completed}/${LEVELS.length}
                </p>

                <div class="nd-progress-large">
                    <div style="width:${progress}%"></div>
                </div>

                <p>
                    Stars: ${save.stars}/${totalStars}<br>
                    Coins: ${save.coins}<br>
                    Diamonds: ${save.diamonds}<br>
                    Creator Points: ${save.creatorPoints}<br>
                    Created Levels: ${save.createdLevels}
                </p>
            </div>
        `;
    }

    /* =====================================================
       ACHIEVEMENTS
       ===================================================== */

    const ACHIEVEMENTS = [
        {
            id: "first-step",
            name: "FIRST STEP",
            description: "Complete 1 level."
        },
        {
            id: "collector",
            name: "COLLECTOR",
            description: "Collect 10 coins."
        },
        {
            id: "speedrunner",
            name: "SPEEDRUNNER",
            description: "Complete a level."
        },
        {
            id: "creator",
            name: "CREATOR",
            description: "Create and save a level."
        },
        {
            id: "master",
            name: "MASTER",
            description: "Earn 50 stars."
        },
        {
            id: "perfect",
            name: "PERFECT RUN",
            description: "Complete a level without dying."
        }
    ];

    function updateAchievements() {
        const unlocked = new Set(
            save.achievements
        );

        if (
            save.completedLevels.length >= 1
        ) {
            unlocked.add("first-step");
            unlocked.add("speedrunner");
        }

        if (save.coins >= 10) {
            unlocked.add("collector");
        }

        if (save.creatorPoints > 0) {
            unlocked.add("creator");
        }

        if (save.stars >= 50) {
            unlocked.add("master");
        }

        save.achievements =
            Array.from(unlocked);

        saveGame();
    }

    function renderAchievements() {
        updateAchievements();

        const container =
            document.getElementById(
                "achievementContent"
            );

        if (!container) return;

        container.innerHTML =
            ACHIEVEMENTS.map(item => {
                const unlocked =
                    save.achievements.includes(
                        item.id
                    );

                return `
                    <div class="nd-achievement"
                         style="opacity:${unlocked ? 1 : .55}">

                        <div class="nd-small-label">
                            ${unlocked ? "UNLOCKED" : "LOCKED"}
                        </div>

                        <h2>${item.name}</h2>

                        <p>
                            ${item.description}
                        </p>
                    </div>
                `;
            }).join("");
    }

    /* =====================================================
       SHOP
       ===================================================== */

    const SHOP_ITEMS = [
        {
            id: "cyan-trail",
            name: "CYAN TRAIL",
            description: "Classic neon trail.",
            price: 0,
            color: "#00f6ff"
        },
        {
            id: "purple-trail",
            name: "PURPLE TRAIL",
            description: "Deep violet energy trail.",
            price: 25,
            color: "#8b35ff"
        },
        {
            id: "pink-trail",
            name: "PINK TRAIL",
            description: "Bright pink energy trail.",
            price: 40,
            color: "#ff29c8"
        },
        {
            id: "green-cube",
            name: "NEON GREEN",
            description: "Alternative cube color.",
            price: 50,
            color: "#32ff9a"
        },
        {
            id: "gold-cube",
            name: "GOLD CORE",
            description: "Premium-looking gold cube.",
            price: 100,
            color: "#ffe45c"
        }
    ];

    function renderShop() {
        const container =
            document.getElementById(
                "shopGrid"
            );

        const currency =
            document.getElementById(
                "shopCoins"
            );

        if (!container) return;

        if (currency) {
            currency.textContent =
                save.coins;
        }

        container.innerHTML =
            SHOP_ITEMS.map(item => {
                const owned =
                    save.ownedItems.includes(
                        item.id
                    );

                const selected =
                    save.selectedTrail ===
                    item.id;

                return `
                    <div class="nd-shop-item">

                        <div
                            class="nd-shop-preview"
                            style="color:${item.color}">
                            <div
                                class="nd-shop-cube"
                                style="
                                    background:${item.color};
                                    color:${item.color};
                                ">
                            </div>
                        </div>

                        <h3>${item.name}</h3>

                        <p>${item.description}</p>

                        <button
                            data-buy="${item.id}">
                            ${
                                selected
                                    ? "SELECTED"
                                    : owned
                                        ? "EQUIP"
                                        : `${item.price} COINS`
                            }
                        </button>
                    </div>
                `;
            }).join("");
    }

    function buyShopItem(id) {
        const item =
            SHOP_ITEMS.find(
                entry => entry.id === id
            );

        if (!item) return;

        const owned =
            save.ownedItems.includes(id);

        if (!owned) {
            if (save.coins < item.price) {
                alert("Not enough coins.");
                return;
            }

            save.coins -= item.price;
            save.ownedItems.push(id);
        }

        save.selectedTrail = id;

        if (
            item.id === "green-cube" ||
            item.id === "gold-cube"
        ) {
            save.primaryColor =
                item.color;
        }

        saveGame();

        renderShop();
        updateMenu();
    }

    /* =====================================================
       SETTINGS
       ===================================================== */

    function renderSettings() {
        const container =
            document.getElementById(
                "settingsContent"
            );

        if (!container) return;

        const settings = save.settings;

        const makeToggle = (
            key,
            title,
            description
        ) => `
            <div class="nd-setting">

                <div class="nd-setting-info">
                    <strong>${title}</strong>
                    <span>${description}</span>
                </div>

                <button
                    class="nd-switch ${
                        settings[key] ? "on" : ""
                    }"
                    data-setting="${key}">
                    <span></span>
                </button>
            </div>
        `;

        container.innerHTML = `
            ${makeToggle(
                "music",
                "MUSIC",
                "Enable generated game music."
            )}

            ${makeToggle(
                "sound",
                "SOUND",
                "Enable gameplay sound effects."
            )}

            ${makeToggle(
                "particles",
                "PARTICLES",
                "Enable gameplay particles."
            )}

            ${makeToggle(
                "glow",
                "GLOW",
                "Enable neon glow effects."
            )}

            ${makeToggle(
                "background",
                "BACKGROUND",
                "Enable animated background effects."
            )}

            ${makeToggle(
                "screenShake",
                "SCREEN SHAKE",
                "Enable impact camera effects."
            )}

            ${makeToggle(
                "practiceMode",
                "PRACTICE MODE",
                "Allow practice mode from level details."
            )}

            <div class="nd-setting">
                <div class="nd-setting-info">
                    <strong>RESET SAVE</strong>
                    <span>Delete all local progression.</span>
                </div>

                <button id="resetSaveButton">
                    RESET
                </button>
            </div>
        `;

        document
            .getElementById("resetSaveButton")
            .addEventListener(
                "click",
                () => {
                    if (
                        confirm(
                            "Reset all NEON DASH progress?"
                        )
                    ) {
                        resetSave();
                    }
                }
            );
    }

    function toggleSetting(key) {
        if (!(key in save.settings)) return;

        save.settings[key] =
            !save.settings[key];

        saveGame();

        renderSettings();
    }

    /* =====================================================
       AUDIO
       ===================================================== */

    let audioContext = null;

    function unlockAudio() {
        if (!save.settings.sound) return;

        try {
            if (!audioContext) {
                audioContext =
                    new (
                        window.AudioContext ||
                        window.webkitAudioContext
                    )();
            }

            if (
                audioContext.state ===
                "suspended"
            ) {
                audioContext.resume();
            }

            state.audioStarted = true;
        } catch (error) {
            console.warn(
                "Audio unavailable."
            );
        }
    }

    function playTone(
        frequency,
        duration,
        type = "sine"
    ) {
        if (!save.settings.sound) return;

        unlockAudio();

        if (!audioContext) return;

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.value =
            frequency;

        gain.gain.setValueAtTime(
            0,
            audioContext.currentTime
        );

        gain.gain.linearRampToValueAtTime(
            save.settings.soundVolume *
                0.08,
            audioContext.currentTime +
                0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime +
                duration
        );

        oscillator.connect(gain);
        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime +
                duration
        );
    }

    /* =====================================================
       EDITOR
       ===================================================== */

    let editorCanvas;
    let editorCtx;

    const editor = {
        tool: "block",
        objects: [],
        coins: []
    };

    function initEditor() {
        editorCanvas =
            document.getElementById(
                "editorCanvas"
            );

        if (!editorCanvas) return;

        editorCtx =
            editorCanvas.getContext("2d");

        resizeEditor();

        window.removeEventListener(
            "resize",
            resizeEditor
        );

        window.addEventListener(
            "resize",
            resizeEditor
        );

        editorCanvas.onpointerdown =
            editorPointerDown;

        drawEditor();
    }

    function resizeEditor() {
        if (!editorCanvas) return;

        const rect =
            editorCanvas.getBoundingClientRect();

        const dpr =
            Math.min(
                window.devicePixelRatio || 1,
                2
            );

        editorCanvas.width =
            rect.width * dpr;

        editorCanvas.height =
            rect.height * dpr;

        editorCtx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );

        drawEditor();
    }

    function selectEditorTool(tool) {
        editor.tool = tool;

        document
            .querySelectorAll(
                ".nd-editor-toolbar button"
            )
            .forEach(button => {
                button.classList.toggle(
                    "active",
                    button.dataset.tool === tool
                );
            });

        const label =
            document.getElementById(
                "editorTool"
            );

        if (label) {
            label.textContent =
                tool.toUpperCase();
        }
    }

    function editorPointerDown(event) {
        if (!editorCanvas) return;

        const rect =
            editorCanvas.getBoundingClientRect();

        const x =
            event.clientX -
            rect.left;

        const y =
            event.clientY -
            rect.top;

        const worldX =
            Math.floor(x / 40) * 40;

        const worldY =
            Math.floor(y / 40) * 40;

        if (editor.tool === "erase") {
            editor.objects =
                editor.objects.filter(
                    object =>
                        !(
                            Math.abs(
                                object.x -
                                    worldX
                            ) < 35 &&
                            Math.abs(
                                object.y -
                                    worldY
                            ) < 35
                        )
                );
        } else if (
            editor.tool === "coin"
        ) {
            editor.coins.push({
                x: worldX + 20,
                y: worldY + 20
            });
        } else {
            editor.objects.push({
                type: editor.tool,
                x: worldX,
                y: worldY
            });
        }

        drawEditor();
    }

    function drawEditor() {
        if (
            !editorCanvas ||
            !editorCtx
        ) return;

        const width =
            editorCanvas.clientWidth;

        const height =
            editorCanvas.clientHeight;

        editorCtx.clearRect(
            0,
            0,
            width,
            height
        );

        editorCtx.fillStyle =
            "#03050d";

        editorCtx.fillRect(
            0,
            0,
            width,
            height
        );

        editorCtx.strokeStyle =
            "rgba(0,246,255,.08)";

        for (
            let x = 0;
            x < width;
            x += 40
        ) {
            editorCtx.beginPath();
            editorCtx.moveTo(x, 0);
            editorCtx.lineTo(x, height);
            editorCtx.stroke();
        }

        for (
            let y = 0;
            y < height;
            y += 40
        ) {
            editorCtx.beginPath();
            editorCtx.moveTo(0, y);
            editorCtx.lineTo(width, y);
            editorCtx.stroke();
        }

        for (const object of editor.objects) {
            if (object.type === "block") {
                editorCtx.fillStyle =
                    "#12365a";

                editorCtx.fillRect(
                    object.x,
                    object.y,
                    40,
                    40
                );
            }

            if (object.type === "spike") {
                editorCtx.fillStyle =
                    "#ff29c8";

                editorCtx.beginPath();

                editorCtx.moveTo(
                    object.x,
                    object.y + 40
                );

                editorCtx.lineTo(
                    object.x + 20,
                    object.y
                );

                editorCtx.lineTo(
                    object.x + 40,
                    object.y + 40
                );

                editorCtx.closePath();

                editorCtx.fill();
            }
        }

        for (const coin of editor.coins) {
            editorCtx.fillStyle =
                "#ffe45c";

            editorCtx.beginPath();

            editorCtx.arc(
                coin.x,
                coin.y,
                10,
                0,
                Math.PI * 2
            );

            editorCtx.fill();
        }

        const count =
            document.getElementById(
                "editorCount"
            );

        if (count) {
            count.textContent =
                `${editor.objects.length +
                    editor.coins.length} OBJECTS`;
        }
    }

    function saveEditor() {
        try {
            localStorage.setItem(
                "neonDashEditor_v1",
                JSON.stringify(editor)
            );

            save.createdLevels += 1;
            save.creatorPoints += 10;

            updateAchievements();
            saveGame();

            alert(
                "Level saved locally."
            );
        } catch (error) {
            alert(
                "Unable to save this level."
            );
        }
    }

    function testEditor() {
        alert(
            "Editor test mode foundation is ready. Your placed objects can be expanded into a full custom playable level."
        );
    }

    /* =====================================================
       STARTUP
       ===================================================== */

    function boot() {
        /*
         * Give the original loading screen a moment,
         * then start the actual application.
         */

        setTimeout(() => {
            createInterface();
        }, 900);
    }

    boot();
});
