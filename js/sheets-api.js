// ==========================================================================
// Google Sheets API wrapper
// ==========================================================================

/**
 * Get all channels from the main sheet
 * Sheet columns: A=Name, B=Type, C=Members, D=Tags
 * 
 * Note: Google Sheets API may return sparse arrays or shift data
 * if leading columns are empty. We handle this by reading headers first.
 */
async function getAllChannels() {
  if (!checkSignedIn()) {
    throw new Error('User not signed in');
  }
  
  // Check cache first
  const cached = getFromCache('channels');
  if (cached) {
    return cached;
  }
  
  try {
    // First, read the header row to understand column mapping
    const headerResponse = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.MAIN}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    const headers = (headerResponse.result.values?.[0] || []).map(h => 
      (h || '').toString().toLowerCase().trim()
    );
    
    console.log('Sheet headers:', headers);
    
    // Find column indices dynamically
    const nameCol = headers.findIndex(h => h === 'name');
    const typeCol = headers.findIndex(h => h === 'type');
    const membersCol = headers.findIndex(h => h === 'members');
    const tagsCol = headers.findIndex(h => h === 'tags');
    
    console.log('Column indices - Name:', nameCol, 'Type:', typeCol, 'Members:', membersCol, 'Tags:', tagsCol);
    
    // Read all data rows
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.MAIN}!A2:Z`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    const rows = response.result.values || [];
    const channels = [];
    
    rows.forEach((row, index) => {
      // Get values using dynamic column indices, with fallbacks
      const name = nameCol >= 0 ? (row[nameCol] || '').toString().trim() : '';
      const type = typeCol >= 0 ? (row[typeCol] || '').toString().trim() : '';
      const members = membersCol >= 0 ? (row[membersCol] || '').toString().trim() : '';
      const tagString = tagsCol >= 0 ? (row[tagsCol] || '').toString().trim() : '';
      
      // Skip rows with empty names
      if (!name) return;
      
      const tags = parseTags(tagString);
      
      channels.push({
        row: index + 2, // +2 because we start from row 2 (after header)
        name: name,
        type: type || 'public',
        members: members,
        tags: tags,
        tag: tagString,
        // Store the tags column index for updates
        _tagsColIndex: tagsCol
      });
    });
    
    // Store tags column for updates
    window._tagsColumnLetter = tagsCol >= 0 ? String.fromCharCode(65 + tagsCol) : 'D';
    console.log('Tags column letter:', window._tagsColumnLetter);
    
    // Cache the result
    saveToCache('channels', channels);
    
    console.log(`Loaded ${channels.length} channels. First channel:`, channels[0]);
    return channels;
  } catch (error) {
    console.error('Error loading channels:', error);
    throw new Error('Failed to load channels: ' + (error.result?.error?.message || error.message));
  }
}

/**
 * Get all tags from Tags sheet
 * Sheet has columns: Prefix and Label
 * Returns both tags array and prefix-to-label mapping
 */
async function getAllTags() {
  if (!checkSignedIn()) {
    throw new Error('User not signed in');
  }
  
  // Check cache first
  const cached = getFromCache('tags');
  if (cached) {
    return cached;
  }
  
  try {
    // Read header to find Prefix and Label columns
    const headerResponse = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.TAGS}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    const headers = (headerResponse.result.values?.[0] || []).map(h => 
      (h || '').toString().toLowerCase().trim()
    );
    
    // Find the Prefix column (could be named 'prefix' or 'tag' or 'tags')
    let prefixCol = headers.findIndex(h => h === 'prefix');
    if (prefixCol === -1) prefixCol = headers.findIndex(h => h === 'tag' || h === 'tags');
    if (prefixCol === -1) prefixCol = 0; // Default to first column
    
    // Find the Label column
    let labelCol = headers.findIndex(h => h === 'label');
    if (labelCol === -1) labelCol = -1; // Label column is optional
    
    // Find the Agents column
    let agentsCol = headers.findIndex(h => h === 'agents');
    if (agentsCol === -1) agentsCol = -1; // Agents column is optional
    
    console.log('Tags sheet - Prefix column index:', prefixCol, 'Label column index:', labelCol, 'Agents column index:', agentsCol);
    
    // Read all data rows (prefix, label, and agents columns)
    const maxCol = Math.max(prefixCol, labelCol >= 0 ? labelCol : prefixCol, agentsCol >= 0 ? agentsCol : prefixCol);
    const colRange = `${String.fromCharCode(65)}2:${String.fromCharCode(65 + maxCol)}`;
    
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.TAGS}!${colRange}`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    const rows = response.result.values || [];
    const tags = [];
    const tagLabelMap = {}; // Map prefix -> label
    const tagAgentsMap = {}; // Map prefix -> agent IDs (CSV string)
    
    rows.forEach(row => {
      const prefix = prefixCol >= 0 ? (row[prefixCol] || '').toString().trim() : '';
      if (!prefix) return; // Skip empty rows
      
      const label = labelCol >= 0 && row[labelCol] ? (row[labelCol] || '').toString().trim() : '';
      const agents = agentsCol >= 0 && row[agentsCol] ? (row[agentsCol] || '').toString().trim() : '';
      
      tags.push(prefix);
      if (label) {
        tagLabelMap[prefix.toLowerCase()] = label;
      }
      if (agents) {
        tagAgentsMap[prefix.toLowerCase()] = agents;
      }
    });
    
    tags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    const result = {
      tags: tags,
      tagLabelMap: tagLabelMap,
      tagAgentsMap: tagAgentsMap
    };
    
    // Cache the result
    saveToCache('tags', result);
    
    console.log(`Loaded ${tags.length} tags with ${Object.keys(tagLabelMap).length} labels and ${Object.keys(tagAgentsMap).length} with agents`);
    return result;
  } catch (error) {
    console.error('Error loading tags:', error);
    throw new Error('Failed to load tags: ' + (error.result?.error?.message || error.message));
  }
}

/**
 * Get all agents from Agents sheet
 * Sheet has columns: ID and Agent
 * Returns ID -> Agent name mapping
 */
async function getAllAgents() {
  if (!checkSignedIn()) {
    throw new Error('User not signed in');
  }
  
  // Check cache first
  const cached = getFromCache('agents');
  if (cached) {
    return cached;
  }
  
  try {
    // Read header to find ID and Agent columns
    const headerResponse = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.AGENTS}!A1:Z1`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    const headers = (headerResponse.result.values?.[0] || []).map(h => 
      (h || '').toString().toLowerCase().trim()
    );
    
    // Find the ID column
    let idCol = headers.findIndex(h => h === 'id');
    if (idCol === -1) idCol = 0; // Default to first column
    
    // Find the Agent column
    let agentCol = headers.findIndex(h => h === 'agent');
    if (agentCol === -1) agentCol = 1; // Default to second column
    
    console.log('Agents sheet - ID column index:', idCol, 'Agent column index:', agentCol);
    
    // Read all data rows
    const maxCol = Math.max(idCol, agentCol);
    const colRange = `${String.fromCharCode(65)}2:${String.fromCharCode(65 + maxCol)}`;
    
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.AGENTS}!${colRange}`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    });
    
    const rows = response.result.values || [];
    const agentIdMap = {}; // Map ID -> Agent name
    
    rows.forEach(row => {
      const id = idCol >= 0 ? (row[idCol] || '').toString().trim() : '';
      const agent = agentCol >= 0 ? (row[agentCol] || '').toString().trim() : '';
      
      if (id && agent) {
        agentIdMap[id] = agent;
      }
    });
    
    // Cache the result
    saveToCache('agents', agentIdMap);
    
    console.log(`Loaded ${Object.keys(agentIdMap).length} agents`);
    return agentIdMap;
  } catch (error) {
    console.error('Error loading agents:', error);
    throw new Error('Failed to load agents: ' + (error.result?.error?.message || error.message));
  }
}

/**
 * Batch update channel tags
 */
async function batchUpdateChannelTags(updates) {
  if (!checkSignedIn()) {
    throw new Error('User not signed in');
  }
  
  if (!updates || updates.length === 0) {
    throw new Error('No updates provided');
  }
  
  try {
    // Use the dynamically determined tags column
    const tagsCol = window._tagsColumnLetter || 'D';
    
    // Prepare batch update requests
    const data = updates.map(update => {
      const tagString = Array.isArray(update.tags) ? joinTags(update.tags) : '';
      return {
        range: `${CONFIG.SHEET_NAMES.MAIN}!${tagsCol}${update.row}`,
        values: [[tagString]]
      };
    });
    
    const request = {
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      resource: {
        valueInputOption: 'RAW',
        data: data
      }
    };
    
    await gapi.client.sheets.spreadsheets.values.batchUpdate(request);
    
    // Clear cache after update
    clearCache();
    
    return {
      success: true,
      message: `Successfully updated ${updates.length} channel(s)`,
      updated: updates.length
    };
  } catch (error) {
    console.error('Error updating channels:', error);
    throw new Error('Failed to update channels: ' + (error.result?.error?.message || error.message));
  }
}

/**
 * Add new tags to Tags sheet if they don't exist
 */
async function addTagsIfNotExist(newTags) {
  if (!checkSignedIn() || !newTags || newTags.length === 0) {
    return { added: 0 };
  }
  
  try {
    // Get existing tags
    const tagsData = await getAllTags();
    const existingTags = tagsData.tags || tagsData; // Handle both old and new format
    const existingTagsLower = new Set(Array.isArray(existingTags) ? existingTags.map(t => t.toLowerCase()) : []);
    
    // Find tags that don't exist
    const tagsToAdd = newTags.filter(tag => {
      const tagLower = tag.trim().toLowerCase();
      return tagLower && !existingTagsLower.has(tagLower);
    });
    
    if (tagsToAdd.length === 0) {
      return { added: 0 };
    }
    
    // Get last row in Tags sheet
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.TAGS}!A:A`
    });
    
    const lastRow = (response.result.values?.length || 1) + 1;
    
    // Prepare values to append
    const values = tagsToAdd.map(tag => [tag.trim()]);
    
    // Append new tags
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${CONFIG.SHEET_NAMES.TAGS}!A${lastRow}:A${lastRow + values.length - 1}`,
      valueInputOption: 'RAW',
      resource: { values }
    });
    
    // Clear cache
    clearCache();
    
    return { added: tagsToAdd.length, tags: tagsToAdd };
  } catch (error) {
    console.error('Error adding tags:', error);
    return { added: 0, error: error.message };
  }
}

/**
 * Get statistics about channels
 */
async function getStatistics() {
  const channels = await getAllChannels();
  const tagsData = await getAllTags();
  const tags = tagsData.tags || tagsData; // Handle both old and new format
  
  const tagCounts = {};
  let untaggedCount = 0;
  
  // Count tag occurrences
  channels.forEach(channel => {
    if (channel.tags && channel.tags.length > 0) {
      channel.tags.forEach(tag => {
        const tagLower = tag.toLowerCase();
        // Find the original case version
        const originalTag = Array.isArray(tags) ? tags.find(t => t.toLowerCase() === tagLower) || tag : tag;
        tagCounts[originalTag] = (tagCounts[originalTag] || 0) + 1;
      });
    } else {
      untaggedCount++;
    }
  });
  
  return {
    totalChannels: channels.length,
    totalTags: Array.isArray(tags) ? tags.length : 0,
    tagCounts: tagCounts,
    untaggedCount: untaggedCount
  };
}
