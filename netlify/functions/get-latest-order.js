// FORCE UAT ONLY FOR TESTING
const MAGENTO_BASE_URL = process.env.MAGENTO_UAT_BASE_URL || 'https://uat.pinkblue.in/rest/V1';
const MAGENTO_API_TOKEN = process.env.MAGENTO_UAT_API_TOKEN;

exports.handler = async (event, context) => {
    console.log('📦 Get Latest Order - UAT TESTING MODE ONLY');
    console.log('🌍 Environment: UAT (FORCED)');
    console.log('Magento Base URL:', MAGENTO_BASE_URL);
    
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

        // ✅ Check configuration
        if (!MAGENTO_API_TOKEN || !MAGENTO_BASE_URL) {
            console.error('❌ Missing UAT Magento configuration');
            console.error('Base URL:', MAGENTO_BASE_URL);
            console.error('API Token exists:', !!MAGENTO_API_TOKEN);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'UAT server configuration error - missing credentials'
                })
            };
        }

        // ✅ Look for recent orders (last 30 days)
        const maxDaysAgo = new Date();
        maxDaysAgo.setDate(maxDaysAgo.getDate() - 30);
        maxDaysAgo.setHours(0, 0, 0, 0);

        const searchUrl = `${MAGENTO_BASE_URL}/orders?` +
            `searchCriteria[filterGroups][0][filters][0][field]=customer_email&` +
            `searchCriteria[filterGroups][0][filters][0][value]=${encodeURIComponent(normalizedEmail)}&` +
            `searchCriteria[filterGroups][0][filters][0][conditionType]=eq&` +
            `searchCriteria[filterGroups][1][filters][0][field]=created_at&` +
            `searchCriteria[filterGroups][1][filters][0][value]=${maxDaysAgo.toISOString()}&` +
            `searchCriteria[filterGroups][1][filters][0][conditionType]=from&` +
            `searchCriteria[sortOrders][0][field]=created_at&` +
            `searchCriteria[sortOrders][0][direction]=DESC&` +
            `searchCriteria[pageSize]=1`;

        console.log('Making UAT request to:', searchUrl);

        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${MAGENTO_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        console.log('UAT Magento API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('UAT Magento API error:', response.status, errorText);
            
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: response.status === 404 ?
                        'No customer found with this email address on UAT' :
                        `UAT Magento API error: ${response.status}`,
                    environment: 'UAT'
                })
            };
        }

        const orderData = await response.json();
        console.log('UAT Orders found:', orderData.total_count || 0);

        if (orderData.items && orderData.items.length > 0) {
            const recentOrder = orderData.items[0];
            console.log('✅ Latest UAT order:', {
                increment_id: recentOrder.increment_id,
                grand_total: recentOrder.grand_total,
                status: recentOrder.status
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    environment: 'UAT',
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
            console.log('❌ No orders found on UAT for email:', normalizedEmail);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'No recent orders found for this email address on UAT',
                    environment: 'UAT'
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
