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

  console.log('=== GET LATEST ORDER START ===');

  try {
    const { email } = JSON.parse(event.body || '{}');
    
    if (!email) {
      throw new Error('Email is required');
    }

    const magentoBaseUrl = process.env.MAGENTO_BASE_URL;
    const apiToken = process.env.MAGENTO_API_TOKEN;

    if (!magentoBaseUrl || !apiToken) {
      console.error('Missing Magento configuration');
      throw new Error('Magento API configuration missing');
    }

    console.log('Magento Base URL:', magentoBaseUrl);
    console.log('Searching for customer by email:', email);

    // Step 1: Search for customer by email using admin token
    const customerSearchUrl = `${magentoBaseUrl}/rest/V1/customers/search`;
    
    console.log('Customer search URL:', customerSearchUrl);

    const customerResponse = await axios.get(customerSearchUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        'searchCriteria[filterGroups][0][filters][0][field]': 'email',
        'searchCriteria[filterGroups][0][filters][0][value]': email,
        'searchCriteria[filterGroups][0][filters][0][conditionType]': 'eq',
        'searchCriteria[pageSize]': 1
      },
      timeout: 15000,
      validateStatus: function (status) {
        return status < 500; // Don't throw on 4xx errors
      }
    });

    console.log('Customer search response status:', customerResponse.status);

    if (customerResponse.status === 404) {
      // Customer not found
      throw new Error('Customer not found with this email address');
    }

    if (customerResponse.status >= 400) {
      console.error('Customer search failed:', customerResponse.status, customerResponse.data);
      throw new Error(`Customer search failed: ${customerResponse.status}`);
    }

    const customers = customerResponse.data?.items || [];
    
    if (!customers || customers.length === 0) {
      console.log('No customers found for email:', email);
      throw new Error('Customer not found with this email address');
    }

    const customer = customers[0];
    console.log('Customer found:', {
      id: customer.id,
      email: customer.email,
      firstname: customer.firstname,
      lastname: customer.lastname
    });

    // Step 2: Get customer's orders using admin token
    const ordersUrl = `${magentoBaseUrl}/rest/V1/orders`;
    
    console.log('Fetching orders for customer ID:', customer.id);

    const ordersResponse = await axios.get(ordersUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        'searchCriteria[filterGroups][0][filters][0][field]': 'customer_id',
        'searchCriteria[filterGroups][0][filters][0][value]': customer.id,
        'searchCriteria[filterGroups][0][filters][0][conditionType]': 'eq',
        'searchCriteria[sortOrders][0][field]': 'created_at',
        'searchCriteria[sortOrders][0][direction]': 'DESC',
        'searchCriteria[pageSize]': 1
      },
      timeout: 15000,
      validateStatus: function (status) {
        return status < 500;
      }
    });

    console.log('Orders response status:', ordersResponse.status);

    if (ordersResponse.status >= 400) {
      console.error('Orders fetch failed:', ordersResponse.status, ordersResponse.data);
      throw new Error(`Orders fetch failed: ${ordersResponse.status}`);
    }

    const orders = ordersResponse.data?.items || [];
    
    if (!orders || orders.length === 0) {
      console.log('No orders found for customer');
      throw new Error('No orders found for this customer');
    }

    const latestOrder = orders[0];
    console.log('Latest order found:', {
      entity_id: latestOrder.entity_id,
      increment_id: latestOrder.increment_id,
      status: latestOrder.status,
      grand_total: latestOrder.grand_total
    });

    // Step 3: Return success response
    const response = {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstname: customer.firstname || 'Customer',
        lastname: customer.lastname || 'User'
      },
      order: {
        id: latestOrder.entity_id,
        increment_id: latestOrder.increment_id,
        status: latestOrder.status,
        created_at: latestOrder.created_at,
        grand_total: latestOrder.grand_total,
        currency_code: latestOrder.order_currency_code || 'INR'
      }
    };

    console.log('=== SUCCESS ===');
    console.log('Returning response:', JSON.stringify(response, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('=== ORDER FETCH ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error details:', error.response?.data || 'No additional details');
    console.error('Error stack:', error.stack);

    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes('Customer not found')) {
      statusCode = 404;
      errorMessage = 'No customer found with this email address';
    } else if (error.message.includes('No orders found')) {
      statusCode = 404;
      errorMessage = 'No recent orders found for this customer';
    } else if (error.message.includes('configuration missing')) {
      statusCode = 500;
      errorMessage = 'Server configuration error';
    }
    
    return {
      statusCode: statusCode,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: {
          timestamp: new Date().toISOString(),
          function: 'get-latest-order'
        }
      })
    };
  }
};
