// State Management
let currentBatchId = '';
let currentSubjectSlug = '';

// Backend Server URI (Render host ke baad ye automatically relative endpoints access karega)
const API_BASE = window.location.origin;

const elements = {
    loader: document.getElementById('loadingOverlay'),
    batches: document.getElementById('batchesContainer'),
    subjects: document.getElementById('subjectsContainer'),
    topics: document.getElementById('topicsContainer'),
    lectures: document.getElementById('lecturesContainer'),
    sections: {
        subjects: document.getElementById('subjectsSection'),
        topics: document.getElementById('topicsSection'),
        lectures: document.getElementById('lecturesSection')
    }
};

// Loader Toggle helper
function toggleLoader(show) {
    if (show) elements.loader.classList.remove('hidden');
    else elements.loader.classList.add('hidden');
}

// Initial Kickstart
document.addEventListener('DOMContentLoaded', fetchAllBatches);

// 1. Fetch and Display All Batches
async function fetchAllBatches() {
    toggleLoader(true);
    try {
        const res = await fetch(`${API_BASE}/api/batches`);
        const result = await res.json();
        
        // Agar response structure different ho to safe checks
        const batches = result.data || result;
        
        elements.batches.innerHTML = '';
        batches.forEach(batch => {
            const div = document.createElement('div');
            div.className = "bg-gray-800 p-5 rounded-xl border border-gray-700 hover:border-blue-500 transition cursor-pointer shadow-md";
            div.innerHTML = `
                <h3 class="font-bold text-lg text-white mb-2">${batch.name || 'Premium Batch'}</h3>
                <p class="text-sm text-gray-400 mb-4">ID: ${batch._id}</p>
                <button class="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition">View Subjects</button>
            `;
            div.addEventListener('click', () => selectBatch(batch._id));
            elements.batches.appendChild(div);
        });
    } catch (err) {
        console.error("Batch load standard failing:", err);
    } finally {
        toggleLoader(false);
    }
}

// 2. Select Batch and Load Main Subjects (3 Columns per row)
async function selectBatch(batchId) {
    currentBatchId = batchId;
    // Hide downstream panels
    elements.sections.topics.classList.add('hidden');
    elements.sections.lectures.classList.add('hidden');
    
    toggleLoader(true);
    try {
        const res = await fetch(`${API_BASE}/api/subjects?batchId=${batchId}`);
        const result = await res.json();
        const subjects = result.data || [];

        elements.subjects.innerHTML = '';
        if(subjects.length === 0) {
            elements.subjects.innerHTML = `<p class="text-gray-400 p-4">No subjects found for this batch.</p>`;
        }

        subjects.forEach(sub => {
            const div = document.createElement('div');
            // Explicit card presentation
            div.className = "bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-purple-500 transition cursor-pointer transform hover:-translate-y-1 duration-200 shadow-md flex flex-col justify-between";
            div.innerHTML = `
                <div>
                    <h3 class="font-semibold text-lg text-purple-400 mb-1">${sub.name}</h3>
                    <p class="text-xs text-gray-500 truncate mb-4">Slug: ${sub.slug}</p>
                </div>
                <span class="text-xs bg-purple-900/40 text-purple-300 w-max px-3 py-1 rounded-md border border-purple-800">Explore Chapters</span>
            `;
            // Unique key dynamic selection
            div.addEventListener('click', () => selectSubject(sub.slug, sub._id || sub.slug));
            elements.subjects.appendChild(div);
        });

        elements.sections.subjects.classList.remove('hidden');
        elements.sections.subjects.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error("Subjects fetch missing:", err);
    } finally {
        toggleLoader(false);
    }
}

// 3. Select Subject and Load Sub-Subjects/Topics (2 Columns per row)
async function selectSubject(subjectSlug, subjectId) {
    currentSubjectSlug = subjectSlug;
    elements.sections.lectures.classList.add('hidden');
    
    toggleLoader(true);
    try {
        const res = await fetch(`${API_BASE}/api/topics?batchId=${currentBatchId}&subjectId=${subjectId}`);
        const result = await res.json();
        const topics = result.data || [];

        elements.topics.innerHTML = '';
        
        topics.forEach(topic => {
            const div = document.createElement('div');
            // Layout is optimized for 2 elements per row
            div.className = "bg-gray-800/90 p-5 rounded-xl border border-gray-700 hover:border-pink-500 transition cursor-pointer flex justify-between items-center shadow-md";
            div.innerHTML = `
                <div class="space-y-1">
                    <h4 class="font-medium text-white text-base">${topic.name}</h4>
                    <div class="flex gap-3 text-xs text-gray-400">
                        <span>📄 Notes: ${topic.notes || 0}</span>
                        <span>🎬 Videos: ${topic.videos || topic.lectureVideos || 0}</span>
                    </div>
                </div>
                <div class="text-pink-500 font-bold text-xl">&rarr;</div>
            `;
            div.addEventListener('click', () => selectTopic(topic.slug));
            elements.topics.appendChild(div);
        });

        elements.sections.topics.classList.remove('hidden');
        elements.sections.topics.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error("Topics parse failure:", err);
    } finally {
        toggleLoader(false);
    }
}

// 4. Select Topic and Load Lectures (3 Columns per row)
async function selectTopic(topicSlug) {
    toggleLoader(true);
    try {
        const res = await fetch(`${API_BASE}/api/datacontent?batchId=${currentBatchId}&subjectSlug=${currentSubjectSlug}&topicSlug=${topicSlug}&contentType=videos`);
        const result = await res.json();
        const contentArray = result.data || [];

        elements.lectures.innerHTML = '';
        
        if (contentArray.length === 0) {
            elements.lectures.innerHTML = `<p class="col-span-full text-center text-gray-400 bg-gray-800 p-8 rounded-xl">Is topic ke liye koi lectures available nahi hain.</p>`;
        }

        contentArray.forEach(item => {
            const videoInfo = item.videoDetails || {};
            const imgUrl = videoInfo.image || 'https://via.placeholder.com/640x360?text=No+Thumbnail';
            const duration = videoInfo.duration || 'N/A';
            
            // Clean dynamic text format strings properly
            const cleanTopicTitle = item.topic ? item.topic.split('||')[0] : 'Untitled Lecture';

            const card = document.createElement('div');
            // Exact requirement: 3 columns per row design elements
            card.className = "bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="relative aspect-video w-full bg-black">
                        <img src="${imgUrl}" alt="Thumbnail" class="object-cover w-full h-full opacity-90">
                        <span class="absolute bottom-2 right-2 bg-black/80 text-xs px-2 py-0.5 rounded font-mono text-emerald-400">${duration}</span>
                    </div>
                    <div class="p-4 space-y-2">
                        <h4 class="font-semibold text-sm line-clamp-2 text-gray-100">${cleanTopicTitle}</h4>
                        <p class="text-xs text-gray-400">Date: ${new Date(item.date).toLocaleDateString('en-IN')}</p>
                    </div>
                </div>
                <div class="p-4 pt-0">
                    <button onclick="handleStreamClick('${videoInfo.hls_url || videoInfo.videoUrl || ''}')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition tracking-wide uppercase">
                        Play Stream
                    </button>
                </div>
            `;
            elements.lectures.appendChild(card);
        });

        elements.sections.lectures.classList.remove('hidden');
        elements.sections.lectures.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error("Lectures generation process broken:", err);
    } finally {
        toggleLoader(false);
    }
}

// Handle Play Action Without Iframes
function handleStreamClick(url) {
    if(!url) {
        alert("Bhai, is video ka exact HLS/Stream URL directly hidden ya protected hai code me.");
        return;
    }
    // direct play, capture stream index source pattern or send payload safely
    window.open(url, '_blank');
}