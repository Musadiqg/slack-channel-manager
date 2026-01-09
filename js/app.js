// ==========================================================================
// Channel Tag Manager - Main Application
// ==========================================================================

// Application State
const AppState = {
  // Data
  allChannels: [],
  allTags: [],
  tagLabelMap: {}, // Map prefix -> label
  filteredChannels: [],
  
  // Pagination
  currentPage: 1,
  pageSize: 25,
  
  // Sorting
  sortColumn: 'name',
  sortDirection: 'asc',
  
  // Filters
  searchQuery: '',
  activeTagFilters: [],
  showUntaggedOnly: false,
  
  // Modal state
  modalSelectedTags: [],
  
  // Selection & Editing
  pendingChanges: {}, // { row: { tags: [] } }
  openDropdownRow: null,
  
  // Stats
  tagCounts: {},
};

// ==========================================================================
// Initialization
// ==========================================================================

async function initApp() {
  try {
    console.log('Initializing app...');
    
    await waitForGoogleScripts();
    
    if (typeof CONFIG === 'undefined') {
      throw new Error('Configuration not loaded');
    }
    
    await initGoogleAPI();
    console.log('Google API initialized');
    
    await initGoogleIdentityServices();
    console.log('Google Identity Services initialized');
    
    $('#loading-state').classList.add('hidden');
    
    if (checkSignedIn()) {
      console.log('User signed in, loading data...');
      showApp();
      await loadInitialData();
    } else {
      console.log('User not signed in');
      $('#login-prompt').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    $('#loading-state').classList.add('hidden');
    $('#login-prompt').classList.remove('hidden');
    
    const errorDiv = $('#auth-error');
    if (errorDiv) {
      errorDiv.classList.remove('hidden');
      errorDiv.textContent = error.message || 'Failed to initialize. Please try again.';
    }
  }
}

async function waitForGoogleScripts() {
  let retries = 0;
  const maxRetries = 20;
  
  while (retries < maxRetries) {
    if (typeof google !== 'undefined' && google.accounts && typeof gapi !== 'undefined') {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    retries++;
  }
  
  throw new Error('Google scripts failed to load. Please check your internet connection.');
}

function showApp() {
  $('#login-prompt').classList.add('hidden');
  $('#main-app').classList.add('active');
  setupEventListeners();
}

// ==========================================================================
// Event Listeners
// ==========================================================================

function setupEventListeners() {
  // Search input
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 300));
  }
  
  // Sort headers
  $$('.data-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => handleSort(th.dataset.sort));
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tags-cell') && !e.target.closest('.tag-dropdown')) {
      closeAllDropdowns();
    }
  });
  
  // Modal tag search
  const modalSearch = $('#modal-tag-search');
  if (modalSearch) {
    modalSearch.addEventListener('input', debounce(handleModalSearch, 200));
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
      closeTagFilterModal();
    }
  });
}

// ==========================================================================
// Data Loading
// ==========================================================================

async function loadInitialData() {
  try {
    showTableLoading(true);
    
    // Load tags first (now returns {tags, tagLabelMap})
    const tagsData = await getAllTags();
    AppState.allTags = tagsData.tags || tagsData; // Handle both old and new format
    AppState.tagLabelMap = tagsData.tagLabelMap || {};
    
    // Load channels
    AppState.allChannels = await getAllChannels();
    AppState.filteredChannels = [...AppState.allChannels];
    
    // Debug: Log first channel to verify data
    if (AppState.allChannels.length > 0) {
      console.log('First channel:', AppState.allChannels[0]);
    }
    
    // Load statistics
    await loadStatistics();
    
    // Clear pending changes
    AppState.pendingChanges = {};
    updateFloatingSave();
    
    // Apply default sort and render
    applyFiltersAndSort();
    
    showTableLoading(false);
  } catch (error) {
    console.error('Error loading data:', error);
    showToast('error', 'Failed to load data: ' + error.message);
    showTableLoading(false);
  }
}

async function loadStatistics() {
  try {
    const stats = await getStatistics();
    
    $('#stat-total').textContent = stats.totalChannels;
    $('#stat-tags').textContent = stats.totalTags;
    $('#stat-untagged').textContent = stats.untaggedCount || 0;
    
    AppState.tagCounts = stats.tagCounts || {};
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

async function refreshData() {
  const refreshBtn = $('#refresh-btn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
  }
  
  if (Object.keys(AppState.pendingChanges).length > 0) {
    if (!confirm('You have unsaved changes. Refresh will discard them. Continue?')) {
      if (refreshBtn) refreshBtn.disabled = false;
      return;
    }
    AppState.pendingChanges = {};
    updateFloatingSave();
  }
  
  clearCache();
  await loadInitialData();
  
  if (refreshBtn) refreshBtn.disabled = false;
  showToast('success', 'Data refreshed');
}

// ==========================================================================
// Filtering & Sorting
// ==========================================================================

function handleSearch(e) {
  AppState.searchQuery = e.target.value.toLowerCase().trim();
  AppState.currentPage = 1;
  applyFiltersAndSort();
}

function handleSort(column) {
  if (AppState.sortColumn === column) {
    AppState.sortDirection = AppState.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    AppState.sortColumn = column;
    AppState.sortDirection = 'asc';
  }
  
  // Update sort indicators
  $$('.data-table th').forEach(th => {
    th.classList.remove('sorted');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '↕';
  });
  
  const activeHeader = $(`.data-table th[data-sort="${column}"]`);
  if (activeHeader) {
    activeHeader.classList.add('sorted');
    const icon = activeHeader.querySelector('.sort-icon');
    if (icon) icon.textContent = AppState.sortDirection === 'asc' ? '↑' : '↓';
  }
  
  applyFiltersAndSort();
}

function filterUntagged() {
  AppState.showUntaggedOnly = !AppState.showUntaggedOnly;
  AppState.activeTagFilters = [];
  AppState.currentPage = 1;
  
  // Update untagged pill
  const untaggedPill = $('.stat-pill.clickable');
  if (untaggedPill) {
    untaggedPill.classList.toggle('active', AppState.showUntaggedOnly);
  }
  
  applyFiltersAndSort();
  updateFilterUI();
}

function clearAllFilters() {
  AppState.searchQuery = '';
  AppState.activeTagFilters = [];
  AppState.showUntaggedOnly = false;
  AppState.currentPage = 1;
  
  const searchInput = $('#search-input');
  if (searchInput) searchInput.value = '';
  
  const untaggedPill = $('.stat-pill.clickable');
  if (untaggedPill) untaggedPill.classList.remove('active');
  
  applyFiltersAndSort();
  updateFilterUI();
  
  showToast('info', 'Filters cleared');
}

function applyFiltersAndSort() {
  let channels = [...AppState.allChannels];
  
  // Apply search filter
  if (AppState.searchQuery) {
    channels = channels.filter(ch => {
      const nameMatch = ch.name.toLowerCase().includes(AppState.searchQuery);
      const tagMatch = (ch.tags || []).some(t => t.toLowerCase().includes(AppState.searchQuery));
      return nameMatch || tagMatch;
    });
  }
  
  // Apply tag filters
  if (AppState.activeTagFilters.length > 0) {
    channels = channels.filter(ch => {
      const tags = getEffectiveTags(ch);
      return AppState.activeTagFilters.some(f => 
        tags.some(t => t.toLowerCase() === f.toLowerCase())
      );
    });
  }
  
  // Apply untagged filter
  if (AppState.showUntaggedOnly) {
    channels = channels.filter(ch => {
      const tags = getEffectiveTags(ch);
      return tags.length === 0;
    });
  }
  
  // Apply sorting
  channels.sort((a, b) => {
    let aVal, bVal;
    
    switch (AppState.sortColumn) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'type':
        aVal = (a.type || '').toLowerCase();
        bVal = (b.type || '').toLowerCase();
        break;
      default:
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
    }
    
    if (aVal < bVal) return AppState.sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return AppState.sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  AppState.filteredChannels = channels;
  
  // Update filtered count
  $('#stat-filtered').textContent = channels.length;
  
  renderTable();
  renderPagination();
}

function getEffectiveTags(channel) {
  if (AppState.pendingChanges[channel.row]) {
    return AppState.pendingChanges[channel.row].tags || [];
  }
  return channel.tags || [];
}

// ==========================================================================
// Table Rendering
// ==========================================================================

function renderTable() {
  const tbody = $('#table-body');
  const emptyState = $('#empty-state');
  
  if (!tbody) return;
  
  // Get current page data
  const startIndex = (AppState.currentPage - 1) * AppState.pageSize;
  const endIndex = startIndex + AppState.pageSize;
  const pageChannels = AppState.filteredChannels.slice(startIndex, endIndex);
  
  // Show/hide empty state
  if (pageChannels.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  
  if (emptyState) emptyState.classList.add('hidden');
  
  // Build table rows (no Members column)
  tbody.innerHTML = pageChannels.map(channel => renderTableRow(channel)).join('');
}

function renderTableRow(channel) {
  const hasPending = AppState.pendingChanges[channel.row] !== undefined;
  const tags = getEffectiveTags(channel);
  const channelType = (channel.type || 'public').toLowerCase();
  
  // Build tags HTML
  let tagsHtml = '';
  if (tags.length > 0) {
    tagsHtml = tags.map(tag => {
      const tagLabel = getTagLabel(tag);
      const color = getTagColor(tag);
      return `<span class="tag-badge" style="background:${color.bg};color:${color.text};" data-tag="${escapeHtml(tag)}" title="${escapeHtml(tag)}">${escapeHtml(tagLabel)}<span class="remove-tag" onclick="event.stopPropagation();removeTag(${channel.row},'${escapeHtml(tag)}')">&times;</span></span>`;
    }).join('');
  } else {
    tagsHtml = '<span class="tag-badge untagged">untagged</span>';
  }
  tagsHtml += `<button class="add-tag-btn" onclick="event.stopPropagation();toggleTagDropdown(${channel.row},this)" title="Add tag">+</button>`;
  
  const unsavedHtml = hasPending ? '<span class="unsaved-dot" title="Unsaved changes"></span>' : '';
  const rowClass = hasPending ? 'has-changes' : '';
  
  // Members popup button - always show button, handle empty members in popup
  const membersStr = channel.members || '';
  const membersBtn = `<button class="view-members-btn" onclick="event.stopPropagation();showMembersPopup(${channel.row},'${escapeHtml(channel.name)}','${escapeHtml(membersStr)}')" title="View members"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><span class="view-btn-text">View</span></button>`;
  
  return `<tr class="${rowClass}" data-row="${channel.row}"><td class="col-name"><span class="channel-name"><span class="prefix">#</span>${escapeHtml(channel.name)}</span>${unsavedHtml}</td><td class="col-type"><span class="type-badge ${channelType}">${escapeHtml(channelType)}</span></td><td class="col-tags"><div class="tags-cell" data-row="${channel.row}">${tagsHtml}</div></td><td class="col-members">${membersBtn}</td></tr>`;
}

function showTableLoading(show) {
  const loading = $('#table-loading');
  const tbody = $('#table-body');
  
  if (show) {
    if (loading) loading.classList.remove('hidden');
    if (tbody) tbody.innerHTML = '';
  } else {
    if (loading) loading.classList.add('hidden');
  }
}

// ==========================================================================
// Tag Filter Modal
// ==========================================================================

function openTagFilterModal() {
  // Copy current filters to modal state
  AppState.modalSelectedTags = [...AppState.activeTagFilters];
  
  // Render modal tags
  renderModalTags();
  
  // Show modal
  $('#tag-modal-backdrop').classList.add('open');
  $('#tag-filter-modal').classList.add('open');
  
  // Focus search
  setTimeout(() => {
    const search = $('#modal-tag-search');
    if (search) {
      search.value = '';
      search.focus();
    }
  }, 100);
}

function closeTagFilterModal() {
  $('#tag-modal-backdrop').classList.remove('open');
  $('#tag-filter-modal').classList.remove('open');
}

function handleModalSearch(e) {
  renderModalTags(e.target.value.toLowerCase().trim());
}

function renderModalTags(searchQuery = '') {
  const container = $('#modal-tag-list');
  if (!container) return;
  
  // Filter tags by search
  let tags = AppState.allTags;
  if (searchQuery) {
    tags = tags.filter(t => t.toLowerCase().includes(searchQuery));
  }
  
  if (tags.length === 0) {
    container.innerHTML = '<div class="modal-empty">No tags found</div>';
    updateModalSelectionInfo();
    return;
  }
  
  // Sort by count (most used first)
  tags = [...tags].sort((a, b) => {
    const countA = AppState.tagCounts[a] || 0;
    const countB = AppState.tagCounts[b] || 0;
    return countB - countA;
  });
  
  container.innerHTML = tags.map(tag => {
    const isSelected = AppState.modalSelectedTags.includes(tag);
    const count = AppState.tagCounts[tag] || 0;
    const color = getTagColor(tag);
    const tagLabel = getTagLabel(tag);
    
    return `
      <div class="modal-tag-item ${isSelected ? 'selected' : ''}"
           onclick="toggleModalTag('${escapeHtml(tag)}')"
           style="${isSelected ? '' : `border-color: ${color.bg};`}"
           title="${escapeHtml(tag)}">
        <span class="checkbox"></span>
        <span class="tag-label">${escapeHtml(tagLabel)}</span>
        <span class="tag-count">${count}</span>
      </div>
    `;
  }).join('');
  
  updateModalSelectionInfo();
}

function toggleModalTag(tag) {
  const index = AppState.modalSelectedTags.indexOf(tag);
  if (index === -1) {
    AppState.modalSelectedTags.push(tag);
  } else {
    AppState.modalSelectedTags.splice(index, 1);
  }
  
  // Update visual state
  const item = $$(`.modal-tag-item`).find(el => 
    el.querySelector('.tag-label')?.textContent === tag
  );
  if (item) {
    item.classList.toggle('selected', AppState.modalSelectedTags.includes(tag));
  }
  
  updateModalSelectionInfo();
}

function updateModalSelectionInfo() {
  const info = $('#modal-selection-info');
  if (info) {
    const count = AppState.modalSelectedTags.length;
    info.textContent = count === 0 
      ? 'No tags selected' 
      : `${count} tag${count > 1 ? 's' : ''} selected`;
  }
}

function clearTagFilters() {
  AppState.modalSelectedTags = [];
  renderModalTags($('#modal-tag-search')?.value || '');
}

function applyTagFilters() {
  AppState.activeTagFilters = [...AppState.modalSelectedTags];
  AppState.showUntaggedOnly = false;
  AppState.currentPage = 1;
  
  // Update untagged pill
  const untaggedPill = $('.stat-pill.clickable');
  if (untaggedPill) untaggedPill.classList.remove('active');
  
  closeTagFilterModal();
  applyFiltersAndSort();
  updateFilterUI();
}

function updateFilterUI() {
  // Update filter button
  const filterBtn = $('#tag-filter-btn');
  const filterCount = $('#filter-count');
  const clearBtn = $('#clear-filters-btn');
  
  const hasFilters = AppState.activeTagFilters.length > 0 || AppState.showUntaggedOnly || AppState.searchQuery;
  
  if (filterBtn) {
    filterBtn.classList.toggle('has-filters', AppState.activeTagFilters.length > 0);
  }
  
  if (filterCount) {
    filterCount.textContent = AppState.activeTagFilters.length || '';
  }
  
  if (clearBtn) {
    clearBtn.style.display = hasFilters ? 'inline-flex' : 'none';
  }
  
  // Render active filters
  renderActiveFilters();
}

function renderActiveFilters() {
  const container = $('#active-filters');
  if (!container) return;
  
  const chips = [];
  
  if (AppState.searchQuery) {
    chips.push(`
      <span class="active-filter-chip" 
            style="background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary);"
            onclick="clearSearch()">
        Search: "${escapeHtml(AppState.searchQuery)}"
        <span class="remove">&times;</span>
      </span>
    `);
  }
  
  if (AppState.showUntaggedOnly) {
    chips.push(`
      <span class="active-filter-chip"
            style="background: var(--color-warning-bg); border-color: var(--color-warning); color: var(--color-warning);"
            onclick="filterUntagged()">
        Untagged only
        <span class="remove">&times;</span>
      </span>
    `);
  }
  
  AppState.activeTagFilters.forEach(tag => {
    const tagLabel = getTagLabel(tag);
    const color = getTagColor(tag);
    chips.push(`
      <span class="active-filter-chip"
            style="background: ${color.bg}; border-color: ${color.text}; color: ${color.text};"
            onclick="removeTagFilter('${escapeHtml(tag)}')"
            title="${escapeHtml(tag)}">
        ${escapeHtml(tagLabel)}
        <span class="remove">&times;</span>
      </span>
    `);
  });
  
  container.innerHTML = chips.join('');
}

function removeTagFilter(tag) {
  const index = AppState.activeTagFilters.indexOf(tag);
  if (index !== -1) {
    AppState.activeTagFilters.splice(index, 1);
    AppState.currentPage = 1;
    applyFiltersAndSort();
    updateFilterUI();
  }
}

function clearSearch() {
  AppState.searchQuery = '';
  const searchInput = $('#search-input');
  if (searchInput) searchInput.value = '';
  AppState.currentPage = 1;
  applyFiltersAndSort();
  updateFilterUI();
}

// ==========================================================================
// Tag Dropdown (Inline Editor)
// ==========================================================================

function toggleTagDropdown(row, buttonElement) {
  if (AppState.openDropdownRow === row) {
    closeAllDropdowns();
    return;
  }
  
  closeAllDropdowns();
  
  const cell = buttonElement.closest('.tags-cell');
  if (!cell) return;
  
  const channel = AppState.allChannels.find(c => c.row === row);
  if (!channel) return;
  
  const currentTags = getEffectiveTags(channel);
  
  const template = $('#tag-dropdown-template');
  const dropdown = template.content.cloneNode(true).querySelector('.tag-dropdown');
  
  const listContainer = dropdown.querySelector('.tag-dropdown-list');
  renderDropdownTags(listContainer, currentTags, row);
  
  const searchInput = dropdown.querySelector('input');
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    const filtered = AppState.allTags.filter(t => t.toLowerCase().includes(query));
    renderDropdownTags(listContainer, currentTags, row, filtered);
  }, 150));
  
  cell.appendChild(dropdown);
  dropdown.classList.add('open');
  
  setTimeout(() => searchInput.focus(), 50);
  
  AppState.openDropdownRow = row;
}

function renderDropdownTags(container, currentTags, row, tagsToShow = null) {
  const tags = tagsToShow || AppState.allTags;
  
  if (tags.length === 0) {
    container.innerHTML = '<div class="tag-dropdown-empty">No tags found</div>';
    return;
  }
  
  // Sort by relevance (selected first, then by count)
  const sortedTags = [...tags].sort((a, b) => {
    const aSelected = currentTags.some(t => t.toLowerCase() === a.toLowerCase());
    const bSelected = currentTags.some(t => t.toLowerCase() === b.toLowerCase());
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return (AppState.tagCounts[b] || 0) - (AppState.tagCounts[a] || 0);
  });
  
  container.innerHTML = sortedTags.map(tag => {
    const isSelected = currentTags.some(t => t.toLowerCase() === tag.toLowerCase());
    const color = getTagColor(tag);
    const tagLabel = getTagLabel(tag);
    return `
      <div class="tag-dropdown-item ${isSelected ? 'selected' : ''}"
           onclick="toggleTag(${row}, '${escapeHtml(tag)}')"
           title="${escapeHtml(tag)}">
        <span class="checkbox"></span>
        <span>${escapeHtml(tagLabel)}</span>
      </div>
    `;
  }).join('');
}

function closeAllDropdowns() {
  $$('.tag-dropdown.open').forEach(dd => dd.remove());
  AppState.openDropdownRow = null;
}

// ==========================================================================
// Tag Management
// ==========================================================================

/**
 * Get the label for a tag prefix, or return the prefix if no label exists
 */
function getTagLabel(prefix) {
  if (!prefix) return '';
  const label = AppState.tagLabelMap[prefix.toLowerCase()];
  return label || prefix;
}

function toggleTag(row, tag) {
  const channel = AppState.allChannels.find(c => c.row === row);
  if (!channel) return;
  
  const currentTags = getEffectiveTags(channel);
  const tagIndex = currentTags.findIndex(t => t.toLowerCase() === tag.toLowerCase());
  
  let newTags;
  if (tagIndex === -1) {
    newTags = [...currentTags, tag];
  } else {
    newTags = currentTags.filter((_, i) => i !== tagIndex);
  }
  
  AppState.pendingChanges[row] = { tags: newTags };
  updateFloatingSave();
  
  // Re-render the row
  const tr = $(`tr[data-row="${row}"]`);
  if (tr) {
    tr.outerHTML = renderTableRow({ ...channel, tags: newTags });
    
    if (AppState.openDropdownRow === row) {
      const addBtn = $(`.tags-cell[data-row="${row}"] .add-tag-btn`);
      if (addBtn) {
        AppState.openDropdownRow = null;
        toggleTagDropdown(row, addBtn);
      }
    }
  }
}

function removeTag(row, tag) {
  toggleTag(row, tag);
}

// ==========================================================================
// Members Popup
// ==========================================================================

function showMembersPopup(row, channelName, membersString) {
  // Parse members (comma-separated)
  const members = membersString.split(',').map(m => m.trim()).filter(m => m);
  
  // Create popup
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop open';
  backdrop.onclick = () => closeMembersPopup();
  
  const modal = document.createElement('div');
  modal.className = 'modal members-modal open';
  modal.innerHTML = `
    <div class="modal-header">
      <h3>#${escapeHtml(channelName)} Members</h3>
      <button class="btn btn-icon btn-ghost" onclick="closeMembersPopup()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="modal-body members-list">
      ${members.length > 0 ? members.map(m => `<div class="member-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg><span>${escapeHtml(m)}</span></div>`).join('') : '<div class="modal-empty">No members found</div>'}
    </div>
    <div class="modal-footer">
      <span class="modal-selection-info">${members.length} member${members.length !== 1 ? 's' : ''}</span>
      <button class="btn btn-primary" onclick="closeMembersPopup()">Close</button>
    </div>
  `;
  
  backdrop.id = 'members-backdrop';
  modal.id = 'members-modal';
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
}

function closeMembersPopup() {
  const backdrop = document.getElementById('members-backdrop');
  const modal = document.getElementById('members-modal');
  if (backdrop) backdrop.remove();
  if (modal) modal.remove();
}

// ==========================================================================
// Save Changes
// ==========================================================================

async function saveAllChanges() {
  const changes = Object.entries(AppState.pendingChanges).map(([row, data]) => ({
    row: parseInt(row),
    tags: data.tags
  }));
  
  if (changes.length === 0) {
    showToast('info', 'No changes to save');
    return;
  }
  
  const saveBtn = $('#save-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner sm"></div> Saving...`;
  }
  
  try {
    const allNewTags = new Set();
    changes.forEach(change => {
      change.tags.forEach(tag => allNewTags.add(tag));
    });
    
    if (allNewTags.size > 0) {
      await addTagsIfNotExist(Array.from(allNewTags));
    }
    
    await batchUpdateChannelTags(changes);
    
    showToast('success', `Saved ${changes.length} channel${changes.length > 1 ? 's' : ''}`);
    
    // Update local data
    changes.forEach(change => {
      const channel = AppState.allChannels.find(c => c.row === change.row);
      if (channel) {
        channel.tags = change.tags;
        channel.tag = joinTags(change.tags);
      }
    });
    
    AppState.pendingChanges = {};
    updateFloatingSave();
    renderTable();
    
    await loadStatistics();
    
  } catch (error) {
    showToast('error', 'Failed to save: ' + error.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        Save Changes
        <span class="save-count" id="save-count">${Object.keys(AppState.pendingChanges).length}</span>
      `;
    }
  }
}

function updateFloatingSave() {
  const container = $('#floating-save');
  const countEl = $('#save-count');
  const count = Object.keys(AppState.pendingChanges).length;
  
  if (count > 0) {
    container.classList.add('visible');
    if (countEl) countEl.textContent = count;
  } else {
    container.classList.remove('visible');
  }
}

// ==========================================================================
// Pagination
// ==========================================================================

function renderPagination() {
  const total = AppState.filteredChannels.length;
  const totalPages = Math.ceil(total / AppState.pageSize);
  const current = AppState.currentPage;
  
  const start = total === 0 ? 0 : (current - 1) * AppState.pageSize + 1;
  const end = Math.min(current * AppState.pageSize, total);
  
  $('#page-start').textContent = start;
  $('#page-end').textContent = end;
  $('#page-total').textContent = total;
  
  $('#prev-page').disabled = current <= 1;
  $('#next-page').disabled = current >= totalPages;
  
  const pageNumbers = $('#page-numbers');
  if (!pageNumbers) return;
  
  let html = '';
  const maxVisible = 5;
  
  let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span style="padding: 0 4px; color: var(--color-text-muted);">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="pagination-btn ${i === current ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span style="padding: 0 4px; color: var(--color-text-muted);">...</span>`;
    }
    html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
  }
  
  pageNumbers.innerHTML = html;
}

function goToPage(page) {
  const totalPages = Math.ceil(AppState.filteredChannels.length / AppState.pageSize);
  AppState.currentPage = Math.max(1, Math.min(page, totalPages));
  renderTable();
  renderPagination();
  // Scroll to top of table
  $('.table-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevPage() {
  goToPage(AppState.currentPage - 1);
}

function nextPage() {
  goToPage(AppState.currentPage + 1);
}

function changePageSize(size) {
  AppState.pageSize = parseInt(size);
  AppState.currentPage = 1;
  renderTable();
  renderPagination();
}

// ==========================================================================
// Initialize
// ==========================================================================

window.addEventListener('load', initApp);
