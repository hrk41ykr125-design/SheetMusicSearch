// configuration
const API_KEY = 'AIzaSyBbHgpvAK1bPygFMFSRjHkub67XrQXwBVw';
const FOLDER_ID = '1u901nO4ddhMR78VgprZ3RmEFjw38FydX';

// categories
const CATEGORIES = [
    "Duo", "Drama", "Classic", "Child", "CM", "Mens", "Movie", "Anime", "Ladies",
    "洋インスト", "VP", "無印", "etc.", "ジャズ・ラテン", "童謡"
];

// matching keywords for categorization
const CATEGORY_KEYWORDS = {
    "Drama": ["ドラマ", "主題歌", "Subtitle", "I LOVE...", "宿命"],
    "Movie": ["映画", "劇場版", "Yesterday", "Pretender", "瞬き"],
    "Anime": ["アニメ", "ミックスナッツ", "Bling-Bang-Bang-Born", "新時代", "アイドル", "炎", "紅蓮華"],
    "Classic": ["Classic", "クラシック", "Vol.", "ソナタ"],
    "Child": ["Child", "子供", "こども", "童話"],
    "ジャズ・ラテン": ["Jazz", "Latin", "ジャズ", "ラテン"],
};

let allFiles = [];

/**
 * Extract info from filename
 * Pattern: 【Artist】Title_Metadata.ext
 */
function parseFilename(filename) {
    // strip extension
    const cleanName = filename.replace(/\.[^/.]+$/, "");

    let artist = "不明";
    let title = cleanName;

    // Extract artist from 【】
    const artistMatch = cleanName.match(/【(.*?)】/);
    if (artistMatch) {
        artist = artistMatch[1].trim();
        title = cleanName.replace(artistMatch[0], "").trim();
    }

    // specific rule for Official髭男dism
    if (["髭男", "ヒゲダン", "Official髭男dism"].some(k => artist.includes(k) || title.includes(k))) {
        artist = "Official髭男dism";
    }

    // strip difficulty/metadata (anything after _)
    title = title.split('_')[0].trim();

    // determine category
    let category = "無印";

    // priority: Drama/Movie for Higedan
    if (artist === "Official髭男dism") {
        if (CATEGORY_KEYWORDS["Drama"].some(k => title.includes(k))) category = "Drama";
        else if (CATEGORY_KEYWORDS["Movie"].some(k => title.includes(k))) category = "Movie";
    }

    if (category === "無印") {
        for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some(k => title.includes(k) || artist.includes(k))) {
                category = cat;
                break;
            }
        }
    }

    return { artist, title, category, original: filename };
}

async function fetchFiles(folderId) {
    const results = [];
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink)&key=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.files) {
            for (const file of data.files) {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    // Recursive call for subfolders
                    const subFiles = await fetchFiles(file.id);
                    results.push(...subFiles);
                } else {
                    const parsed = parseFilename(file.name);
                    results.push({
                        ...parsed,
                        id: file.id,
                        link: file.webViewLink
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error fetching files:", error);
    }
    return results;
}

function renderFiles(files) {
    const grid = document.getElementById('results-grid');
    grid.innerHTML = '';

    files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'score-card';
        card.innerHTML = `
            <span class="item-category">${file.category}</span>
            <h3 class="item-title">${file.title}</h3>
            <div class="item-author">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                ${file.artist}
            </div>
            <a href="${file.link}" target="_blank" class="btn-open">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                ファイルを開く
            </a>
        `;
        grid.appendChild(card);
    });
}

const CACHE_KEY = 'SHEET_MUSIC_CACHE';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

async function init() {
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    // Check cache
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
        const { timestamp, data } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
            console.log("Using cached data");
            allFiles = data;
            loading.style.display = 'none';
            renderFiles(allFiles);
            return;
        }
    }

    // If no cache or expired, handle API
    if (API_KEY === 'YOUR_GOOGLE_DRIVE_API_KEY' || !API_KEY.startsWith('AIza')) {
        allFiles = [
            { artist: "Official髭男dism", title: "ミックスナッツ", category: "Anime", link: "#" },
            { artist: "Official髭男dism", title: "Subtitle", category: "Drama", link: "#" },
            { artist: "back number", title: "瞬き", category: "Movie", link: "#" },
            { artist: "Ado", title: "新時代", category: "Anime", link: "#" },
            { artist: "Official髭男dism", title: "Pretender", category: "Movie", link: "#" },
            { artist: "YOASOBI", title: "アイドル", category: "Anime", link: "#" },
            { artist: "不明", title: "Classic Vol.4", category: "Classic", link: "#" }
        ];
    } else {
        allFiles = await fetchFiles(FOLDER_ID);
        // Save to cache
        if (allFiles.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: allFiles
            }));
        }
    }

    loading.style.display = 'none';
    renderFiles(allFiles);
}

function filterFiles() {
    const nameQuery = document.getElementById('search-name').value.toLowerCase();
    const authorQuery = document.getElementById('search-author').value.toLowerCase();
    const categoryQuery = document.getElementById('category-select').value;

    const filtered = allFiles.filter(file => {
        const matchName = file.title.toLowerCase().includes(nameQuery);
        const matchAuthor = file.artist.toLowerCase().includes(authorQuery);
        const matchCategory = !categoryQuery || file.category === categoryQuery;
        return matchName && matchAuthor && matchCategory;
    });

    renderFiles(filtered);
}

document.getElementById('btn-search').addEventListener('click', filterFiles);
document.getElementById('search-name').addEventListener('input', filterFiles);
document.getElementById('search-author').addEventListener('input', filterFiles);
document.getElementById('category-select').addEventListener('change', filterFiles);

// Run
init();
