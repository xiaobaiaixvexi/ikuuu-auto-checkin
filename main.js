// checkin.js - 推荐保存到 https://raw.githubusercontent.com/你的用户名/仓库/main/checkin.js
// 或者直接用我维护的这个：https://ghproxy.com/https://raw.githubusercontent.com/TW-Codes/ikuuu-auto-checkin/main/checkin.js

const accounts = JSON.parse(process.env.IKUUU_ACCOUNTS || "[]");

if (accounts.length === 0) {
  console.log("未配置 IKUUU_ACCOUNTS");
  process.exit(0);
}

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
  "Referer": "https://ikuuu.de/",
  "Origin": "https://ikuuu.de",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest",
};

for (const account of accounts) {
  const host = account.host || "ikuuu.de"; // 支持自定义域名
  const base = `https://${host}`;

  try {
    // 1. 尝试直接使用长期 Cookie（expire_in）签到
    const expire_in = account.expire_in || "";
    let cookie = expire_in ? `expire_in=${expire_in}` : "";

    let res = await fetch(`${base}/user/checkin`, {
      method: "POST",
      headers: { ...headers, cookie },
    });

    // 2. 如果返回未登录（ret:0），再走登录流程
    if (!res.ok || (await res.json()).ret !== 1) {
      console.log(`${account.name} Cookie 失效，重新登录...`);

      const loginForm = new FormData();
      loginForm.append("email", account.email);
      loginForm.append("passwd", account.passwd);
      loginForm.append("code", "");
      loginForm.append("remember_me", "on"); // 重要！开启记住登录

      const loginRes = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers,
        body: loginForm,
        redirect: "manual",
      });

      const cookies = loginRes.headers.raw()["set-cookie"] || [];
      const expireMatch = cookies
        .map((c) => c.match(/expire_in=([^;]+)/))
        .find((m) => m);
      if (!expireMatch) throw new Error("登录失败，未获取到 expire_in");

      cookie = `expire_in=${expireMatch[1]}`;
      console.log(`${account.name} 登录成功，更新 Cookie`);

      // 重新签到
      res = await fetch(`${base}/user/checkin`, {
        method: "POST",
        headers: { ...headers, cookie },
      });
    }

    const data = await res.json();
    console.log(`✅ \( {account.name}: \){data.msg}`);

    // 可选：把新的 expire_in 打印出来，方便你手动更新 Secrets（提高下次命中率）
    if (cookie.includes("expire_in=")) {
      const newExpire = cookie.match(/expire_in=([^;]+)/)[1];
      console.log(`   └─ 新 expire_in=${newExpire}`);
    }
  } catch (err) {
    console.error(`❌ \( {account.name}: \){err.message}`);
  }
  console.log(""); // 空行分隔
}