// configuration
const API_KEY = 'AIzaSyBbHgpvAK1bPygFMFSRjHkub67XrQXwBVw';
const FOLDER_ID = '1u901nO4ddhMR78VgprZ3RmEFjw38FydX';

// common tags for filtering
const COMMON_TAGS = [
    "J-POP", "Drama", "Movie", "Anime", "Classic", "Child", "CM", "Mens", "Ladies",
    "洋インスト", "VP", "Duo", "ジャズ・ラテン", "童謡", "etc.", "無印"
];

// matching keywords for tag inference
const TAG_KEYWORDS = {
    "Drama": ["ドラマ", "主題歌", "Subtitle", "I LOVE...", "宿命"],
    "Movie": ["映画", "劇場版", "Yesterday", "Pretender", "瞬き"],
    "Anime": ["アニメ", "ミックスナッツ", "Bling-Bang-Bang-Born", "新時代", "アイドル", "炎", "紅蓮華"],
    "Classic": ["Classic", "クラシック", "Vol.", "ソナタ"],
    "Child": ["Child", "子供", "こども", "童話"],
    "ジャズ・ラテン": ["Jazz", "Latin", "ジャズ", "ラテン"],
};

// Aliases for fuzzy search
const SEARCH_ALIASES = {
    "mrs. green apple": ["ミセス", "ミセスグリーンアップル"],
    "official髭男dism": ["ヒゲダン", "髭男"],
    "megalovannia": ["メガロバニア"],
    "megalovania": ["メガロバニア"]
};

let allFiles = [];

/**
 * Extract info from filename
 * Pattern: 【Artist】Title_Metadata_Instrument.ext
 */
function parseFilename(filename) {
    // Check for image extensions as secondary safety
    if (/\.(jpe?g|png|gif|bmp|webp|heic)$/i.test(filename)) {
        return null;
    }

    // strip extension
    const cleanName = filename.replace(/\.[^/.]+$/, "");

    let artist = "不明";
    let title = cleanName;
    let tags = [];
    let instrument = "";

    // Extract artist from 【】
    const artistMatch = cleanName.match(/【(.*?)】/);
    if (artistMatch) {
        artist = artistMatch[1].trim();
        title = cleanName.replace(artistMatch[0], "").trim();
    }

    // specific rule for Official髭男dism
    if (["髭男", "ヒゲダン", "Official髭男dism"].some(k => artist.includes(k) || title.includes(k))) {
        artist = "Official髭男dism";
        tags.push("J-POP");
    }

    // Split by _ to get title and metadata
    const parts = title.split('_');
    title = parts[0].trim();

    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i].trim();
            // check for common instruments
            if (["pf", "fl", "vn", "sax", "gt", "ba", "dr", "vo", "エレクトーン", "ピアノ"].includes(part.toLowerCase())) {
                instrument = part;
            } else if (part) {
                tags.push(part);
            }
        }
    }

    // Keyword based tag inference
    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        if (keywords.some(k => title.includes(k) || artist.includes(k))) {
            tags.push(tag);
        }
    }

    if (tags.length === 0) tags.push("無印");
    tags = [...new Set(tags)]; // deduplicate

    return { artist, title, tags, instrument, original: filename };
}

async function fetchFiles(folderId, pageToken = null) {
    const results = [];
    let url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,webViewLink,shortcutDetails)&pageSize=1000&key=${API_KEY}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    // Allowed MIME types / Extensions for "Sheet Music"
    const ALLOWED_MIMES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.google-apps.document',
        'application/rtf',
        'text/plain'
    ];
    const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.files) {
            for (const file of data.files) {
                // Handle normal folders and shortcuts to folders
                let isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                let targetId = file.id;

                if (file.mimeType === 'application/vnd.google-apps.shortcut' && file.shortcutDetails) {
                    if (file.shortcutDetails.targetMimeType === 'application/vnd.google-apps.folder') {
                        isFolder = true;
                        targetId = file.shortcutDetails.targetId;
                    }
                }

                if (isFolder) {
                    const subFiles = await fetchFiles(targetId);
                    results.push(...subFiles);
                } else {
                    const isDocMime = ALLOWED_MIMES.includes(file.mimeType);
                    const isDocExt = DOC_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

                    if (isDocMime || isDocExt) {
                        const parsed = parseFilename(file.name);
                        if (parsed) {
                            results.push({
                                ...parsed,
                                id: file.id,
                                link: file.webViewLink
                            });
                        }
                    }
                }
            }
        }

        // Handle Pagination
        if (data.nextPageToken) {
            const nextFiles = await fetchFiles(folderId, data.nextPageToken);
            results.push(...nextFiles);
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

        const tagsHtml = file.tags.map(tag => `<span class="item-tag">${tag}</span>`).join('');
        const instrumentHtml = file.instrument ? `<span class="item-instrument">${file.instrument}</span>` : '';

        card.innerHTML = `
            <div class="tag-container">
                ${tagsHtml}
                ${instrumentHtml}
            </div>
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

const CACHE_KEY = 'SHEET_MUSIC_CACHE_V5_STURDY';
const CACHE_EXPIRY = 60 * 60 * 1000;

async function init() {
    const loading = document.getElementById('loading');
    loading.style.display = 'flex';

    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
        const { timestamp, data } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
            allFiles = data;
            console.log(`Loaded ${allFiles.length} files from cache`);
            loading.style.display = 'none';
            renderFiles(allFiles);
            return;
        }
    }

    if (API_KEY === 'YOUR_GOOGLE_DRIVE_API_KEY' || !API_KEY.startsWith('AIza')) {
        allFiles = [
            { artist: "Official髭男dism", title: "ミックスナッツ", tags: ["J-POP", "Anime"], instrument: "pf", link: "#" },
            { artist: "Official髭男dism", title: "Subtitle", tags: ["J-POP", "Drama"], instrument: "pf", link: "#" },
            { artist: "Mrs. GREEN APPLE", title: "ダンスホール", tags: ["J-POP"], instrument: "", link: "#" },
            { artist: "Ado", title: "新時代", tags: ["J-POP", "Anime"], instrument: "", link: "#" },
            { artist: "Toby Fox", title: "MEGALOVANIA", tags: ["Game"], instrument: "", link: "#" }
        ];
    } else {
        allFiles = await fetchFiles(FOLDER_ID);
        console.log(`Fetched ${allFiles.length} files from API`);
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
    // Trim queries to avoid issues with trailing spaces
    const nameQuery = document.getElementById('search-name').value.trim().toLowerCase();
    const authorQuery = document.getElementById('search-author').value.trim().toLowerCase();
    const tagQuery = document.getElementById('search-tag').value.trim().toLowerCase();
    const instrumentQuery = document.getElementById('search-instrument').value.trim().toLowerCase();

    const filtered = allFiles.filter(file => {
        const titleLower = file.title.toLowerCase();
        const artistLower = file.artist.toLowerCase();

        // Fuzzy match helper
        const isMatch = (field, query) => {
            if (!query) return true;
            if (field.includes(query)) return true;

            // Check aliases
            for (const [target, aliases] of Object.entries(SEARCH_ALIASES)) {
                if (target.toLowerCase().includes(field.toLowerCase()) || field.toLowerCase().includes(target.toLowerCase())) {
                    if (aliases.some(a => a.toLowerCase().includes(query) || query.includes(a.toLowerCase()))) return true;
                }
            }
            return false;
        };

        const matchName = isMatch(titleLower, nameQuery);
        const matchAuthor = isMatch(artistLower, authorQuery);
        const matchTag = !tagQuery || file.tags.some(t => t.toLowerCase().includes(tagQuery));
        const matchInstrument = !instrumentQuery || file.instrument.toLowerCase().includes(instrumentQuery);

        return matchName && matchAuthor && matchTag && matchInstrument;
    });

    renderFiles(filtered);
}

document.getElementById('btn-search').addEventListener('click', filterFiles);
const inputs = ['search-name', 'search-author', 'search-tag', 'search-instrument'];
inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', filterFiles);
});

init();
