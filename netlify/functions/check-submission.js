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

  console.log('Checking submission by order ID...');

  try {
    const { orderId, orderIncrementId } = JSON.parse(event.body || '{}');
    
    if (!orderId && !orderIncrementId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Order ID is required' })
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

    // Check WebEngage for existing submission with this order ID
    const searchQuery = orderIncrementId || orderId;
    const apiUrl = `https://api.webengage.com/v1/accounts/${licenseCode}/users`;

    console.log('Checking for order:', searchQuery);

    // Search for users with this order ID in their attributes
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      params: {
        'pb_days_order_id': searchQuery
      },
      timeout: 10000
    });

    // If we find any users with this order ID, it's already claimed
    if (response.data && response.data.length > 0) {
      const existingUser = response.data[0];
      console.log('Order already claimed by:', existingUser.userId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          hasSubmitted: true,
          submissionData: {
            timestamp: existingUser.attributes?.pb_days_submission_date || new Date().toISOString(),
            specialties: existingUser.attributes?.pb_days_specialties || 'Previously submitted',
            count: existingUser.attributes?.pb_days_specialty_count || 'N/A',
            order_id: searchQuery
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
