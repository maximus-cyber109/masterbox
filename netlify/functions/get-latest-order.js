// Auto-detect environment based on referer
function getEnvironmentConfig(event) {
    const referer = event.headers.referer || event.headers.Referer || '';
    
    // Check if request is coming from UAT
    const isUAT = referer.includes('uat.pinkblue.in');
    
    return {
        baseUrl: isUAT ? process.env.MAGENTO_UAT_BASE_URL : process.env.MAGENTO_BASE_URL,
        apiToken: isUAT ? process.env.MAGENTO_UAT_API_TOKEN : process.env.MAGENTO_API_TOKEN,
        environment: isUAT ? 'UAT' : 'PRODUCTION'
    };
}

exports.handler = async (event, context) => {
    console.log('📦 Get Latest Order - Enhanced with UAT/Production auto-detection');
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed. Use POST.'
            })
        };
    }

    try {
        const { email } = JSON.parse(event.body || '{}');
        
        if (!email) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Email is required'
                })
            };
        }

        const normalizedEmail = email.toLowerCase().trim();
        
        // Get environment configuration
        const config = getEnvironmentConfig(event);
        console.log(`🌍 Environment: ${config.environment}`);
        console.log('Searching for customer email:', normalizedEmail);

        // ✅ Test Override - Force Fetch Mode
        if (normalizedEmail.includes('-forcefetch')) {
            const cleanEmail = normalizedEmail.replace('-forcefetch', '');
            console.log('🧪 TEST MODE: Force fetch override detected');
            
            const mockData = {
                entity_id: `TEST_${Date.now()}`,
                increment_id: `TEST-${Math.floor(Math.random() * 10000)}`,
                grand_total: '2500.00',
                status: 'complete',
                created_at: new Date().toISOString(),
                customer_email: cleanEmail,
                customer_firstname: 'Test',
                customer_lastname: 'User',
                order_currency_code: 'INR'
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    environment: 'TEST',
                    customer: {
                        id: `TEST_${Date.now()}`,
                        email: cleanEmail,
                        firstname: 'Test',
                        lastname: 'User'
                    },
                    order: {
                        id: mockData.entity_id,
                        increment_id: mockData.increment_id,
                        status: mockData.status,
                        created_at: mockData.created_at,
                        grand_total: mockData.grand_total,
                        currency_code: mockData.order_currency_code
                    },
                    testMode: true
                })
            };
        }

        // ✅ Special Test Overrides
        if (normalizedEmail.includes('test_override_maaz') || normalizedEmail.includes('test_override_valli')) {
            console.log('✅ Admin override detected');
            const cleanEmail = normalizedEmail.replace(/[_-]?test_override_(maaz|valli)/g, '@gmail.com');
            
            const mockData = {
                entity_id: '789123',
                increment_id: 'ADMIN_' + Date.now(),
                grand_total: '15000.00',
                status: 'complete',
                created_at: new Date().toISOString(),
                customer_email: cleanEmail,
                customer_firstname: 'Admin',
                customer_lastname: 'User',
                order_currency_code: 'INR'
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    environment: 'TEST',
                    customer: {
                        id: mockData.entity_id,
                        email: cleanEmail,
                        firstname: mockData.customer_firstname,
                        lastname: mockData.customer_lastname
                    },
                    order: {
                        id: mockData.entity_id,
                        increment_id: mockData.increment_id,
                        status: mockData.status,
                        created_at: mockData.created_at,
                        grand_total: mockData.grand_total,
                        currency_code: mockData.order_currency_code
                    },
                    testMode: true
                })
            };
        }

        // ✅ Real Magento API call
        if (!config.apiToken || !config.baseUrl) {
            console.error('Missing Magento configuration for environment:', config.environment);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server configuration error'
                })
            };
        }

        console.log('Magento Base URL:', config.baseUrl);

        // ✅ Look for recent orders (last 30 days to be safe)
        const maxDaysAgo = new Date();
        maxDaysAgo.setDate(maxDaysAgo.getDate() - 30);
        maxDaysAgo.setHours(0, 0, 0, 0);

        const searchUrl = `${config.baseUrl}/orders?` +
            `searchCriteria[filterGroups][0][filters][0][field]=customer_email&` +
            `searchCriteria[filterGroups][0][filters][0][value]=${encodeURIComponent(normalizedEmail)}&` +
            `searchCriteria[filterGroups][0][filters][0][conditionType]=eq&` +
            `searchCriteria[filterGroups][1][filters][0][field]=created_at&` +
            `searchCriteria[filterGroups][1][filters][0][value]=${maxDaysAgo.toISOString()}&` +
            `searchCriteria[filterGroups][1][filters][0][conditionType]=from&` +
            `searchCriteria[sortOrders][0][field]=created_at&` +
            `searchCriteria[sortOrders][0][direction]=DESC&` +
            `searchCriteria[pageSize]=1`;

        console.log('Making request to:', searchUrl);

        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${config.apiToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('Magento API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Magento API error:', response.status, errorText);
            
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: response.status === 404 ?
                        'No customer found with this email address' :
                        `Magento API error: ${response.status}`
                })
            };
        }

        const orderData = await response.json();
        console.log('Orders found:', orderData.total_count || 0);

        if (orderData.items && orderData.items.length > 0) {
            const recentOrder = orderData.items[0];
            console.log('Latest order:', {
                increment_id: recentOrder.increment_id,
                grand_total: recentOrder.grand_total,
                status: recentOrder.status
            });

            // ✅ Return in the format expected by the frontend
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    environment: config.environment,
                    customer: {
                        id: recentOrder.customer_id || Date.now(),
                        email: recentOrder.customer_email || normalizedEmail,
                        firstname: recentOrder.customer_firstname || 'Customer',
                        lastname: recentOrder.customer_lastname || 'User'
                    },
                    order: {
                        id: recentOrder.entity_id,
                        increment_id: recentOrder.increment_id,
                        status: recentOrder.status,
                        created_at: recentOrder.created_at,
                        grand_total: recentOrder.grand_total,
                        currency_code: recentOrder.order_currency_code || 'INR'
                    }
                })
            };
        } else {
            console.log('No orders found for email:', normalizedEmail);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'No recent orders found for this email address'
                })
            };
        }

    } catch (error) {
        console.error('💥 Function error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: `Internal error: ${error.message}`
            })
        };
    }
};
