import axios from 'axios';

const SP_API_ENDPOINT_SUFFIX_BY_SIGNING_REGION = {
  'us-east-1': 'na',
  'eu-west-1': 'eu',
  'us-west-2': 'fe'
};

function getSpApiHost(signingRegion) {
  const endpointSuffix = process.env.SP_API_ENDPOINT_REGION || SP_API_ENDPOINT_SUFFIX_BY_SIGNING_REGION[signingRegion];

  if (!endpointSuffix) {
    throw new Error(
      `Unsupported SP_API_REGION \"${signingRegion}\". Set SP_API_ENDPOINT_REGION to one of: na, eu, fe.`
    );
  }

  return `sellingpartnerapi-${endpointSuffix}.amazon.com`;
}

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAmzDate() {
  return new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
}

    // Cache for access tokens
    let accessTokenCache = {
      token: null,
      expiresAt: 0
    };

    /**
     * Get an access token for SP-API
     */
    export async function getAccessToken() {
      // Check if we have a valid cached token
      const now = Date.now();
      if (accessTokenCache.token && accessTokenCache.expiresAt > now) {
        return accessTokenCache.token;
      }

      try {
        const body = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: getRequiredEnv('SP_API_REFRESH_TOKEN'),
          client_id: getRequiredEnv('SP_API_CLIENT_ID'),
          client_secret: getRequiredEnv('SP_API_CLIENT_SECRET')
        });

        const response = await axios.post('https://api.amazon.com/auth/o2/token', body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          }
        });

        // Cache the token
        accessTokenCache = {
          token: response.data.access_token,
          expiresAt: now + (response.data.expires_in * 1000) - 60000 // Subtract 1 minute for safety
        };

        return accessTokenCache.token;
      } catch (error) {
        console.error('Error getting access token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with Amazon SP-API');
      }
    }

    /**
     * Make a request to the SP-API
     */
    export async function makeSpApiRequest(method, path, data = null, queryParams = {}) {
      try {
        const accessToken = await getAccessToken();
        const region = process.env.SP_API_REGION || 'us-east-1';
        const url = `https://${getSpApiHost(region)}${path}`;

        const headers = {
          'x-amz-access-token': accessToken,
          'x-amz-date': getAmzDate(),
          'user-agent': 'amazon-sp-api-mcp-server/1.0.0 (Language=JavaScript)'
        };

        // Only set Content-Type for requests that carry a body
        if (data !== null) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await axios({
          method,
          url,
          params: queryParams,
          paramsSerializer: (params) => {
            const parts = [];
            for (const [key, value] of Object.entries(params)) {
              if (value === undefined || value === null) continue;
              if (Array.isArray(value)) {
                for (const item of value) {
                  parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
                }
              } else {
                // Preserve commas so CSV params like includedData=summaries,attributes,issues
                // are not percent-encoded — SP-API expects bare commas for those values.
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value)).replace(/%2C/gi, ',')}`);
              }
            }
            return parts.join('&');
          },
          data: data,
          headers
        });
        
        return response.data;
      } catch (error) {
        console.error('SP-API request failed:', error.response?.data || error.message);
        throw new Error(`SP-API request failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
      }
    }
