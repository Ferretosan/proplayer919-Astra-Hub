// Utility Functions
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

// Debounce Utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// State Management
const state = {
  gameData: { games: [], categories: [], tags: {} },
  currentGame: null,
  selectedTag: localStorage.getItem('selectedTag') || '',
  selectedCategory: localStorage.getItem('selectedCategory') || '',
  isFullscreen: false,
  playGameBtnClickListener: null,
  userData: {
    favorites: [],
    exp: parseInt(localStorage.getItem('userExp') || '0'),
    level: parseInt(localStorage.getItem('userLevel') || '1')
  }
};

// DOM Elements
const elements = {
  canvas: $('#starfield'),
  homePage: $('#home-page'),
  gamePage: $('#game-page'),
  gameFrameContainer: $('#game-frame-container'),
  gamePlayOverlay: $('#game-play-overlay'),
  playGameBtn: $('#play-game-btn'),
  gameLoaderContainer: $('#game-loader-container'),
  gameIframe: $('#game-iframe'),
  searchInput: $('#search-input'),
  searchSuggestions: $('#search-suggestions'),
  categoryList: $('#category-list'),
  toast: $('#toast'),
  backToTop: $('#back-to-top'),
  logoContainer: $('#logoContainer'),
  hamburger: $('#hamburger'),
  sidebar: $('#sidebar'),
  mainContent: $('.main-content'),
  mobileOverlay: $('#mobile-overlay'),
  gameTitleContainer: $('#game-title-container'),
  themeToggleIcon: $('#theme-toggle-icon')
};

// Hamburger Menu
elements.hamburger.addEventListener('click', () => {
  elements.sidebar.classList.toggle('active');
  elements.mobileOverlay.classList.toggle('active');
});
elements.mobileOverlay.addEventListener('click', closeSidebar);

function closeSidebar() {
  elements.sidebar.classList.remove('active');
  elements.mobileOverlay.classList.remove('active');
}

// Starfield Animation
const ctx = elements.canvas.getContext('2d');
function resizeCanvas() {
  elements.canvas.width = window.innerWidth;
  elements.canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas, { passive: true });

const stars = Array.from({ length: 150 }, () => ({
  x: Math.random() * elements.canvas.width,
  y: Math.random() * elements.canvas.height,
  radius: Math.random() * 1.5,
  speed: Math.random() * 0.3 + 0.1,
  opacity: Math.random() * 0.4 + 0.3
}));

function animateStars() {
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  stars.forEach(star => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    ctx.fill();
    star.y += star.speed;
    if (star.y > elements.canvas.height) {
      star.y = 0;
      star.x = Math.random() * elements.canvas.width;
    }
  });
  requestAnimationFrame(animateStars);
}
if (elements.canvas) animateStars();

// Intersection Observer for Animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

// Game Data Loading
async function loadGameData() {
  try {
    const response = await fetch('games.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    state.gameData = await response.json();

    const brandingSection = elements.homePage.querySelector('.branding-section');
    const loadingMessage = elements.homePage.querySelector('.loading');
    if (loadingMessage) loadingMessage.remove();

    elements.homePage.innerHTML = '';
    if (brandingSection) elements.homePage.appendChild(brandingSection);

    populateCategories();
    populateCategoryList();
    initializeUserData();
  } catch (error) {
    console.error("Error loading game data:", error);
    const homePageContent = elements.homePage.querySelector('.branding-section')?.nextElementSibling;
    if (homePageContent) homePageContent.innerHTML = `<div class="error">Error loading games: ${error.message}</div>`;
    else elements.homePage.innerHTML += `<div class="error">Error loading games: ${error.message}</div>`;
  }
}

// Initialize User Data
function initializeUserData() {
  state.userData.favorites = state.gameData.games
    .filter(game => localStorage.getItem(`favorite-${game.id}`) === 'true')
    .map(game => game.id);
}

// Recommendation Algorithm
function getRecommendedGames() {
  const games = [...state.gameData.games];
  const scores = games.map(game => {
    let score = 0;
    if (state.userData.favorites.includes(game.id)) score += 50;
    if (game.tags && state.userData.favorites.length > 0) {
      const favoriteTags = state.gameData.games
        .filter(g => state.userData.favorites.includes(g.id))
        .flatMap(g => g.tags || []);
      const commonTags = (game.tags || []).filter(tag => favoriteTags.includes(tag));
      score += commonTags.length * 10;
    }
    if (game.rating) score += game.rating * 5;
    return { game, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores.map(s => s.game);
}

// Track Play Time
function showAchievement(title) {
  const achievement = document.createElement('div');
  achievement.className = 'achievement';
  achievement.innerHTML = `
    <i class="fas fa-trophy"></i>
    <span>${title}</span>
  `;
  document.body.appendChild(achievement);
  setTimeout(() => achievement.classList.add('show'), 100);
  setTimeout(() => {
    achievement.classList.remove('show');
    setTimeout(() => achievement.remove(), 300);
  }, 3000);
}

function calculateExpGain(duration) {
  return Math.floor(duration / 60 * 10);
}

function calculateLevelThreshold(level) {
  return 100 * level;
}

function updateLevel() {
  while (state.userData.exp >= calculateLevelThreshold(state.userData.level)) {
    state.userData.level++;
    showAchievement(`Level Up! You're now level ${state.userData.level}!`);
  }
  localStorage.setItem('userLevel', state.userData.level.toString());
}

// Category List Population
function populateCategoryList() {
  elements.categoryList.innerHTML = '';
  const homeButton = document.createElement('a');
  homeButton.href = '#';
  homeButton.className = 'category-item';
  homeButton.innerHTML = `<i class="fas fa-home" aria-hidden="true"></i> Home`;
  homeButton.dataset.category = '';
  homeButton.setAttribute('role', 'tab');
  homeButton.setAttribute('aria-selected', !state.selectedCategory);
  if (!state.selectedCategory) homeButton.classList.add('active');
  homeButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (elements.gamePage.classList.contains('active')) backToHome();
    state.selectedCategory = '';
    state.selectedTag = '';
    localStorage.setItem('selectedCategory', '');
    localStorage.setItem('selectedTag', '');
    populateCategories();
    $$('.category-item', elements.categoryList).forEach(item => item.classList.remove('active'));
    homeButton.classList.add('active');
    closeSidebar();
  });
  elements.categoryList.appendChild(homeButton);

  state.gameData.categories.forEach(category => {
    if (category.id === 'favorites') return;
    const button = document.createElement('a');
    button.href = '#';
    button.className = 'category-item';
    button.innerHTML = `<i class="fas ${category.icon || 'fa-gamepad'}" aria-hidden="true"></i> ${category.name}`;
    button.dataset.category = category.id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', state.selectedCategory === category.id);
    if (state.selectedCategory === category.id) button.classList.add('active');
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (elements.gamePage.classList.contains('active')) backToHome();
      state.selectedCategory = category.id;
      state.selectedTag = '';
      localStorage.setItem('selectedCategory', category.id);
      localStorage.setItem('selectedTag', '');
      populateCategories();
      $$('.category-item', elements.categoryList).forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      closeSidebar();
    });
    elements.categoryList.appendChild(button);
  });
}

function addRibbonBadgeToCard(game, gameCardElement) {
  if (game.ribbon) {
    const infoDiv = gameCardElement.querySelector('.game-card-info');
    if (infoDiv) {
      const titleElement = infoDiv.querySelector('h3');
      if (titleElement) {
        const ribbonElement = document.createElement('div');
        ribbonElement.className = `ribbon-badge ribbon-${game.ribbon.toLowerCase().replace(/\s+/g, '-')}`;
        ribbonElement.textContent = game.ribbon;
        infoDiv.insertBefore(ribbonElement, titleElement);
      }
    }
  }
}

function addRibbonToTitle(game, titleContainerElement, isFullscreen = false) {
  const ribbonClass = isFullscreen ? 'fullscreen-title-ribbon' : 'game-title-ribbon';
  const existingRibbon = titleContainerElement.querySelector(`.${ribbonClass}`);
  if (existingRibbon) existingRibbon.remove();
  if (game.ribbon) {
    const ribbonElement = document.createElement('div');
    ribbonElement.className = `${ribbonClass} ribbon-${game.ribbon.toLowerCase().replace(/\s+/g, '-')}`;
    ribbonElement.textContent = game.ribbon;
    const titleElement = titleContainerElement.querySelector(isFullscreen ? 'h3' : 'h2');
    if (titleElement) {
      titleContainerElement.insertBefore(ribbonElement, titleElement);
    }
  }
}

function updateLevelDisplay() {
  const levelDisplay = document.querySelector('.level-display-nav');
  if (levelDisplay) {
    levelDisplay.innerHTML = `
      <div class="level-info">
        <span class="level">Level ${state.userData.level}</span>
        <div class="exp-bar">
          <div class="exp-progress" style="width: ${(state.userData.exp / calculateLevelThreshold(state.userData.level)) * 100}%"></div>
        </div>
        <span class="exp-text">${state.userData.exp}/${calculateLevelThreshold(state.userData.level)} EXP</span>
      </div>
    `;
  }
}

function populateCategories(filterTag = state.selectedTag, filterCategory = state.selectedCategory) {
  updateLevelDisplay();
  $$('.category-section, .error', elements.homePage).forEach(el => el.remove());
  let gamesDisplayed = false;
  state.gameData.categories.forEach(category => {
    if (filterCategory && category.id !== filterCategory && category.id !== 'favorites') return;
    let games = category.id === 'favorites'
      ? getFavorites()
      : state.gameData.games.filter(game =>
        game.categories.includes(category.id) &&
        (!filterTag || (game.tags && game.tags.includes(filterTag)))
      );
    if (games.length) {
      gamesDisplayed = true;
      const section = document.createElement('div');
      section.className = 'category-section';
      section.id = `category-${category.id}`;
      section.innerHTML = `
        <div class="category-header"><h2>${category.name}</h2></div>
        <div class="games-grid" id="${category.id}-games"></div>`;
      elements.homePage.appendChild(section);
      observer.observe(section);
      const gamesGrid = $(`#${category.id}-games`);
      games.forEach((game, index) => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.tabIndex = 0;
        gameCard.style.animationDelay = `${index * 0.05}s`;
        const stars = Math.round(game.rating || 0);
        const isFavorited = localStorage.getItem(`favorite-${game.id}`) === 'true';
        const shortDescription = game.description && game.description.length > 80
          ? game.description.substring(0, 80) + "..."
          : game.description || "";
        gameCard.innerHTML = `
          <img src="${game.image || 'placeholder.png'}" alt="${game.title}" loading="lazy" onerror="this.src='https://placehold.co/320x220/1a1354/00d4ff?text=No+Image'">
          <div class="game-card-info">
            <h3>${game.title}</h3>
            <p class="game-card-description">${shortDescription}</p>
            <div class="game-card-meta">
              <span class="rating" aria-label="Rating ${stars} out of 5">${'<i class="fas fa-star" style="color: var(--secondary);"></i>'.repeat(stars)}${'<i class="far fa-star"></i>'.repeat(5 - stars)}</span>
              <span class="favorite ${isFavorited ? 'favorited' : ''}" aria-label="${isFavorited ? 'Add to favorites' : 'Remove from favorites'}" role="button" tabindex="0"></span>
            </div>
          </div>`;
        addRibbonBadgeToCard(game, gameCard);
        gameCard.addEventListener('click', () => showGamePage(game));
        gameCard.querySelector('.favorite').addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFavorite(game, gameCard.querySelector('.favorite'));
        });
        gamesGrid.appendChild(gameCard);
      });
    }
  });
  if (!gamesDisplayed && !elements.homePage.querySelector('.error')) {
    const noGamesMessage = document.createElement('div');
    noGamesMessage.className = 'error';
    noGamesMessage.textContent = 'No games found for the selected filters.';
    elements.homePage.appendChild(noGamesMessage);
  }
}

function getFavorites() {
  return state.gameData.games.filter(game => localStorage.getItem(`favorite-${game.id}`) === 'true');
}

function showGamePage(game) {
  state.currentGame = game;
  elements.homePage.style.display = 'none';
  elements.gamePage.style.display = 'block';
  elements.gamePage.classList.add('active');
  elements.gameIframe.src = 'about:blank';
  elements.gameIframe.style.display = 'none';
  elements.gameLoaderContainer.style.display = 'none';
  elements.gamePlayOverlay.style.display = 'flex';
  const gameImage = game.image || 'https://placehold.co/800x600/0b0326/00d4ff?text=Astra+Hub';
  elements.gameFrameContainer.style.setProperty('--game-bg-image', `url('${gameImage}')`);
  elements.gameFrameContainer.classList.add('show-blur-bg');
  $('#game-title').textContent = game.title;
  addRibbonToTitle(game, elements.gameTitleContainer);
  $('#game-description').textContent = game.description || "No description available.";
  $('#game-tags').innerHTML = game.tags && game.tags.length > 0 ? game.tags.map(tag => `<span>${tag}</span>`).join('') : '<span>No tags</span>';
  const stars = Math.round(game.rating || 0);
  $('#game-rating').innerHTML = `${'<i class="fas fa-star" style="color: var(--secondary);"></i>'.repeat(stars)}${'<i class="far fa-star"></i>'.repeat(5 - stars)}`;
  const favoriteBtn = $('#favorite-btn');
  favoriteBtn.classList.toggle('favorited', localStorage.getItem(`favorite-${game.id}`) === 'true');
  favoriteBtn.onclick = () => toggleFavorite(game, favoriteBtn);
  populateSimilarGames(game);
  if (state.playGameBtnClickListener) {
    elements.playGameBtn.removeEventListener('click', state.playGameBtnClickListener);
  }
  state.playGameBtnClickListener = () => {
    elements.gamePlayOverlay.style.display = 'none';

    elements.gameLoaderContainer.style.display = 'flex';
    elements.gameIframe.src = game.url;

    if (game.removed) {
      const doc = elements.gameIframe.contentDocument || elements.gameIframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
        <head>
            <style>
                body {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f0f0f0;
                    font-family: Arial, sans-serif;
                    color: #333;
                }
                .container {
                    text-align: center;
                }
                .icon {
                    font-size: 48px;
                    color: #ff4444;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 24px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="icon">🚫</div>
                <div class="message">This content has been removed</div>
            </div>
        </body>
        </html>
    `);
      doc.close();
    }
  };
  elements.playGameBtn.addEventListener('click', state.playGameBtnClickListener);
  elements.gameIframe.onload = onGameLoadSuccess;
  elements.gameIframe.onerror = onGameLoadError;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeSidebar();
}

function populateSimilarGames(game) {
  const similarGamesList = $('#similar-games-list');
  similarGamesList.innerHTML = '';
  let similarCount = 0;
  if (state.gameData.games && game.tags) {
    state.gameData.games.forEach(g => {
      if (similarCount < 5 && g.id !== game.id && g.tags && g.tags.some(tag => game.tags.includes(tag))) {
        const similarGame = document.createElement('div');
        similarGame.className = 'similar-game';
        similarGame.tabIndex = 0;
        similarGame.innerHTML = `
          <img src="${g.image || 'placeholder.png'}" alt="${g.title}" loading="lazy" onerror="this.src='https://placehold.co/90x90/1a1354/00d4ff?text=No+Image'">
          <span>${g.title}</span>`;
        similarGame.addEventListener('click', () => showGamePage(g));
        similarGamesList.appendChild(similarGame);
        similarCount++;
      }
    });
  }
  if (similarCount === 0) similarGamesList.innerHTML = '<p>No similar games found.</p>';
}

function onGameLoadSuccess() {
  elements.gameLoaderContainer.style.display = 'none';
  elements.gameIframe.style.display = 'block';
  elements.gameFrameContainer.classList.remove('show-blur-bg');
  try { elements.gameIframe.focus(); } catch (e) { }
}

function onGameLoadError() {
  elements.gameLoaderContainer.style.display = 'none';
  const errorMsg = elements.gameFrameContainer.querySelector('p.error');
  if (!errorMsg) {
    elements.gameFrameContainer.insertAdjacentHTML('beforeend', '<p class="error" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); z-index:5; color:var(--accent);">Could not load game.</p>');
  }
  elements.gameFrameContainer.classList.add('show-blur-bg');
}

function toggleFavorite(game, ...buttonsToUpdate) {
  const isFavorited = localStorage.getItem(`favorite-${game.id}`) === 'true';
  localStorage.setItem(`favorite-${game.id}`, !isFavorited);
  state.userData.favorites = state.gameData.games
    .filter(g => localStorage.getItem(`favorite-${g.id}`) === 'true')
    .map(g => g.id);
  buttonsToUpdate.forEach(btn => {
    if (btn) {
      btn.classList.toggle('favorited', !isFavorited);
      btn.setAttribute('aria-label', !isFavorited ? 'Remove from favorites' : 'Add to favorites');
    }
  });
  const gameCardOnHomePage = Array.from($$('#home-page .game-card')).find(card => card.querySelector('h3')?.textContent === game.title);
  if (gameCardOnHomePage) {
    const favIcon = gameCardOnHomePage.querySelector('.favorite');
    if (favIcon) {
      favIcon.classList.toggle('favorited', !isFavorited);
      favIcon.setAttribute('aria-label', !isFavorited ? 'Remove from favorites' : 'Add to favorites');
    }
  }
  showToast(isFavorited ? 'Removed from favorites' : 'Added to favorites');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

function backToHome() {
  elements.gamePage.classList.remove('active');
  setTimeout(() => {
    elements.gamePage.style.display = 'none';
    elements.homePage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeSidebar();
  }, 600);
}

function goFullscreen() {
  if (elements.gameIframe.requestFullscreen) {
    elements.gameIframe.requestFullscreen();
  } else if (elements.gameIframe.mozRequestFullScreen) {
    elements.gameIframe.mozRequestFullScreen();
  } else if (elements.gameIframe.webkitRequestFullscreen) {
    elements.gameIframe.webkitRequestFullscreen();
  } else if (elements.gameIframe.msRequestFullscreen) {
    elements.gameIframe.msRequestFullscreen();
  }
  state.isFullscreen = true;
  updateFullscreenBar(state.currentGame);
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

// Search Functionality
elements.searchInput.addEventListener('input', debounce(() => {
  const query = elements.searchInput.value.trim().toLowerCase();

  if (query === "$sudo heck") {
    window.location.href = 'funny/hacker-typer.html';
    return;
  } else if (query === "$sudo yay") {
    window.location.href = 'funny/fake-ransom.html';
    return;
  } else if (query === "$sudo remind me") {
    window.location.href = 'funny/remind-me.html';
    return;
  } else if (query === "$sudo rizz") {
    window.location.href = 'funny/rizz.html';
    return;
  }

  elements.searchSuggestions.innerHTML = '';
  if (query.length < 2) {
    elements.searchSuggestions.style.display = 'none';
    return;
  }

  const suggestions = state.gameData.games.filter(game =>
    game.title.toLowerCase().includes(query) ||
    (game.tags && game.tags.some(tag => tag.toLowerCase().includes(query)))
  ).slice(0, 10);

  if (suggestions.length === 0) {
    elements.searchSuggestions.innerHTML = '<div class="search-suggestion">No results found</div>';
  } else {
    suggestions.forEach(game => {
      const suggestion = document.createElement('div');
      suggestion.className = 'search-suggestion';
      suggestion.innerHTML = `
        <img src="${game.image || 'placeholder.png'}" alt="${game.title}" loading="lazy" onerror="this.src='https://placehold.co/48x48/1a1354/00d4ff?text=No+Image'">
        <span>${game.title}</span>
        ${game.ribbon ? `<span class="search-suggestion-ribbon ribbon-${game.ribbon.toLowerCase().replace(/\s+/g, '-')}>${game.ribbon}</span>` : ''}`;
      suggestion.addEventListener('click', () => {
        showGamePage(game);
        elements.searchSuggestions.style.display = 'none';
        elements.searchInput.value = '';
      });
      elements.searchSuggestions.appendChild(suggestion);
    });
  }

  elements.searchSuggestions.style.display = suggestions.length > 0 ? 'block' : 'none';
}, 300));

// Back to Top Button
window.addEventListener('scroll', () => {
  elements.backToTop.style.display = window.scrollY > 300 ? 'block' : 'none';
}, { passive: true });

elements.backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Theme Toggle
function toggleTheme() {
  document.body.classList.toggle('light-mode');
  const isLightMode = document.body.classList.contains('light-mode');
  elements.themeToggleIcon.className = isLightMode ? 'fas fa-sun' : 'fas fa-moon';
  localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  if (isLightMode) {
    $('#logo').src = 'brand/logo-light.png';
  } else {
    $('#logo').src = 'brand/logo-dark.png';
  }
}

// Logo Click Handler
elements.logoContainer.addEventListener('click', () => {
  if (elements.gamePage.classList.contains('active')) {
    backToHome();
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  state.selectedCategory = '';
  state.selectedTag = '';
  localStorage.setItem('selectedCategory', '');
  localStorage.setItem('selectedTag', '');
  populateCategories();
  $$('.category-item', elements.categoryList).forEach(item => item.classList.remove('active'));
  $$('.category-item[data-category=""]', elements.categoryList)[0]?.classList.add('active');
  closeSidebar();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadGameData();
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    elements.themeToggleIcon.className = 'fas fa-sun';
    $('#logo').src = 'brand/logo-light.png';
  } else {
    elements.themeToggleIcon.className = 'fas fa-moon';
    $('#logo').src = 'brand/logo-dark.png';
  }
});

// Keyboard Accessibility
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.isFullscreen) {
    exitFullscreen();
  }
  if (e.key === 'Enter' && e.target.classList.contains('game-card')) {
    const gameTitle = e.target.querySelector('h3')?.textContent;
    const game = state.gameData.games.find(g => g.title === gameTitle);
    if (game) showGamePage(game);
  }
  if (e.key === 'Enter' && e.target.classList.contains('favorite')) {
    const gameCard = e.target.closest('.game-card');
    const gameTitle = gameCard?.querySelector('h3')?.textContent;
    const game = state.gameData.games.find(g => g.title === gameTitle);
    if (game) toggleFavorite(game, e.target);
  }
});
