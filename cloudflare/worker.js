// 豆包（火山方舟）代理，部署到 Cloudflare Workers。
// 环境变量：ARK_API_KEY（必填，Worker 里存 Key，页面就不用暴露）
//          ARK_MODEL（可选，固定模型或 ep-xxxx 接入点）
const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

const corsHeaders = (request) => {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'content-type,authorization,x-ark-key,x-ark-model',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
};

const send = (body, cors, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    if (url.pathname === '/api/health') {
      return send(
        { proxy: true, mock: false, envKey: Boolean(env.ARK_API_KEY), model: env.ARK_MODEL || null },
        cors,
      );
    }

    if (url.pathname !== '/api/chat' || request.method !== 'POST') {
      return send({ error: { message: 'not found' } }, cors, 404);
    }

    const key = env.ARK_API_KEY || request.headers.get('x-ark-key') || '';
    if (!key) return send({ error: { message: 'Worker 没有配置 ARK_API_KEY' } }, cors, 503);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return send({ error: { message: '请求体不是合法 JSON' } }, cors, 400);
    }

    const model = env.ARK_MODEL || request.headers.get('x-ark-model') || payload.model;
    if (!model) return send({ error: { message: '缺少 model' } }, cors, 400);

    try {
      const upstream = await fetch(`${ARK_BASE}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: payload.messages,
          temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.85,
          max_tokens: 2400,
        }),
      });
      return new Response(await upstream.text(), {
        status: upstream.status,
        headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
      });
    } catch (error) {
      return send({ error: { message: `连接火山方舟失败：${error.message}` } }, cors, 502);
    }
  },
};
