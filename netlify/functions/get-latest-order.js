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

  console.log('Fetching latest order...');

  try {
    const { email } = JSON.parse(event.body || '{}');
    
    if (!email) {
      throw new Error('Email is required');
    }

    const magentoBaseUrl = process.env.MAGENTO_BASE_URL;
    const apiToken = process.env.MAGENTO_API_TOKEN;

    if (!magentoBaseUrl || !apiToken) {
      throw new Error('Magento configuration missing');
    }

    console.log('Searching for customer by email:', email);

    // First, get customer by email
    const customerSearchUrl = `${magentoBaseUrl}/rest/V1/customers/search`;
    const customerResponse = await axios.get(customerSearchUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        'searchCriteria[filter_groups][0][filters][0][field]': 'email',
        'searchCriteria[filter_groups][0][filters][0][value]': email,
        'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq',
        'searchCriteria[page_size]': 1
      },
      timeout: 15000
    });

    const customers = customerResponse.data.items;
    if (!customers || customers.length === 0) {
      throw new Error('Customer not found');
    }

    const customer = customers[0];
    console.log('Customer found:', customer.firstname, customer.lastname);

    // Get customer's latest order
    const ordersUrl = `${magentoBaseUrl}/rest/V1/orders`;
    const ordersResponse = await axios.get(ordersUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        'searchCriteria[filter_groups][0][filters][0][field]': 'customer_email',
        'searchCriteria[filter_groups][0][filters][0][value]': email,
        'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq',
        'searchCriteria[sort_orders][0][field]': 'created_at',
        'searchCriteria[sort_orders][0][direction]': 'DESC',
        'searchCriteria[page_size]': 1
      },
      timeout: 15000
    });

    const orders = ordersResponse.data.items;
    if (!orders || orders.length === 0) {
      throw new Error('No orders found for this customer');
    }

    const latestOrder = orders[0];
    console.log('Latest order found:', latestOrder.increment_id);

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
        },
        order: {
          id: latestOrder.entity_id,
          increment_id: latestOrder.increment_id,
          status: latestOrder.status,
          created_at: latestOrder.created_at,
          grand_total: latestOrder.grand_total,
          currency_code: latestOrder.order_currency_code
        }
      })
    };

  } catch (error) {
    console.error('Order fetch error:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.response?.data || 'Order fetch failed'
      })
    };
  }
};
