/* bx.szjacky.com 在线接待挂件
 * 访客 → chat.szjacky.com 桥接服务 → 飞书窗口（庄生 + 小乐）→ 回传访客
 * 纯静态、零依赖、无外部字体/图片，保证 Pages 上秒开且不拖累 SEO 首屏。
 */
(function () {
  "use strict";

  var API = "https://chat.szjacky.com";
  var SID_KEY = "bx_chat_sid";
  var OPEN_KEY = "bx_chat_open";

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

  var box, list, input, sendBtn, badge, es = null, token = null, started = false, seen = {};

  function css() {
    var s = "#bxChatFab{position:fixed;right:16px;bottom:20px;z-index:99990;display:flex;align-items:center;gap:7px;border:0;border-radius:30px;padding:11px 17px;background:#d84315;color:#fff;font-size:15px;font-weight:600;box-shadow:0 6px 20px rgba(216,67,21,.32);cursor:pointer;font-family:inherit}"
      + "#bxChatFab .bxIco{font-size:19px;line-height:1}"
      + "#bxChatBadge{display:none;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#fff;color:#d84315;font-size:12px;font-weight:700;line-height:18px;text-align:center}"
      + "#bxChatFab.bxHas #bxChatBadge{display:block}"
      + "#bxChatPanel{position:fixed;right:16px;bottom:88px;z-index:99991;width:352px;max-width:calc(100vw - 32px);height:474px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.2);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif}"
      + "#bxChatPanel.bxOpen{display:flex}"
      + "#bxChatHead{background:#1a237e;color:#fff;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;flex:0 0 auto}"
      + "#bxChatHead b{font-size:15px;font-weight:600}"
      + "#bxChatHead span{display:block;font-size:12px;opacity:.8;margin-top:1px}"
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
      + "#bxChatFoot{flex:0 0 auto;border-top:1px solid #e3e5e8;padding:9px;display:flex;gap:8px;background:#fff}"
      + "#bxChatInput{flex:1 1 auto;border:1px solid #e3e5e8;border-radius:9px;padding:9px 11px;font-size:15px;font-family:inherit;outline:none;min-width:0}"
      + "#bxChatInput:focus{border-color:#1a237e}"
      + "#bxChatSend{flex:0 0 auto;border:0;border-radius:9px;background:#1a237e;color:#fff;padding:0 15px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}"
      + "#bxChatSend:disabled{background:#c5cae9;cursor:not-allowed}"
      + "#bxChatTip{flex:0 0 auto;padding:0 9px 9px;font-size:11px;color:#999;text-align:center;background:#fff}"
      + "@media(max-width:520px){#bxChatPanel{right:0;bottom:0;width:100vw;max-width:100vw;height:82vh;max-height:82vh;border-radius:14px 14px 0 0}#bxChatFab{right:12px;bottom:14px}}";
    if (!document.getElementById("bxChatCss")) {
      var st = document.createElement("style");
      st.id = "bxChatCss";
      st.textContent = s;
      document.head.appendChild(st);
    }
  }

  function ui() {
    if (document.getElementById("bxChatFab")) return;
    css();
    var fab = document.createElement("button");
    fab.id = "bxChatFab";
    fab.type = "button";
    fab.setAttribute("aria-label", "在线咨询");
    fab.innerHTML = '<span class="bxIco">💬</span><span>在线咨询</span><span id="bxChatBadge">1</span>';

    var panel = document.createElement("div");
    panel.id = "bxChatPanel";
    panel.innerHTML =
      '<div id="bxChatHead"><div><b>在线咨询 · 庄生</b><span>石岩元径村统建楼 · 房源答疑</span></div>' +
      '<button id="bxChatClose" type="button" aria-label="关闭">&times;</button></div>' +
      '<div id="bxChatList"></div>' +
      '<div id="bxChatFoot"><input id="bxChatInput" type="text" maxlength="400" placeholder="想问什么？如：120平多少钱" autocomplete="off"><button id="bxChatSend" type="button">发送</button></div>' +
      '<div id="bxChatTip">看房请提前一天预约 · 13923838418</div>';

    document.body.appendChild(panel);
    document.body.appendChild(fab);

    box = panel;
    list = panel.querySelector("#bxChatList");
    input = panel.querySelector("#bxChatInput");
    sendBtn = panel.querySelector("#bxChatSend");
    badge = fab.querySelector("#bxChatBadge");

    fab.addEventListener("click", function () {
      var open = panel.classList.toggle("bxOpen");
      fab.classList.toggle("bxHas", false);
      if (open) {
        badge.style.display = "none";
        start();
        setTimeout(function () { input.focus(); }, 60);
      }
    });
    panel.querySelector("#bxChatClose").addEventListener("click", function () {
      panel.classList.remove("bxOpen");
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    sendBtn.addEventListener("click", doSend);
  }

  function add(cls, who, text) {
    var d = document.createElement("div");
    d.className = "bxMsg " + cls;
    d.innerHTML = '<div class="bxWho">' + esc(who) + '</div><div class="bxBubble">' + esc(text) + "</div>";
    list.appendChild(d);
    list.scrollTop = list.scrollHeight;
    return d;
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

  function start() {
    if (started) return;
    started = true;
    fetch(API + "/api/chat/config", { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(0); })
      .then(function (c) {
        token = c.token;
        connect();
      })
      .catch(function () {
        fail("在线接待暂时不可用，请直接拨打庄生电话 13923838418。");
      });
  }

  function connect() {
    if (es) es.close();
    es = new EventSource(API + "/api/chat/stream?session=" + encodeURIComponent(sid()) + "&t=" + encodeURIComponent(token));
    es.onmessage = function (ev) {
      var d;
      try { d = JSON.parse(ev.data); } catch (e) { return; }
      if (d.type === "typing") { typing(true); return; }
      if (d.type !== "user" && d.type !== "reply" && d.type !== "staff") return;
      if (d.id && seen[d.id]) return;   // 按消息 ID 去重：刷新/重连/回显都不重复画
      if (d.id) seen[d.id] = 1;
      typing(false);
      if (d.type === "user") add("bxMe", "我", d.text);
      else if (d.type === "reply") add("", "小乐", d.text);
      else add("bxStaff", "庄生", d.text);
    };
    es.onerror = function () {
      typing(false);
      if (!started) return;
      // EventSource 自带重连；连续断开时给一次人工出口提示
      if (es.readyState === 2) {
        fail("连接中断，正在重连…如需立即咨询请拨打 13923838418。");
        setTimeout(connect, 4000);
      }
    };
  }

  function genMid() {
    return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function doSend() {
    var t = input.value.trim();
    if (!t) return;
    input.value = "";
    var mid = genMid();
    seen[mid] = 1;              // 自己先画，服务端回显同 ID 时去重
    add("bxMe", "我", t);
    // 自己的消息由服务端 SSE 回显（保证只出现一次，且刷新/重连后仍在历史里）
    fetch(API + "/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-bx-token": token || "" },
      body: JSON.stringify({
        session: sid(),
        mid: mid,
        text: t,
        page: location.pathname + location.search
      })
    }).then(function (r) {
      if (r.status === 429) { fail("发送太频繁啦，稍等一下再发。"); }
      else if (!r.ok) { fail("发送失败，请稍后重试或拨打 13923838418。"); }
    }).catch(function () {
      fail("网络异常，请稍后重试或拨打 13923838418。");
    });
  }
  function boot() {
    ui();
    try {
      if (sessionStorage.getItem(OPEN_KEY) === "1") {
        document.getElementById("bxChatFab").click();
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
