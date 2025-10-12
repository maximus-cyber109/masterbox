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
      testMode = false  // ✅ Fixed: Default to false if not provided
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
      campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',  // ✅ Fixed: Use testMode properly
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
        testMode  // ✅ Pass testMode to function
      });
      results.webengage_user = true;
      console.log('✅ WebEngage user successful');

      console.log('Tracking WebEngage event...');
      await trackWebEngageEvent({
        userId: webengageUserId,
        eventName: 'PB_DAYS_MasterBox_Claimed',
        eventData: {
          email: email,
          first_name: firstname || 'Customer',
          last_name: lastname || 'User',
          specialties_list: specialties.join(', '),
          specialty_count: String(specialties.length),
          submission_id: submissionId,
          campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',  // ✅ Fixed
          order_id: orderId || 'N/A',
          campaign_name: 'PB DAYS',
          campaign_dates: 'October 15 – 17, 2025',
          company_name: 'PinkBlue',
          current_year: String(new Date().getFullYear()),
          support_contact: 'support@pinkblue.com',
          website_url: 'https://pinkblue.com',
          test_mode: testMode ? 'true' : 'false',  // ✅ Fixed: Proper boolean to string
          order_amount: String(orderAmount || 0),
          order_entity_id: String(orderEntityId || 'N/A')
        }
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
      pb_days_campaign: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',  // ✅ Fixed
      pb_days_submission_date: new Date().toISOString(),
      source: 'PB_DAYS_MasterBox_Campaign',
      specialty_endodontist: specialties.includes('Endodontist'),
      specialty_prosthodontist: specialties.includes('Prosthodontist'),
      specialty_orthodontist: specialties.includes('Orthodontist'),
      specialty_oral_surgeon: specialties.includes('Oral And Maxillofacial Surgeon'),
      specialty_paedodontist: specialties.includes('Paedodontist'),
      specialty_periodontist: specialties.includes('Periodontist'),
      specialty_general_dentist: specialties.includes('General Dentist'),
      last_campaign_participation: testMode ? 'TEST_PB_DAYS_OCT_2025' : 'PB_DAYS_OCT_2025',  // ✅ Fixed
      last_interaction_date: new Date().toISOString(),
      test_mode: testMode || false  // ✅ Fixed: Proper boolean
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

async function trackWebEngageEvent({ userId, eventName, eventData }) {
  const licenseCode = process.env.WEBENGAGE_LICENSE_CODE;
  const apiKey = process.env.WEBENGAGE_API_KEY;

  if (!licenseCode || !apiKey) {
    throw new Error('WebEngage credentials not configured');
  }

  const apiUrl = `https://api.webengage.com/v1/accounts/${licenseCode}/events`;
  
  console.log('WebEngage Event URL:', apiUrl);
  console.log('Event data being sent:', eventData);  // ✅ Added debug logging

  const eventPayload = {
    userId,
    eventName,
    eventTime: new Date().toISOString(),
    eventData
  };

  const response = await axios.post(apiUrl, eventPayload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 15000
  });

  console.log('WebEngage event response:', response.status);
  return response.data;
}
