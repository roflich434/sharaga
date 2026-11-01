const DAYS_RU = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const MONTHS_RU = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

let currentCity = "Москва";
let lastKind = null;
let selectedCard = null;
let quizScore = 0;
let currentSlide = 0;
let totalQuestions = 0;
let quizShown = false;
let answeredSlides = {};
let currentQuestions = [];

// 0 = градиент, 1 = отражение, 2 = чёрный
let bgMode = 0;

// пул из 11 картинок с заменой
const BACKGROUNDS = [
    "/static/zadnik/666.jpg",
    "/static/zadnik/6565.jpg",
    "/static/zadnik/1221321.jpg",
    "/static/zadnik/5454545.jpg",
    "/static/zadnik/332312222.jpg",
    "/static/zadnik/4343423211.jpg",
    "/static/zadnik/hihihoho.jpg",
    "/static/zadnik/nicekartinch.jpg",
    "/static/zadnik/sisi.jpg",
    "/static/zadnik/zalypa.jpg",
    "/static/zadnik/zitraks.jpg"
];
let currentBgIndex = 0;
let preloadedImages = {};
let isImageLoading = false;

// Перемешивание массива (Фишер-Йейтс)
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Текущий порядок (перемешивается после каждого круга)
let shuffledBackgrounds = shuffleArray(BACKGROUNDS);

const ALL_QUESTIONS = [
    { q: "Какой язык используется для бэкенда этого сайта?", options: [
        { text: "Python (Flask)", correct: true },
        { text: "PHP", correct: false },
        { text: "Java", correct: false }
    ]},
    { q: "Откуда сайт получает данные о погоде?", options: [
        { text: "Из захардкоженной базы", correct: false },
        { text: "Через HTTP-запрос к внешнему API", correct: true },
        { text: "Считывает с рабочего стола", correct: false }
    ]},
    { q: "Что делает функция shuffleArray в этом коде?", options: [
        { text: "Сортирует данные по алфавиту", correct: false },
        { text: "Перемешивает элементы массива в случайном порядке", correct: true },
        { text: "Удаляет дубликаты", correct: false }
    ]},
    { q: "Какой CSS-эффект используется для размытого фона?", options: [
        { text: "box-shadow", correct: false },
        { text: "backdrop-filter: blur()", correct: true },
        { text: "opacity: 0.5", correct: false }
    ]}
];

// ===== ЗАГРУЗКА КАРТИНОК =====
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        if (preloadedImages[url]) { resolve(preloadedImages[url]); return; }
        const img = new Image();
        const timeout = setTimeout(() => reject(new Error(`Timeout: ${url}`)), 8000);
        img.onload = () => {
            clearTimeout(timeout);
            if (img.naturalWidth > 50 && img.naturalHeight > 50) {
                preloadedImages[url] = img;
                resolve(img);
            } else reject(new Error(`Small: ${url}`));
        };
        img.onerror = () => { clearTimeout(timeout); reject(new Error(`Fail: ${url}`)); };
        img.src = url;
    });
}

async function applyBackground(url) {
    const mainEl = document.getElementById("bg-main");
    const blurEl = document.getElementById("bg-blur");
    if (!mainEl) return;
    if (isImageLoading) return;
    isImageLoading = true;
    try {
        await preloadImage(url);
        mainEl.style.backgroundImage = `url('${url}')`;
        mainEl.style.opacity = "1";
        // Зеркалка только в режиме 1
        if (blurEl && bgMode === 1) {
            blurEl.style.backgroundImage = `url('${url}')`;
        }
        logAction("background_changed", url);
    } catch (e) {
        mainEl.style.backgroundImage = "none";
        mainEl.style.opacity = "0";
        if (blurEl) blurEl.style.backgroundImage = "none";
        logAction("background_failed", url);
    } finally { isImageLoading = false; }
}

function changeBackground() {
    currentBgIndex++;
    if (currentBgIndex >= shuffledBackgrounds.length) {
        currentBgIndex = 0;
        shuffledBackgrounds = shuffleArray(BACKGROUNDS);
        logAction("background_shuffle", "new order");
    }
    applyBackground(shuffledBackgrounds[currentBgIndex]);
}

function initBackgroundRotation() {
    shuffledBackgrounds.slice(0, 3).forEach(url => preloadImage(url).catch(() => {}));
    applyBackground(shuffledBackgrounds[0]);
    setInterval(changeBackground, 20000);
}

// ===== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ФОНА =====
function applyBgMode(mode) {
    const gradientEl = document.getElementById("gradientBg");
    const blurEl = document.getElementById("bg-blur");
    const blackEl = document.getElementById("bg-black");
    const iconEl = document.getElementById("bgModeIcon");
    
    if (gradientEl) gradientEl.style.opacity = "0";
    if (blurEl) { blurEl.style.opacity = "0"; blurEl.style.backgroundImage = "none"; }
    if (blackEl) blackEl.style.opacity = "0";
    
    if (mode === 0) {
        if (gradientEl) gradientEl.style.opacity = "1";
        if (iconEl) iconEl.textContent = "🌈";
    } else if (mode === 1) {
        if (blurEl) {
            blurEl.style.opacity = "1";
            // Обновляем зеркалку текущей картинкой
            const mainEl = document.getElementById("bg-main");
            if (mainEl && mainEl.style.backgroundImage && mainEl.style.opacity === "1") {
                blurEl.style.backgroundImage = mainEl.style.backgroundImage;
            }
        }
        if (iconEl) iconEl.textContent = "🪞";
    } else if (mode === 2) {
        if (blackEl) blackEl.style.opacity = "1";
        if (iconEl) iconEl.textContent = "⚫";
    }
    
    logAction("bg_mode_changed", ["gradient","blur","black"][mode]);
}

function cycleBgMode() {
    bgMode = (bgMode + 1) % 3;
    applyBgMode(bgMode);
}

// ===== ЧАСЫ =====
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    const timeEl = document.getElementById("clockTime");
    const dateEl = document.getElementById("clockDate");
    if (timeEl) timeEl.textContent = `${h}:${m}:${s}`;
    if (dateEl) dateEl.textContent = `${now.getDate()} ${MONTHS_RU[now.getMonth()]} ${now.getFullYear()}`;
}
function initClock() { updateClock(); setInterval(updateClock, 1000); }

function logAction(action, detail = "") {
    fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, detail, ts: Date.now() })
    }).catch(() => {});
}

function formatDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}
function dayName(iso, idx) {
    if (idx === 0) return "Сегодня";
    if (idx === 1) return "Завтра";
    return DAYS_RU[new Date(iso + "T00:00:00").getDay()];
}

function miniIcon(kind) {
    switch(kind) {
        case "clear": return '<div class="mini-icon"><div class="mini-sun"></div></div>';
        case "partly_cloudy": return '<div class="mini-icon"><div class="mini-sun" style="position:absolute;top:0;left:0;width:28px;height:28px;"></div><div class="mini-cloud" style="position:absolute;bottom:5px;right:0;animation:cloudFloat 3s ease-in-out infinite;"></div></div>';
        case "cloudy": case "fog": return '<div class="mini-icon"><div class="mini-cloud" style="animation:cloudFloat 3s ease-in-out infinite;"></div></div>';
        case "rain": case "drizzle": return '<div class="mini-icon mini-rain"><div class="mini-cloud" style="animation:cloudFloat 3s ease-in-out infinite;"></div><div class="mini-rain-drops"><span></span><span></span><span></span></div></div>';
        case "snow": return '<div class="mini-icon mini-rain"><div class="mini-cloud" style="animation:cloudFloat 3s ease-in-out infinite;"></div><div class="mini-rain-drops mini-snow"><span>❄</span><span>❄</span><span>❄</span></div></div>';
        case "thunder": return '<div class="mini-icon mini-rain"><div class="mini-cloud" style="animation:cloudFloat 2s ease-in-out infinite;"></div><div class="mini-bolt">⚡</div></div>';
        default: return '<div class="mini-icon"><div class="mini-cloud"></div></div>';
    }
}

function renderWeather(data) {
    const grid = document.getElementById("weather");
    if (!grid) return;
    grid.innerHTML = data.days.map((d,i) => `
        <div class="day-card ${i===0?'today':''}" data-kind="${d.kind}" data-date="${d.date}" style="animation-delay:${i*0.05}s">
            <div class="day-name">${dayName(d.date,i)}</div>
            <div class="day-date">${formatDate(d.date)}</div>
            <div class="day-icon">${miniIcon(d.kind)}</div>
            <div class="day-label">${d.label}</div>
            <div class="day-temp">${d.t_max>0?'+':''}${d.t_max}° <span class="min">${d.t_min>0?'+':''}${d.t_min}°</span></div>
            <div class="day-meta">💧 ${d.precip} мм · 💨 ${d.wind} м/с</div>
        </div>
    `).join("");

    document.querySelectorAll(".day-card").forEach(card => {
        card.addEventListener("click", () => {
            const kind = card.dataset.kind;
            logAction("card_clicked", `${kind} on ${card.dataset.date}`);
            document.querySelectorAll(".day-card").forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            selectedCard = card;
            updateWeatherAnimation(kind);
            lastKind = kind;
        });
    });

    const todayKind = data.days[0].kind;
    if (todayKind !== lastKind) { updateWeatherAnimation(todayKind); lastKind = todayKind; }
}

function updateWeatherAnimation(kind) {
    const scene = document.getElementById("bgScene");
    if (!scene) return;
    scene.innerHTML = "";
    void scene.offsetWidth;
    if (kind==="clear"||kind==="partly_cloudy") {
        const sun = document.createElement("div"); sun.className="sun"; scene.appendChild(sun);
        if (kind==="partly_cloudy") addClouds(scene,1);
    } else if (kind==="cloudy"||kind==="fog"||kind==="unknown") {
        addClouds(scene,3);
        if (kind==="fog") { const f=document.createElement("div"); f.className="fog-layer"; scene.appendChild(f); }
    } else if (kind==="rain"||kind==="drizzle") {
        addClouds(scene,2,true); addRain(scene, kind==="drizzle"?30:60);
    } else if (kind==="snow") {
        addClouds(scene,2,true); addSnow(scene,40);
    } else if (kind==="thunder") {
        addClouds(scene,3,true); addRain(scene,50);
        const l=document.createElement("div"); l.className="lightning"; scene.appendChild(l);
    } else { addClouds(scene,2); }
}

function addClouds(container,count,dark=false) {
    for(let i=0;i<count;i++){
        const c=document.createElement("div");
        c.className=`cloud cloud-${(i%3)+1}`+(dark?" dark-cloud":"");
        container.appendChild(c);
    }
}
function addRain(container,n) {
    const frag=document.createDocumentFragment();
    const actual=Math.floor(n*1.5);
    for(let i=0;i<actual;i++){
        const d=document.createElement("div");
        d.className="rain-drop";
        d.style.left=Math.random()*100+"%";
        d.style.animationDuration=(0.4+Math.random()*0.6)+"s";
        d.style.animationDelay=Math.random()*2+"s";
        d.style.width=(2+Math.random()*2)+"px";
        frag.appendChild(d);
    }
    container.appendChild(frag);
}
function addSnow(container,n) {
    const frag=document.createDocumentFragment();
    const flakes=["❄","❅","❆"];
    for(let i=0;i<n;i++){
        const s=document.createElement("div");
        s.className="snowflake";
        s.textContent=flakes[i%flakes.length];
        s.style.left=Math.random()*100+"%";
        s.style.fontSize=(10+Math.random()*12)+"px";
        s.style.animationDuration=(5+Math.random()*7)+"s";
        s.style.animationDelay=Math.random()*5+"s";
        frag.appendChild(s);
    }
    container.appendChild(frag);
}

async function loadWeather(city) {
    try {
        const r=await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        const data=await r.json();
        if(data.error) throw new Error(data.error);
        renderWeather(data);
    } catch(e) {
        const grid = document.getElementById("weather");
        if (grid) grid.innerHTML=`<div class="loading">Ошибка: ${e.message}</div>`;
    }
}

function startQuiz(questions, title) {
    currentQuestions = questions;
    totalQuestions = questions.length;
    currentSlide = 0;
    quizScore = 0;
    answeredSlides = {};
    const titleEl = document.getElementById("quizTitle");
    if (titleEl) titleEl.textContent = title;
    const modal = document.getElementById("quizModal");
    if (modal) modal.classList.add("active");
    renderSlide();
    logAction("quiz_started", title);
}

function renderSlide() {
    const container = document.getElementById("quizContainer");
    const counter = document.getElementById("quizCounter");
    const progressBar = document.getElementById("progressBar");
    const nextBtn = document.getElementById("nextBtn");
    if (!container || !counter || !progressBar || !nextBtn) return;
    
    if (currentSlide >= totalQuestions) {
        container.innerHTML = `
            <div class="quiz-slide">
                <div class="quiz-card final-card">
                    <h3>🏆 Результат</h3>
                    <div class="final-score">${quizScore} / ${totalQuestions}</div>
                    <div class="final-message">${quizScore===totalQuestions?'🎉 Идеально!':quizScore>=totalQuestions/2?'👍 Неплохо!':'😢 Кабуу плачет...'}</div>
                    <button class="restart-btn" id="restartQuiz">🔄 Закрыть</button>
                </div>
            </div>
        `;
        counter.textContent = "Опрос завершён!";
        progressBar.style.width = "100%";
        nextBtn.style.display = "none";
        const restartBtn = document.getElementById("restartQuiz");
        if (restartBtn) restartBtn.addEventListener("click", () => {
            const modal = document.getElementById("quizModal");
            if (modal) modal.classList.remove("active");
        });
        return;
    }
    
    const q = currentQuestions[currentSlide];
    counter.textContent = `Вопрос ${currentSlide+1} из ${totalQuestions}`;
    progressBar.style.width = `${((currentSlide)/totalQuestions)*100}%`;
    nextBtn.style.display = "block";
    nextBtn.disabled = !answeredSlides[currentSlide];
    nextBtn.textContent = currentSlide === totalQuestions-1 ? "Результат 🏆" : "Далее →";
    
    container.innerHTML = `
        <div class="quiz-slide">
            <div class="quiz-card">
                <h3>${q.q}</h3>
                <div class="quiz-options">
                    ${q.options.map((opt,i) => `<button class="quiz-option" data-correct="${opt.correct}" data-idx="${i}">${opt.text}</button>`).join("")}
                </div>
                <div class="quiz-feedback"></div>
            </div>
        </div>
    `;
    
    container.querySelectorAll(".quiz-option").forEach(btn => {
        btn.addEventListener("click", () => {
            if (answeredSlides[currentSlide]) return;
            answeredSlides[currentSlide] = true;
            const isCorrect = btn.dataset.correct === "true";
            const card = btn.closest(".quiz-card");
            const feedback = card.querySelector(".quiz-feedback");
            card.querySelectorAll(".quiz-option").forEach(b => {
                b.classList.add("disabled");
                if (b.dataset.correct === "true") b.classList.add("correct");
            });
            if (isCorrect) {
                btn.classList.add("correct");
                feedback.innerHTML = "✅ Правильно! 😊";
                feedback.className = "quiz-feedback success";
                quizScore++;
            } else {
                btn.classList.add("wrong");
                feedback.innerHTML = "❌ Неправильно! 😢";
                feedback.className = "quiz-feedback fail";
            }
            nextBtn.disabled = false;
            logAction("quiz_answer", `Q${currentSlide+1}: ${isCorrect?'correct':'wrong'}`);
        });
    });
}

function showQuizModal() {
    if (quizShown) return;
    quizShown = true;
    const shuffled = shuffleArray(ALL_QUESTIONS);
    startQuiz(shuffled, "Викторина по веб-разработке");
    logAction("quiz_modal_shown", "shuffled questions");
}

function initQuiz() {
    setTimeout(showQuizModal, 5000);
    const closeBtn = document.getElementById("closeModal");
    if (closeBtn) closeBtn.addEventListener("click", () => {
        const modal = document.getElementById("quizModal");
        if (modal) modal.classList.remove("active");
    });
    const modal = document.getElementById("quizModal");
    if (modal) modal.addEventListener("click", (e) => {
        if (e.target.id === "quizModal") modal.classList.remove("active");
    });
    const nextBtn = document.getElementById("nextBtn");
    if (nextBtn) nextBtn.addEventListener("click", () => {
        currentSlide++;
        renderSlide();
    });
}

// Города
document.querySelectorAll(".city-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".city-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentCity = btn.dataset.city;
        logAction("change_city", currentCity);
        loadWeather(currentCity);
    });
});
const firstBtn = document.querySelector(".city-btn");
if (firstBtn) firstBtn.classList.add("active");

// Кнопка скрытия погоды (правый верхний)
const toggleBtn = document.getElementById("toggleWeatherBtn");
const weatherContainer = document.getElementById("weatherContainer");
const toggleIcon = document.getElementById("toggleIcon");

if (toggleBtn && weatherContainer) {
    toggleBtn.addEventListener("click", () => {
        const isHidden = weatherContainer.classList.toggle("hidden");
        toggleIcon.textContent = isHidden ? "👁" : "🌤";
        logAction("toggle_weather", isHidden ? "hidden" : "shown");
    });
}

// Кнопка переключения фона (левый нижний)
const toggleBgBtn = document.getElementById("toggleBgBtn");
if (toggleBgBtn) {
    toggleBgBtn.addEventListener("click", cycleBgMode);
}

// Запуск
logAction("page_open", currentCity);
initBackgroundRotation();
initClock();
applyBgMode(0);
loadWeather(currentCity);
initQuiz();

document.addEventListener("visibilitychange", () => {
    logAction(document.hidden ? "tab_hidden" : "tab_visible");
});