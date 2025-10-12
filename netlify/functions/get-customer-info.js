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

  console.log('Checking previous submission...');

  try {
    const { email, customerId } = JSON.parse(event.body || '{}');
    
    if (!email && !customerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email or Customer ID required' })
      };
    }

    const licenseCode = process.env.WEBENGAGE_LICENSE_CODE;
    const apiKey = process.env.WEBENGAGE_API_KEY;

    if (!licenseCode || !apiKey) {
      console.log('WebEngage credentials not configured, skipping duplicate check');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ hasSubmitted: false })
      };
    }

    const webengageUserId = customerId ? `magento_${customerId}` : email.replace(/[@.]/g, '_');
    const apiUrl = `https://api.webengage.com/v1/accounts/${licenseCode}/users/${webengageUserId}`;

    console.log('Checking WebEngage user:', webengageUserId);

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const userData = response.data;
    
    if (userData.attributes && userData.attributes.pb_days_participant === true) {
      console.log('Previous submission found');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasSubmitted: true,
          submissionData: {
            timestamp: userData.attributes.pb_days_submission_date || new Date().toISOString(),
            specialties: userData.attributes.pb_days_specialties || 'Previously submitted',
            count: userData.attributes.pb_days_specialty_count || 'N/A'
          }
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ hasSubmitted: false })
    };

  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('User not found in WebEngage, no previous submission');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ hasSubmitted: false })
      };
    }
    
    console.error('Check submission error:', error.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        hasSubmitted: false,
        error: 'Could not verify submission status'
      })
    };
  }
};
