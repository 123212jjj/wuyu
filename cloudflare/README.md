# 豆包文字生成 · 接入说明

这个目录是一个**可选的云端代理**：把火山方舟的 Key 放在 Cloudflare，页面上不用暴露 Key，也不受你本机网络/代理影响。

## 什么时候需要它

| 你的情况 | 用哪种 |
|---|---|
| 只在自己电脑上用 | **本地模式**（`启动-豆包模式.bat`），最简单的路 |
| 想线上（GitHub Pages）也能生成，且浏览器直连方舟正常 | 不用代理，页面里直接填 Key |
| 线上生成报「网络或跨域失败」 | 部署这个 Worker，把地址填到页面「代理地址」 |

## 部署（不用装任何工具，浏览器里完成）

1. 打开 <https://dash.cloudflare.com/> → 左侧 **Workers & Pages** → **Create**
2. 选 **Worker** → 起名（例如 `judou-ark-proxy`）→ **Deploy**
3. 点 **Edit code**，把本目录 `worker.js` 的内容全部粘进去 → **Deploy**
4. 回到 Worker 页面 → **Settings → Variables and Secrets** → 添加：
   - `ARK_API_KEY`（类型选 **Secret**，值是你的火山方舟 Key）
   - 可选 `ARK_MODEL`（比如 `ep-xxxxxxxx` 或完整模型 ID）
5. 部署后的地址形如 `https://judou-ark-proxy.你的子域.workers.dev`
6. 打开你的创作台 → 「接口」→ 在**代理地址**里填这个 URL → 保存并测试

> 用 wrangler CLI 也可以：`npx wrangler deploy`，然后 `npx wrangler secret put ARK_API_KEY`。

## 安全说明

- Key 只存在 Cloudflare 的 Secret 里，不出现在网页源码和 GitHub 仓库
- Worker 允许任意来源调用（CORS 回显）；如果想限制，只让 `https://123212jjj.github.io` 使用，
  把 `corsHeaders` 里的 `origin` 改成白名单判断即可
- 这个 Worker 会消耗你方舟账户的额度，公开前建议加白名单或访问口令
