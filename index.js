/**
 * Welcome to Cloudflare Workers! This is your first worker.
 */

export default {
  async fetch(request, env, ctx) {
    return new Response('Hello from Cloudflare Workers!', {
      status: 200,
      headers: {
        'content-type': 'text/plain',
      }
    });
  },
};
