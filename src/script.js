function doPost(e) {
  try {
    console.log('📨 POST request received');
    
    const data = JSON.parse(e.postData.contents);
    console.log('Received data:', JSON.stringify(data));
    
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    
    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PB_DAYS_MasterBox');
      
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'Sheet "PB_DAYS_MasterBox" not found'
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Normalize function
      const normalizeOrderId = (id) => {
        if (!id) return '';
        return id.toString().replace(/^0+|'/g, '') || '0';
      };
      
      // Check duplicate
      if (data.order_id && data.order_id !== 'N/A' && data.order_id !== '') {
        const lastRow = sheet.getLastRow();
        
        if (lastRow > 1) {
          const orderIdRange = sheet.getRange(2, 9, lastRow - 1, 1);
          const orderIds = orderIdRange.getDisplayValues(); // Use getDisplayValues() to get text as shown
          
          const normalizedNewId = normalizeOrderId(data.order_id);
          console.log('Checking duplicate. Normalized new ID:', normalizedNewId);
          
          for (let i = 0; i < orderIds.length; i++) {
            const existingOrderId = orderIds[i][0];
            const normalizedExistingId = normalizeOrderId(existingOrderId);
            
            console.log('Comparing:', normalizedExistingId, 'vs', normalizedNewId);
            
            if (normalizedExistingId === normalizedNewId) {
              console.log('❌ DUPLICATE at row', (i + 2));
              
              return ContentService.createTextOutput(JSON.stringify({
                success: false,
                error: 'Duplicate submission detected',
                duplicate: true,
                message: 'This order has already claimed a MasterBox',
                order_id: data.order_id
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
          
          console.log('✅ No duplicate');
        }
      }
      
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      
      // Append row
      const newRow = [
        timestamp,
        data.email || '',
        data.customer_id || '',
        data.firstname || '',
        data.lastname || '',
        data.specialties || '',
        data.specialty_count || 0,
        data.campaign || 'PB_DAYS_OCT_2025',
        data.order_id || '',  // Just the plain value
        data.submission_id || '',
        'ACTIVE',
        timestamp
      ];
      
      sheet.appendRow(newRow);
      
      // ✅ NOW force the Order ID column (I) to TEXT format
      const newRowNumber = sheet.getLastRow();
      const orderIdCell = sheet.getRange(newRowNumber, 9); // Column I
      orderIdCell.setNumberFormat('@STRING@'); // Force text format
      
      console.log('✅ Row added with text format for order:', data.order_id);
      
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'MasterBox submission recorded successfully',
        timestamp: timestamp,
        order_id: data.order_id
      })).setMimeType(ContentService.MimeType.JSON);
      
    } finally {
      lock.releaseLock();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'checkOrder') {
    const orderId = e.parameter.orderId;
    return checkOrderExists(orderId);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'PB DAYS MasterBox Google Sheets API is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function checkOrderExists(orderId) {
  try {
    if (!orderId) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Order ID is required',
        exists: false
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PB_DAYS_MasterBox');
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Sheet not found',
        exists: false
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    const normalizeOrderId = (id) => {
      if (!id) return '';
      return id.toString().replace(/^0+|'/g, '') || '0';
    };
    
    const data = sheet.getDataRange().getDisplayValues(); // Use display values
    const normalizedSearchId = normalizeOrderId(orderId);
    
    console.log('Checking for:', orderId, '(normalized:', normalizedSearchId + ')');
    
    for (let i = 1; i < data.length; i++) {
      const rowOrderId = data[i][8];
      const normalizedRowId = normalizeOrderId(rowOrderId);
      
      if (normalizedRowId === normalizedSearchId) {
        console.log('✅ Found');
        
        return ContentService.createTextOutput(JSON.stringify({
          exists: true,
          orderId: orderId,
          timestamp: data[i][0],
          email: data[i][1],
          specialties: data[i][5],
          campaign: data[i][7]
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    console.log('❌ Not found');
    
    return ContentService.createTextOutput(JSON.stringify({
      exists: false,
      orderId: orderId
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error:', error.toString());
    
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString(),
      exists: false
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
