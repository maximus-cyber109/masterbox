const axios = require('axios');

exports.handler = async (event, context) => {

    console.log('📧 Get Customer Info Only - No Order Fetch');

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
        console.log('Validating customer email:', normalizedEmail);

        // ✅ Test Override - Force Fetch Mode
        if (normalizedEmail.includes('-forcefetch')) {
            const cleanEmail = normalizedEmail.replace('-forcefetch', '');
            console.log('🧪 TEST MODE: Email validated');

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    customer: {
                        id: `TEST_${Date.now()}`,
                        email: cleanEmail,
                        firstname: 'Test',
                        lastname: 'User'
                    }
                })
            };
        }

        // ✅ Real Magento API call - Customer only
        const API_TOKEN = process.env.MAGENTO_API_TOKEN;
        const BASE_URL = process.env.MAGENTO_BASE_URL;

        if (!API_TOKEN || !BASE_URL) {
            console.error('Missing Magento configuration');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Server configuration error'
                })
            };
        }

        console.log('Magento Base URL:', BASE_URL);

        // Search for customer by email
        const searchUrl = `${BASE_URL}/customers/search?` +
            `searchCriteria[filterGroups][0][filters][0][field]=email&` +
            `searchCriteria[filterGroups][0][filters][0][value]=${encodeURIComponent(normalizedEmail)}&` +
            `searchCriteria[filterGroups][0][filters][0][conditionType]=eq&` +
            `searchCriteria[pageSize]=1`;

        console.log('Searching for customer...');
        const response = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
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
                    error: 'Customer not found'
                })
            };
        }

        const customerData = await response.json();
        console.log('Customers found:', customerData.total_count || 0);

        if (customerData.items && customerData.items.length > 0) {
            const customer = customerData.items[0];
            console.log('Customer found:', {
                email: customer.email,
                firstname: customer.firstname
            });

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
        } else {
            console.log('No customer found for email:', normalizedEmail);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Customer not found'
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
