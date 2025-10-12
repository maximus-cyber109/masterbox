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

  console.log('Getting customer info...');

  try {
    const { authorization } = event.headers;
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.log('No bearer token found');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'No bearer token provided',
          fallback: true 
        })
      };
    }

    const token = authorization.split(' ')[1];
    const magentoBaseUrl = process.env.MAGENTO_BASE_URL;

    if (!magentoBaseUrl) {
      throw new Error('MAGENTO_BASE_URL not configured');
    }

    console.log('Calling Magento API...');

    const customerResponse = await axios.get(
      `${magentoBaseUrl}/rest/V1/customers/me`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const customer = customerResponse.data;
    console.log('Customer found:', customer.email);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        customer: {
          id: customer.id,
          email: customer.email,
          firstname: customer.firstname,
          lastname: customer.lastname
        }
      })
    };

  } catch (error) {
    console.error('Magento API Error:', error.message);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get customer info',
        fallback: true,
        details: error.response?.data || error.message
      })
    };
  }
};
