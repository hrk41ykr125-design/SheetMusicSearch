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

// Aliases for fuzzy search (Title and Artist)
const SEARCH_ALIASES = {
    "mrs. green apple": ["ミセス", "ミセスグリーンアップル", "Mrs.GREEN APPLE"],
    "official髭男dism": ["ヒゲダン", "髭男"],
    "megalovannia": ["メガロバニア"],
    "megalovania": ["メガロバニア"],
    "undertale": ["アンダーテール", "アンテ"],
    "vaundy": ["バウンディ"],
    "yorushika": ["ヨルシカ"],
    "yoasobi": ["ヨアソビ"],
    "ado": ["アド"],
    "back number": ["バックナンバー"],
    "radwimps": ["ラッド", "ラッドウィンプス"],
    "t-square": ["ティー・スクエア", "ティースクエア"],
    "supercell": ["スーパーセル"],
    "back street boys": ["バックスストリートボーイズ"],
    "queen": ["クイーン"],
    "the beatles": ["ビートルズ"],
    "disney": ["ディズニー"],
    "night dancer": ["ナイトダンサー"]
};

// Automated artist mapping for "Unknown" songs
const SONG_ARTIST_MAP = {
    "別の人の彼女になったよ": "wacci",
    "シンデレラボーイ": "Saucy Dog",
    "ドライフラワー": "優里",
    "ベテルギウス": "優里",
    "水平線": "back number",
    "高嶺の花子さん": "back number",
    "ハッピーエンド": "back number",
    "猫": "DISH//",
    "丸の内サディスティック": "椎名林檎",
    "チェリー": "スピッツ",
    "小さな恋のうた": "MONGOL800",
    "わかってないよ": "映秀。",
    "夢はひそかに": "Disney",
    "Bling-Bang-Bang-Born": "Creepy Nuts",
    "パート・オブ・ユア・ワールド": "Disney",
    "自由への扉": "Disney",
    "それもいいね": "TRACK15",
    "リカ": "My Hair is Bad",
    "Rush E": "Sheet Music Boss",
    "コウを追いかけて": "阿部海太郎",
    "青と夏": "Mrs. GREEN APPLE",
    "千本桜": "WhiteFlame",
    "群青": "YOASOBI",
    "ラプソディ・イン・ブルー": "George Gershwin",
    "アイドル": "YOASOBI",
    "強風オールバッグ": "ゆこぴ",
    "木星": "Gustav Holst",
    "新世界より": "Antonin Dvorak",
    "WAになっておどろう": "V6",
    "となりのトトロ": "久石譲",
    "いぬのおまわりさん": "童謡",
    "風笛": "大島ミチル",
    "太陽にほえろ": "大野克夫",
    "The Song of Life": "鳥山雄司",
    "Rhythm And Police": "本間勇輔",
    "大ちゃん数え唄": "天童よしみ",
    "CAT'S EYE": "杏里",
    "妖怪人間ベム": "ハニー・ナイツ",
    "キューティーハニー": "前川陽子",
    "ゲゲゲの鬼太郎": "熊倉一雄",
    "CHA-LA HEAD-CHA-LA": "影山ヒロノブ",
    "A列車で行こう": "Duke Ellington",
    "美女と野獣": "Disney",
    "リベルタンゴ": "Astor Piazzolla",
    "古畑任三郎": "本間勇輔",
    "ジュラシック・パーク": "John Williams",
    "残酷な天使のテーゼ": "高橋洋子",
    "ルパン三世": "大野雄二"
};

// Instrument Normalization Map
const INSTRUMENT_MAP = {
    "pf": "ピアノ",
    "piano": "ピアノ",
    "el": "エレクトーン",
    "electone": "エレクトーン",
    "vo": "ボーカル",
    "vocal": "ボーカル",
    "gt": "ギター",
    "guitar": "ギター",
    "ba": "ベース",
    "bass": "ベース",
    "dr": "ドラム",
    "drums": "ドラム",
    "fl": "フルート",
    "vn": "バイオリン",
    "sax": "サックス"
};

let allFiles = [];

/**
 * Extract info from filename
 * Pattern: 【Artist】Title_Metadata_Instrument.ext
 */
function parseFilename(filename, mimeType = null) {
    // Check for image extensions or junk files
    if (/\.(jpe?g|png|gif|bmp|webp|heic)$/i.test(filename) ||
        /新しいテキスト|新しいビットマップ|表紙|ドキュメント\.txt$/i.test(filename) ||
        /^[0-9a-f]{32}_[0-9]+\.pdf$/i.test(filename)) { // Ignore temp hash files
        return null;
    }

    // List of extensions we want to strip
    const knownExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'ptx', 'mus'];
    const extMatch = filename.match(/\.([a-z0-9]+)$/i);

    let cleanName = filename;
    if (extMatch && (knownExtensions.includes(extMatch[1].toLowerCase()) || mimeType !== 'application/vnd.google-apps.document')) {
        // Only strip if it's a known extension OR not a Google Doc (since Docs often have no extension but might have dots)
        cleanName = filename.replace(/\.[^/.]+$/, "");
    }

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
    const higedanKeywords = ["髭男", "ヒゲダン", "Official髭男dism"];
    if (higedanKeywords.some(k => artist.includes(k) || title.includes(k))) {
        artist = "Official髭男dism";
        tags.push("J-POP");
    }

    // Handle Unknown Artists via SONG_ARTIST_MAP
    if (artist === "不明" || !artist) {
        for (const [song, mappedArtist] of Object.entries(SONG_ARTIST_MAP)) {
            if (title.includes(song)) {
                artist = mappedArtist;
                break;
            }
        }
    }

    // Extract instrument from parenthesis (Pf) etc
    const parenMatch = title.match(/\((.*?)\)/);
    if (parenMatch) {
        const potentialInst = parenMatch[1].toLowerCase();
        if (INSTRUMENT_MAP[potentialInst] || ["pf", "fl", "vn", "sax", "gt", "ba", "dr", "vo"].includes(potentialInst)) {
            instrument = INSTRUMENT_MAP[potentialInst] || potentialInst;
            title = title.replace(parenMatch[0], "").trim();
        }
    }

    // Split by _ to get title and metadata
    const parts = title.split('_');
    title = parts[0].trim();

    if (parts.length > 1) {
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i].trim();
            const lowerPart = part.toLowerCase();
            // check for common instruments and normalize
            if (INSTRUMENT_MAP[lowerPart]) {
                instrument = INSTRUMENT_MAP[lowerPart];
            } else if (["pf", "fl", "vn", "sax", "gt", "ba", "dr", "vo", "エレクトーン", "ピアノ"].includes(lowerPart)) {
                instrument = INSTRUMENT_MAP[lowerPart] || part;
            } else if (part) {
                tags.push(part);
            }
        }
    }

    // Final Normalization: If instrument is still a code, map it
    if (instrument && INSTRUMENT_MAP[instrument.toLowerCase()]) {
        instrument = INSTRUMENT_MAP[instrument.toLowerCase()];
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

async function fetchFiles(folderId, pageToken = null, isSubfolder = false) {
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
        'text/plain',
        'application/octet-stream' // For .ptx, .mus etc
    ];
    const DOC_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.ptx', '.mus'];

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
                    const subFiles = await fetchFiles(targetId, null, true);
                    results.push(...subFiles);
                } else {
                    const isDocMime = ALLOWED_MIMES.includes(file.mimeType);
                    const isDocExt = DOC_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
                    // Also include extensionless Google Docs
                    const isGoogleDoc = file.mimeType === 'application/vnd.google-apps.document';

                    if (isDocMime || isDocExt || isGoogleDoc) {
                        const parsed = parseFilename(file.name, file.mimeType);
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

        // Handle Pagination for same folder
        if (data.nextPageToken) {
            const nextFiles = await fetchFiles(folderId, data.nextPageToken, isSubfolder);
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

const CACHE_KEY = 'SHEET_MUSIC_CACHE_V6_NORMALIZATION';
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

    if (API_KEY === 'AIzaSyBbHgpvAK1bPygFMFSRjHkub67XrQXwBVw' || !API_KEY.startsWith('AIza')) {
        allFiles = [
            { artist: "Official髭男dism", title: "ミックスナッツ", tags: ["J-POP", "Anime"], instrument: "ピアノ", link: "#" },
            { artist: "Official髭男dism", title: "Subtitle", tags: ["J-POP", "Drama"], instrument: "ピアノ", link: "#" },
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

    // Sort by title (alphabetical) initially
    allFiles.sort((a, b) => a.title.localeCompare(b.title, 'ja'));

    loading.style.display = 'none';
    renderFiles(allFiles);
}

function filterFiles() {
    // Trim queries to avoid issues with trailing spaces
    const nameQuery = document.getElementById('search-name').value.trim().toLowerCase();
    const authorQuery = document.getElementById('search-author').value.trim().toLowerCase();
    const tagQuery = document.getElementById('search-tag').value.trim().toLowerCase();
    const instrumentQuery = document.getElementById('search-instrument').value.trim().toLowerCase();

    // Helper to normalize strings for comparison (remove spaces and dots)
    const normalize = (str) => str.toLowerCase().replace(/[\s\.]/g, '');

    const filtered = allFiles.filter(file => {
        const titleLower = file.title.toLowerCase();
        const artistLower = file.artist.toLowerCase();
        const artistNorm = normalize(file.artist);

        // Fuzzy match helper
        const isMatch = (field, query, fieldNorm = null) => {
            if (!query) return true;
            const queryNorm = normalize(query);

            // Direct match
            if (field.includes(query)) return true;
            if (fieldNorm && fieldNorm.includes(queryNorm)) return true;

            // Check aliases
            for (const [target, aliases] of Object.entries(SEARCH_ALIASES)) {
                const targetNorm = normalize(target);
                // If the field matches the target (e.g. "Mrs.GREEN APPLE" vs "mrs. green apple")
                if (fieldNorm === targetNorm || field.includes(target.toLowerCase()) || target.toLowerCase().includes(field)) {
                    if (aliases.some(a => normalize(a).includes(queryNorm) || queryNorm.includes(normalize(a)))) return true;
                }
            }
            return false;
        };

        const matchName = isMatch(titleLower, nameQuery);
        const matchAuthor = isMatch(artistLower, authorQuery, artistNorm);
        const matchTag = !tagQuery || file.tags.some(t => t.toLowerCase().includes(tagQuery));
        const matchInstrument = !instrumentQuery || (file.instrument && file.instrument.toLowerCase().includes(instrumentQuery));

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
