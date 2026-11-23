/* bx.szjacky.com 在线接待挂件
 * 访客 → chat.szjacky.com 桥接服务 → 飞书窗口（庄生 + 小乐）→ 回传访客
 * 送达双保险：SSE 实时推送 + 历史轮询兜底（按消息 ID 去重，绝不重复显示）
 * 纯静态、零依赖，不拖累 SEO 首屏。
 */
(function () {
  "use strict";

  var API = "https://chat.szjacky.com";
  var SID_KEY = "***";
  var POLL_MS = 4000;
  var CHIPS = ["120平多少钱", "可以看房吗", "怎么过户", "地铁几号线"];

  function sid() {
    try {
      var s = localStorage.getItem(SID_KEY);
      if (!s) {
        s = "v" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem(SID_KEY, s);
      }
      return s;
    } catch (e) {
      return "v" + Math.random().toString(36).slice(2, 12);
    }
  }

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var list, input, sendBtn, badge, panel, fab,
      es = null, token = null, cfgReady = null,
      seen = {}, pollTimer = null, greeted = false;

  /* ---------------- 样式 ---------------- */
  function css() {
    var s = "#bxChatFab{position:fixed;right:16px;bottom:20px;z-index:99990;display:flex;align-items:center;gap:7px;border:0;border-radius:30px;padding:11px 17px;background:#d84315;color:#fff;font-size:15px;font-weight:600;box-shadow:0 2px 4px rgba(26,35,126,.08),0 12px 28px rgba(26,35,126,.18);cursor:pointer;font-family:inherit;transition:transform .18s cubic-bezier(.2,.6,.25,1),box-shadow .18s cubic-bezier(.2,.6,.25,1)}" + "#bxChatFab:hover{box-shadow:0 2px 4px rgba(26,35,126,.1),0 16px 34px rgba(26,35,126,.24)}" + "#bxChatFab:active{transform:translateY(1px)}"
      + "#bxChatFab .bxIco{font-size:19px;line-height:1}"
      + "#bxChatBadge{display:none;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#fff;color:#d84315;font-size:12px;font-weight:700;line-height:18px;text-align:center}"
      + "#bxChatFab.bxHas #bxChatBadge{display:block}"
      + "#bxChatPanel{position:fixed;right:16px;bottom:88px;z-index:99991;width:352px;max-width:calc(100vw - 32px);height:474px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 2px 4px rgba(26,35,126,.09),0 16px 40px rgba(26,35,126,.2);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif}"
      + "#bxChatPanel.bxOpen{display:flex}"
      + "#bxChatHead{background:linear-gradient(135deg,#1a237e,#283593);color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;flex:0 0 auto}"
      + "#bxChatHead b{font-size:15px;font-weight:600}"
      + "#bxChatHead span{display:block;font-size:12px;opacity:.85;margin-top:1px}"
      + "#bxChatClose{background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0 2px}"
      + "#bxChatList{flex:1 1 auto;overflow-y:auto;padding:12px;background:#f4f5f7;line-height:1.7;font-size:14px}"
      + ".bxMsg{margin:0 0 9px;max-width:86%}"
      + ".bxMsg.bxMe{margin-left:auto}"
      + ".bxBubble{background:#fff;border-radius:10px;padding:9px 12px;word-break:break-word;white-space:pre-wrap;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.06)}"
      + ".bxMe .bxBubble{background:#1a237e;color:#fff}"
      + ".bxMsg.bxStaff .bxBubble{background:#fff8e1;border-left:3px solid #ffc107}"
      + ".bxWho{font-size:11px;color:#888;margin:0 2px 3px}"
      + ".bxMe .bxWho{text-align:right}"
      + ".bxTyping .bxBubble{color:#888;font-style:italic}"
      + ".bxChips{flex:0 0 auto;display:flex;gap:6px;padding:8px 9px 0;flex-wrap:wrap;background:#fff}"
      + ".bxChip{border:1px solid #c5cae9;color:#1a237e;background:#fff;border-radius:14px;padding:4px 11px;font-size:12px;cursor:pointer;font-family:inherit}"
      + ".bxChip:active{background:#e8eaf6}"
      + "#bxChatFoot{flex:0 0 auto;border-top:1px solid #e3e5e8;padding:9px;display:flex;gap:8px;background:#fff;margin-top:8px}"
      + "#bxChatInput{flex:1 1 auto;border:1px solid #e3e5e8;border-radius:9px;padding:9px 11px;font-size:15px;font-family:inherit;outline:none;min-width:0}"
      + "#bxChatInput:focus{border-color:#1a237e;outline:2px solid rgba(26,35,126,.32);outline-offset:1px}"
      + "#bxChatSend:active{transform:translateY(1px)}"
      + "#bxChatFab:focus-visible,#bxChatSend:focus-visible,#bxChatInput:focus-visible,.bxChip:focus-visible{outline:2px solid #1a237e;outline-offset:2px}"
      + "#bxChatSend{flex:0 0 auto;border:0;border-radius:9px;background:#1a237e;color:#fff;padding:0 15px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}"
      + "#bxChatTip{flex:0 0 auto;padding:0 9px 9px;font-size:11px;color:#999;text-align:center;background:#fff}"
      + "@media(max-width:520px){#bxChatPanel{right:0;bottom:0;width:100vw;max-width:100vw;height:78vh;border-radius:14px 14px 0 0}#bxChatFab{right:12px;bottom:14px}}";
    if (!document.getElementById("bxChatCss")) {
      var st = document.createElement("style");
      st.id = "bxChatCss";
      st.textContent = s;
      document.head.appendChild(st);
    }
  }

  /* ---------------- UI ---------------- */
  function ui() {
    if (document.getElementById("bxChatFab")) return;
    css();
    fab = document.createElement("button");
    fab.id = "bxChatFab";
    fab.type = "button";
    fab.setAttribute("aria-label", "在线咨询");
    fab.innerHTML = '<span class="bxIco">💬</span><span>在线咨询</span><span id="bxChatBadge">1</span>';

    panel = document.createElement("div");
    panel.id = "bxChatPanel";
    panel.innerHTML =
      '<div id="bxChatHead"><div><b>在线咨询</b><span>小乐在线 · 石岩元径村统建楼房源答疑</span></div>' +
      '<button id="bxChatClose" type="button" aria-label="关闭">&times;</button></div>' +
      '<div id="bxChatList"></div>' +
      '<div class="bxChips" id="bxChips"></div>' +
      '<div id="bxChatFoot"><input id="bxChatInput" type="text" maxlength="400" placeholder="想问什么？如：120平多少钱" autocomplete="off"><button id="bxChatSend" type="button">发送</button></div>' +
      '<div id="bxChatTip">看房请提前一天预约 · 庄生 13923838418</div>';

    document.body.appendChild(panel);
    document.body.appendChild(fab);

    list = panel.querySelector("#bxChatList");
    input = panel.querySelector("#bxChatInput");
    sendBtn = panel.querySelector("#bxChatSend");
    badge = fab.querySelector("#bxChatBadge");

    var chips = panel.querySelector("#bxChips");
    CHIPS.forEach(function (t) {
      var c = document.createElement("button");
      c.className = "bxChip";
      c.type = "button";
      c.textContent = t;
      c.addEventListener("click", function () {
        input.value = t;
        doSend();
      });
      chips.appendChild(c);
    });

    fab.addEventListener("click", function () {
      var open = panel.classList.toggle("bxOpen");
      if (open) {
        badge.textContent = "0";
        badge.classList.remove("bxHas");
        start();
        greet();
        startPoll();
        setTimeout(function () { input.focus(); }, 60);
      } else {
        stopPoll();
      }
    });
    panel.querySelector("#bxChatClose").addEventListener("click", function () {
      panel.classList.remove("bxOpen");
      stopPoll();
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    sendBtn.addEventListener("click", doSend);
  }

  /* ---------------- 消息渲染 ---------------- */
  function add(cls, who, text, id) {
    var d = document.createElement("div");
    d.className = "bxMsg " + cls;
    if (id) d.setAttribute("data-id", id);
    d.innerHTML = '<div class="bxWho">' + esc(who) + '</div><div class="bxBubble">' + esc(text) + "</div>";
    list.appendChild(d);
    list.scrollTop = list.scrollHeight;
    return d;
  }

  function renderEvent(d) {
    if (d.id && seen[d.id]) return;      // 按 ID 去重：SSE/轮询/回显/重连 全部不重复
    if (d.id) seen[d.id] = 1;
    typing(false);
    if (d.type === "user") add("bxMe", "我", d.text, d.id);
    else if (d.type === "reply") add("", "小乐", d.text, d.id);
    else if (d.type === "staff") add("bxStaff", "庄生", d.text, d.id);
  }

  function typing(on) {
    var old = document.getElementById("bxTyping");
    if (old) old.parentNode.removeChild(old);
    if (!on) return;
    var d = document.createElement("div");
    d.className = "bxMsg bxTyping";
    d.id = "bxTyping";
    d.innerHTML = '<div class="bxWho">小乐</div><div class="bxBubble">正在查询…</div>';
    list.appendChild(d);
    list.scrollTop = list.scrollHeight;
  }

  function fail(msg) {
    var d = document.createElement("div");
    d.className = "bxMsg";
    d.innerHTML = '<div class="bxBubble">' + esc(msg) + "</div>";
    list.appendChild(d);
    list.scrollTop = list.scrollHeight;
  }

  function greet() {
    if (greeted || list.querySelector(".bxMsg")) return;
    greeted = true;
    seen["local-greet"] = 1;
    add("", "小乐", "你好，我是小乐 🏠 有房源价格、户型、看房时间的问题都可以直接问我～");
  }

  /* ---------------- 网络 ---------------- */
  function fetchRetry(url, opts, tries) {
    opts = opts || {};
    opts.credentials = "omit";
    return new Promise(function (resolve, reject) {
      var n = 0;
      (function go() {
        n += 1;
        fetch(url, opts).then(resolve, function () {
          if (n >= tries) { reject(new Error("network")); return; }
          setTimeout(go, 1200 * n);
        });
      })();
    });
  }

  var API_CFG = API + "/api/chat/config";

  function start() {
    if (cfgReady) return cfgReady;
    cfgReady = fetchRetry(API_CFG, null, 4)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(0); })
      .then(function (c) {
        token = c.token;
        connect();
        fetchHistory();
        return token;
      })
      .catch(function () {
        cfgReady = null;          // 允许下次重试
        fail("在线接待暂时连接不上，请稍后再试或直接拨打庄生电话 13923838418。");
        throw 0;
      });
    return cfgReady;
  }

  function connect() {
    if (es) es.close();
    es = new EventSource(API + "/api/chat/stream?session=" + encodeURIComponent(sid()) + "&t=" + encodeURIComponent(token));
    es.onmessage = function (ev) {
      var d;
      try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.type === "typing") { typing(true); return; }
      if (d.type !== "user" && d.type !== "reply" && d.type !== "staff") return;
      renderEvent(d);
    };
    es.onerror = function () {
      typing(false);
      /* EventSource 自动重连；ID 去重保证重连回放不重复 */
    };
  }

  /* 历史轮询兜底：手机网络下 SSE 可能断流，轮询保证消息必达 */
  function fetchHistory() {
    fetch(API + "/api/chat/history?session=" + encodeURIComponent(sid()) + "&t=" + encodeURIComponent(token),
      { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(0); })
      .then(function (h) {
        (h.items || []).forEach(function (it) {
          if (!it.id || seen[it.id]) return;
          seen[it.id] = 1;
          typing(false);
          var who = it.role === "user" ? "我" : (it.role === "staff" ? "庄生" : "小乐");
          var cls = it.role === "user" ? "bxMe" : (it.role === "staff" ? "bxStaff" : "");
          add(cls, who, it.text, it.id);
        });
      })
      .catch(function () {});
  }

  function startPoll() {
    if (pollTimer) return;
    pollTimer = setInterval(fetchHistory, POLL_MS);
  }
  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  /* ---------------- 发送 ---------------- */
  function genMid() {
    return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function doSend() {
    var t = input.value.trim();
    if (!t) return;
    input.value = "";
    var mid = genMid();
    seen[mid] = 1;                    // 自己先画，服务端回显同 ID 时去重
    add("bxMe", "我", t, mid);
    start().then(function () {
      return fetchRetry(API + "/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-bx-token": token || "" },
        body: JSON.stringify({
          session: sid(),
          mid: mid,
          text: t,
          page: location.pathname + location.search
        })
      }, 2);
    }).then(function (r) {
      if (r.status === 429) { fail("发送太频繁啦，稍等一下再发。"); }
      else if (!r.ok) { fail("发送失败，请稍后重试或拨打 13923838418。"); }
    }).catch(function () {
      fail("网络异常，请稍后重试或拨打 13923838418。");
    });
  }

  /* ---------------- 对外接口：页面里的「在线咨询」按钮 ---------------- */
  function openChat() {
    ui();
    if (!panel.classList.contains("bxOpen")) fab.click();
    setTimeout(function () { input.focus(); }, 60);
  }
  window.bxChatOpen = openChat;

  /* ---------------- 启动 ---------------- */
  function boot() {
    ui();
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("[data-bx-chat]") : null;
      if (!t) return;
      e.preventDefault();
      openChat();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
