// Add these constants at the top of the file
const DEFAULT_POSTER = './assets/images/PosterNotFound.jpg';
const LOGO_PATH = './assets/images/LOGO.png';

async function searchTorrents() {
    const site = document.getElementById('siteSelect').value;
    const query = document.getElementById('searchInput').value;
    const resultsDiv = document.getElementById('results');
    const loading = document.getElementById('loading');

    if (!query.trim()) {
        alert('Please enter a search query');
        return;
    }

    resultsDiv.innerHTML = '';
    loading.classList.remove('hidden');
    
    // Update loading text based on search type
    const loadingText = loading.querySelector('span:not(.loader)');
    loadingText.textContent = site === 'all' ? 
        'Searching all torrent sites...' : 
        `Searching ${document.getElementById('siteSelect').selectedOptions[0].text}...`;
    
    try {
        let results = [];
        
        if (site === 'all') {
            // List of all available sites
            const sites = [
                '1337x', 'yts', 'eztv', 'tgx', 'torlock', 'piratebay', 
                'nyaasi', 'rarbg', 'ettv', 'zooqle', 'kickass', 'bitsearch',
                'glodls', 'magnetdl', 'limetorrent', 'torrentfunk', 'torrentproject'
            ];
            
            // Fetch from all sites concurrently
            const promises = sites.map(async (siteName) => {
                try {
                    const response = await fetch(
                        `https://alltorrentapi.onrender.com/api/${siteName}/${encodeURIComponent(query)}`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        // Add site information to each result
                        return data.map(item => ({
                            ...item,
                            Site: siteName.toUpperCase()
                        }));
                    }
                    return [];
                } catch (error) {
                    console.warn(`Error fetching from ${siteName}:`, error);
                    return [];
                }
            });
            
            // Wait for all requests to complete
            const allResults = await Promise.all(promises);
            // Combine and sort results
            results = allResults
                .flat()
                .sort((a, b) => (parseInt(b.Seeders) || 0) - (parseInt(a.Seeders) || 0));
                
        } else {
            // Single site search
            const response = await fetch(
                `https://alltorrentapi.onrender.com/api/${site}/${encodeURIComponent(query)}`
            );
            

            if (!response.ok) throw new Error('Network response was not ok');
            results = await response.json();
        }
        
        if (results.length === 0) {
            resultsDiv.innerHTML = `
                <div class="no-results col-span-full">
                    <div class="flex flex-col items-center gap-4">
                        <svg class="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <div>
                            <h3 class="text-lg font-semibold mb-2">No Results Found</h3>
                            <p class="text-gray-400">No matches found for "${query}"</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }
        
        results.forEach(torrent => {
            const template = document.getElementById('resultTemplate').content.cloneNode(true);
            
            // Set source URL and site badge
            const sourceLink = template.querySelector('[data-source-url]');
            sourceLink.href = torrent.Url;
            
            // Set site badge
            const siteBadge = template.querySelector('[data-site]');
            siteBadge.textContent = getSiteName(torrent.Url);
            
            // Set poster with fallback
            const posterImg = template.querySelector('[data-poster]');
            if (torrent.Poster && torrent.Poster.startsWith('http')) {
                posterImg.src = torrent.Poster;
                posterImg.alt = torrent.Name;
                posterImg.onerror = () => {
                    posterImg.src = DEFAULT_POSTER;
                    posterImg.alt = 'No Poster Available';
                };
            } else {
                posterImg.src = DEFAULT_POSTER;
                posterImg.alt = 'No Poster Available';
            }
            
            // Set other data
            template.querySelector('[data-name]').textContent = torrent.Name;
            template.querySelector('[data-size]').textContent = torrent.Size;
            template.querySelector('[data-date]').textContent = torrent.DateUploaded;
            
            // Update seeders and leechers with new icons
            template.querySelector('[data-seeders] .seeders-count').textContent = torrent.Seeders;
            template.querySelector('[data-leechers] .leechers-count').textContent = torrent.Leechers;
            
            // Set magnet data
            const magnetButton = template.querySelector('button');
            magnetButton.dataset.magnet = torrent.Magnet;
            magnetButton.dataset.name = torrent.Name;
            
            // Handle download button visibility
            const downloadButton = template.querySelector('[data-torrent-url]');
            if (torrent.Torrent && torrent.Torrent.startsWith('http')) {
                downloadButton.href = torrent.Torrent;
                downloadButton.style.display = 'flex';
            } else {
                downloadButton.style.display = 'none';
            }
            
            resultsDiv.appendChild(template);
        });
        
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="error-message col-span-full">
                <div class="flex items-center justify-center gap-3">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Error fetching results. Please try again.</span>
                </div>
            </div>
        `;
        console.error('Search error:', error);
    } finally {
        loading.classList.add('hidden');
    }
}

// Enhanced magnet link handling
function showMagnet(button) {
    const magnetLink = document.getElementById('magnetLink');
    const modalTitle = document.querySelector('#magnetModal h3');
    
    magnetLink.value = button.dataset.magnet;
    modalTitle.textContent = button.dataset.name || 'Magnet Link';
    
    document.getElementById('magnetModal').classList.remove('hidden');
    setTimeout(() => magnetLink.select(), 100);
}

function closeModal() {
    document.getElementById('magnetModal').classList.add('hidden');
}

function copyMagnet() {
    const magnetLink = document.getElementById('magnetLink');
    magnetLink.select();
    
    try {
        navigator.clipboard.writeText(magnetLink.value).catch(() => {
            document.execCommand('copy');
        });
        
        const copyButton = document.querySelector('#magnetModal button:last-child');
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        copyButton.classList.add('bg-green-500');
        
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.classList.remove('bg-green-500');
        }, 1500);
    } catch (err) {
        console.error('Copy failed:', err);
    }
}

// Enhanced event listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const siteSelect = document.getElementById('siteSelect');
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchTorrents();
    });
    
    siteSelect.addEventListener('change', () => {
        searchInput.focus();
    });
    
    const magnetModal = document.getElementById('magnetModal');
    magnetModal.addEventListener('click', (e) => {
        if (e.target.id === 'magnetModal') closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !magnetModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Add logo error handling
    const logo = document.querySelector('img[alt="Torrent Search"]');
    if (logo) {
        logo.onerror = () => {
            logo.style.display = 'none';
        };
    }
});

// Helper function to get site name from URL
function getSiteName(url) {
    const hostname = new URL(url).hostname;
    return hostname.replace('www.', '').split('.')[0];
} 