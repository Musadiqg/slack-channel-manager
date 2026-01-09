// ==========================================================================
// Utility Functions
// ==========================================================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Debounce function to limit function calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Parse comma-separated tags string into array
 */
function parseTags(tagString) {
  if (!tagString || typeof tagString !== 'string') return [];
  return tagString.split(',').map(t => t.trim()).filter(t => t);
}

/**
 * Join tags array into comma-separated string
 */
function joinTags(tagsArray) {
  if (!Array.isArray(tagsArray) || tagsArray.length === 0) return '';
  return tagsArray.join(', ');
}

/**
 * Check if tag exists in tags list
 */
function tagExists(tag, allTags) {
  if (!tag || !allTags) return false;
  const tagLower = tag.toLowerCase();
  return allTags.some(t => t.toLowerCase() === tagLower);
}

// ==========================================================================
// Tag Color System
// ==========================================================================

// Predefined pastel colors for tags
const TAG_COLORS = [
  { bg: '#DBEAFE', text: '#1E40AF' }, // Blue
  { bg: '#D1FAE5', text: '#065F46' }, // Green
  { bg: '#FEE2E2', text: '#991B1B' }, // Red
  { bg: '#FEF3C7', text: '#92400E' }, // Yellow
  { bg: '#E0E7FF', text: '#3730A3' }, // Indigo
  { bg: '#FCE7F3', text: '#9D174D' }, // Pink
  { bg: '#CFFAFE', text: '#155E75' }, // Cyan
  { bg: '#F3E8FF', text: '#6B21A8' }, // Purple
  { bg: '#FFEDD5', text: '#9A3412' }, // Orange
  { bg: '#ECFDF5', text: '#047857' }, // Emerald
  { bg: '#FDF4FF', text: '#86198F' }, // Fuchsia
  { bg: '#F0FDF4', text: '#166534' }, // Lime
];

/**
 * Generate a consistent hash from a string
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get color for a tag based on its name
 */
function getTagColor(tagName) {
  const hash = hashString(tagName.toLowerCase());
  return TAG_COLORS[hash % TAG_COLORS.length];
}

// ==========================================================================
// Toast Notifications
// ==========================================================================

/**
 * Show a toast notification
 */
function showToast(type, message, duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 300ms ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Alias for backward compatibility
function showAlert(type, message) {
  showToast(type, message);
}

/**
 * Show loading spinner in an element
 */
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
}

// ==========================================================================
// Cache Functions
// ==========================================================================

/**
 * Get cache key
 */
function getCacheKey(key) {
  return `channel_tag_manager_${key}`;
}

/**
 * Get from cache
 */
function getFromCache(key) {
  try {
    const cached = localStorage.getItem(getCacheKey(key));
    if (!cached) return null;
    const data = JSON.parse(cached);
    const now = Date.now();
    if (data.expiry && now > data.expiry) {
      localStorage.removeItem(getCacheKey(key));
      return null;
    }
    return data.value;
  } catch (e) {
    return null;
  }
}

/**
 * Save to cache
 */
function saveToCache(key, value, ttl = CONFIG.CACHE_TTL) {
  try {
    const data = {
      value: value,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(getCacheKey(key), JSON.stringify(data));
  } catch (e) {
    console.warn('Cache save failed:', e);
  }
}

/**
 * Clear cache
 */
function clearCache() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('channel_tag_manager_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('Cache clear failed:', e);
  }
}

// ==========================================================================
// DOM Helpers
// ==========================================================================

/**
 * Create element with attributes and children
 */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        el.dataset[dataKey] = dataValue;
      });
    } else {
      el.setAttribute(key, value);
    }
  });
  
  children.forEach(child => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });
  
  return el;
}

/**
 * Safely query selector
 */
function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Safely query selector all
 */
function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}
