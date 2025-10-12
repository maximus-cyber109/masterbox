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

  try {
    const { email, customerId } = JSON.parse(event.body || '{}');
    
    if (!email && !customerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email or Customer ID required' })
      };
    }

    // Check submission via WebEngage user data
    const webengageUserId = customerId ? `magento_${customerId}` : email.replace(/[@.]/g, '_');
    const hasSubmitted = await checkWebEngageUserSubmission(webengageUserId, email);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasSubmitted: hasSubmitted.submitted,
        submissionData: hasSubmitted.data
      })
    };

  } catch (error) {
    console.error('Check submission error:', error);
    return {
      statusCode: 200, // Return 200 to continue with form
      headers,
      body: JSON.stringify({ 
        hasSubmitted: false, // Assume not submitted if we can't check
        error: 'Could not verify submission status'
      })
    };
  }
};

// Helper function to check WebEngage user submission
async function checkWebEngageUserSubmission(userId, email) {
  try {
    const licenseCode = process.env.WEBENGAGE_LICENSE_CODE;
    const apiKey = process.env.WEBENGAGE_API_KEY;

    // Try to get user data from WebEngage
    const apiUrl = `https://api.webengage.com/v1/accounts/${licenseCode}/users/${userId}`;

    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const userData = response.data;
    
    // Check if user has pb_days_participant attribute
    if (userData.attributes && userData.attributes.pb_days_participant === true) {
      return {
        submitted: true,
        data: {
          timestamp: userData.attributes.pb_days_submission_date || new Date().toISOString(),
          specialties: userData.attributes.pb_days_specialties || 'Previously submitted',
          count: userData.attributes.pb_days_specialty_count || 'N/A'
        }
      };
    }

    return { submitted: false };

  } catch (error) {
    if (error.response && error.response.status === 404) {
      // User not found = not submitted
      return { submitted: false };
    }
    
    console.error('WebEngage user check error:', error.response?.data || error.message);
    return { submitted: false }; // Assume not submitted on error
  }
}
