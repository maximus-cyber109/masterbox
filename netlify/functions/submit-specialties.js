const axios = require('axios');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('=== SUBMIT SPECIALTIES FUNCTION START ===');
  console.log('Method:', event.httpMethod);
  console.log('Body received:', event.body);

  try {
    if (!event.body) {
      throw new Error('No request body provided');
    }

    let submissionData;
    try {
      submissionData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    console.log('Parsed data:', submissionData);

    const { 
      email, 
      firstname, 
      lastname, 
      customerId, 
      specialties, 
      orderId,
      orderEntityId,
      orderAmount,
      testMode = false
    } = submissionData;

    // Validate required fields
    if (!email) {
      throw new Error('Email is required');
    }
    if (!specialties || !Array.isArray(specialties) || specialties.length === 0) {
      throw new Error('At least one specialty must be selected');
    }

    const submissionId = `PB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Generated submission ID:', submissionId);

    // Create submission payload
    const submissionPayload = {
      timestamp: new Date().toISOString(),
      submission_id: submissionId,
      email: email,
      customer_id: customerId || 'N/A',
      firstname: firstname || 'N/A',
      lastname: lastname || 'N/A',
      specialties: specialties.join(', '),
      specialty_count: specialties.length,
      campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
      order_id: orderId || 'N/A'
    };

    console.log('Submission payload:', submissionPayload);

    const results = {
      sheets: false,
      webengage_user: false,
      webengage_event: false
    };

    // Step 1: Send to Google Sheets
    try {
      console.log('Sending to Google Sheets...');
      await sendToGoogleSheetsWebhook(submissionPayload);
      results.sheets = true;
      console.log('✅ Google Sheets successful');
    } catch (sheetsError) {
      console.error('❌ Google Sheets failed:', sheetsError.message);
    }

    // Step 2: WebEngage operations
    const webengageUserId = customerId ? `magento_${customerId}` : email.replace(/[@.]/g, '_');
    
    try {
      console.log('Creating WebEngage user:', webengageUserId);
      await createOrUpdateWebEngageUser({
        userId: webengageUserId,
        email,
        firstname,
        lastname,
        customerId,
        submissionId,
        specialties,
        orderId,
        testMode
      });
      results.webengage_user = true;
      console.log('✅ WebEngage user successful');

      console.log('Tracking WebEngage event...');
      await sendSimpleWebEngageEvent({
        email,
        firstname,
        lastname,
        specialties,
        orderId,
        orderAmount,
        submissionId,
        testMode
      });
      results.webengage_event = true;
      console.log('✅ WebEngage event successful');

    } catch (webengageError) {
      console.error('❌ WebEngage failed:', webengageError.message);
      
      if (!results.sheets) {
        throw new Error('Both Google Sheets and WebEngage failed');
      }
    }

    console.log('=== SUCCESS ===');
    console.log('Results:', results);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Specialties submitted successfully',
        submissionId,
        integrations: results
      })
    };

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

async function sendToGoogleSheetsWebhook(data) {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK;
  
  if (!webhookUrl) {
    throw new Error('GOOGLE_SHEETS_WEBHOOK not configured');
  }

  console.log('Google Sheets URL:', webhookUrl);

  const response = await axios.post(webhookUrl, {
    timestamp: data.timestamp,
    email: data.email,
    customer_id: data.customer_id,
    firstname: data.firstname,
    lastname: data.lastname,
    specialties: data.specialties,
    specialty_count: data.specialty_count,
    campaign: data.campaign,
    order_id: data.order_id,
    submission_id: data.submission_id
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
  });

  console.log('Google Sheets response:', response.status, response.data);
  return response.data;
}

async function createOrUpdateWebEngageUser(params) {
  const { userId, email, firstname, lastname, customerId, submissionId, specialties, orderId, testMode } = params;
  
  const licenseCode = process.env.WEBENGAGE_LICENSE_CODE;
  const apiKey = process.env.WEBENGAGE_API_KEY;

  if (!licenseCode || !apiKey) {
    throw new Error('WebEngage credentials not configured');
  }

  const apiUrl = `https://api.webengage.com/v1/accounts/${licenseCode}/users`;
  
  console.log('WebEngage User URL:', apiUrl);

  const userData = {
    userId,
    attributes: {
      we_email: email,
      we_first_name: firstname || 'N/A',
      we_last_name: lastname || 'N/A',
      magento_customer_id: customerId || null,
      pb_days_participant: true,
      pb_days_submission_id: submissionId,
      pb_days_specialties: specialties.join(', '),
      pb_days_specialty_count: specialties.length,
      pb_days_order_id: orderId || 'N/A',
      pb_days_campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
      pb_days_submission_date: new Date().toISOString(),
      source: 'PB_DAYS_MasterBox_Campaign',
      specialty_endodontist: specialties.includes('Endodontist'),
      specialty_prosthodontist: specialties.includes('Prosthodontist'),
      specialty_orthodontist: specialties.includes('Orthodontist'),
      specialty_oral_surgeon: specialties.includes('Oral And Maxillofacial Surgeon'),
      specialty_paedodontist: specialties.includes('Paedodontist'),
      specialty_periodontist: specialties.includes('Periodontist'),
      specialty_general_dentist: specialties.includes('General Dentist'),
      last_campaign_participation: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
      last_interaction_date: new Date().toISOString(),
      test_mode: testMode || false
    }
  };

  const response = await axios.post(apiUrl, userData, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  console.log('WebEngage user response:', response.status);
  return response.data;
}

// ✅ FIXED: Using your working WebEngage approach
async function sendSimpleWebEngageEvent(params) {
  const { email, firstname, lastname, specialties, orderId, orderAmount, submissionId, testMode } = params;
  
  try {
    console.log('📧 Sending WebEngage event using working method...');
    
    if (testMode) {
      console.log('🧪 Test mode - logging event details');
      console.log('📧 Would send PB_DAYS_MasterBox_Claimed event to:', email);
      console.log('🎁 Specialties:', specialties.join(', '));
      console.log('📦 Order ID:', orderId);
      console.log('💰 Order Amount: ₹' + (orderAmount || 0));
      console.log('👤 Customer:', getCustomerName(firstname, lastname));
      return true;
    }
    
    // ✅ WebEngage credentials - using your working values
    const WEBENGAGE_LICENSE_CODE = process.env.WEBENGAGE_LICENSE_CODE || '82618240';
    const WEBENGAGE_API_KEY = process.env.WEBENGAGE_API_KEY || '997ecae4-4632-4cb0-a65d-8427472e8f31';
    
    if (!WEBENGAGE_LICENSE_CODE || !WEBENGAGE_API_KEY) {
      console.error('❌ WebEngage credentials missing');
      return false;
    }
    
    console.log('📧 Sending to WebEngage for:', email);
    
    // ✅ Simple payload like your working version
    const simplePayload = {
      "userId": email,
      "eventName": "PB_DAYS_MasterBox_Claimed",
      "eventData": {
        "specialties_list": specialties.join(', '),
        "specialty_count": specialties.length,
        "order_id": orderId || 'N/A',
        "order_amount": parseInt(orderAmount) || 0,
        "customer_name": getCustomerName(firstname, lastname),
        "submission_id": submissionId,
        "campaign": testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',
        "company_name": "PinkBlue",
        "campaign_dates": "October 15 – 17, 2025",
        "support_contact": "support@pinkblue.com",
        "website_url": "https://pinkblue.com"
      }
    };
    
    console.log('📤 WebEngage payload:', JSON.stringify(simplePayload, null, 2));
    
    const webEngageEndpoint = `https://api.webengage.com/v1/accounts/${WEBENGAGE_LICENSE_CODE}/events`;
    
    // ✅ Method 1: Simple fetch like your working version
    const response1 = await fetch(webEngageEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBENGAGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(simplePayload)
    });
    
    console.log('📥 Method 1 response status:', response1.status);
    
    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ WebEngage event sent successfully');
      return true;
    }
    
    // ✅ Method 2: Add timestamp like your working version
    console.log('🔄 Method 2: Adding eventTime...');
    const payloadWithTime = {
      ...simplePayload,
      "eventTime": Math.floor(Date.now() / 1000)
    };
    
    const response2 = await fetch(webEngageEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBENGAGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadWithTime)
    });
    
    console.log('📥 Method 2 response status:', response2.status);
    
    if (response2.ok) {
      console.log('✅ WebEngage event with timestamp worked');
      return true;
    }
    
    // ✅ Method 3: Try with ISO timestamp
    console.log('🔄 Method 3: ISO timestamp...');
    const payloadWithISO = {
      ...simplePayload,
      "eventTime": new Date().toISOString()
    };
    
    const response3 = await fetch(webEngageEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WEBENGAGE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payloadWithISO)
    });
    
    if (response3.ok) {
      console.log('✅ WebEngage event with ISO timestamp worked');
      return true;
    }
    
    console.log('❌ All WebEngage methods failed');
    const errorText = await response1.text();
    console.error('WebEngage error:', errorText);
    return false;
    
  } catch (error) {
    console.error('❌ WebEngage event error:', error.message);
    return false;
  }
}

// ✅ Helper function from your working code
function getCustomerName(firstname, lastname) {
  const first = firstname || '';
  const last = lastname || '';
  return (first + ' ' + last).trim() || 'Valued Customer';
}
