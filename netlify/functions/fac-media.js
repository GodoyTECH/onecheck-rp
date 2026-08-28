/**
 * Serves media from Netlify Blobs
 */
const { getStore } = require('@netlify/blobs');
const { preflight } = require('./utils/auth');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') return preflight();

    // path is /fac-media/avatar_xxx.jpg
    const match = event.path.match(/\/fac-media\/([^\/]+)$/);
    if (!match) return { statusCode: 404, body: 'Not found' };
    
    const mediaId = match[1];
    
    try {
        const store = getStore('media');
        const media = await store.get(mediaId, { type: 'arrayBuffer' });
        
        if (!media) return { statusCode: 404, body: 'Not found' };

        // Ensure we send back binary as base64 for Netlify functions 
        // (isBase64Encoded must be true for binary response)
        const base64Body = Buffer.from(media).toString('base64');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable'
            },
            isBase64Encoded: true,
            body: base64Body
        };
    } catch (e) {
        console.error('Media error:', e);
        return { statusCode: 500, body: 'Server error' };
    }
};
