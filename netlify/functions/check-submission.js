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

  console.log('=== CHECK SUBMISSION START ===');

  try {
    const { orderId, orderIncrementId, email } = JSON.parse(event.body || '{}');
    
    if (!orderId && !orderIncrementId && !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Order ID, Order Increment ID, or Email is required' 
        })
      };
    }

    const licenseCode = process.env.WEBENGAGE_LICENSE_CODE;
    const apiKey = process.env.WEBENGAGE_API_KEY;

    if (!licenseCode || !apiKey) {
      console.log('WebEngage credentials not configured, skipping duplicate check');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          hasSubmitted: false,
          message: 'Duplicate check skipped - WebEngage not configured'
        })
      };
    }

    console.log('Checking for previous submission...');
    console.log('Order ID:', orderId);
    console.log('Order Increment ID:', orderIncrementId);
    console.log('Email:', email);

    // Try to find user by order ID in WebEngage user attributes
    try {
      const searchQuery = orderIncrementId || orderId || email;
      console.log('Searching WebEngage for:', searchQuery);

      // Search approach 1: Try to find users with this order in their attributes
      // This is a simplified check - in production you might need a more sophisticated approach
      
      // For now, we'll do a simple user search by email if provided
      if (email) {
        const webengageUserId = email.replace(/[@.]/g, '_');
        const apiUrl = `https://api.webengage.com/v1/accounts/${licenseCode}/users/${webengageUserId}`;

        console.log('Checking WebEngage user:', webengageUserId);

        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500; // Don't throw on 4xx errors
          }
        });

        if (response.status === 404) {
          console.log('User not found in WebEngage');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              hasSubmitted: false 
            })
          };
        }

        if (response.status >= 400) {
          throw new Error(`WebEngage API returned ${response.status}`);
        }

        const userData = response.data;
        console.log('WebEngage user found:', userData.userId);

        // Check if user has pb_days_participant attribute and matching order
        if (userData.attributes && userData.attributes.pb_days_participant === true) {
          const userOrderId = userData.attributes.pb_days_order_id;
          
          // Check if this specific order has already been used
          if (userOrderId === orderIncrementId || userOrderId === orderId) {
            console.log('Previous submission found for this order');
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                hasSubmitted: true,
                submissionData: {
                  timestamp: userData.attributes.pb_days_submission_date || new Date().toISOString(),
                  specialties: userData.attributes.pb_days_specialties || 'Previously submitted',
                  count: userData.attributes.pb_days_specialty_count || 'N/A',
                  order_id: userOrderId
                }
              })
            };
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            hasSubmitted: false 
          })
        };

      } else {
        // No email provided, can't check properly
        console.log('No email provided for duplicate check');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true,
            hasSubmitted: false,
            message: 'Cannot verify without email'
          })
        };
      }

    } catch (webengageError) {
      console.error('WebEngage check failed:', webengageError.message);
      
      // If WebEngage fails, allow submission (don't block user)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          hasSubmitted: false,
          message: 'Duplicate check failed - allowing submission'
        })
      };
    }

  } catch (error) {
    console.error('=== CHECK SUBMISSION ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    // On any error, allow submission (don't block user)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        hasSubmitted: false,
        error: 'Could not verify submission status - allowing submission'
      })
    };
  }
};
