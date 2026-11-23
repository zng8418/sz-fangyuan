/* bx.szjacky.com 图廊灯箱 — 零依赖, 渐进增强 (无 JS 时图廊照常可用, 点击直接开原图) */
(function () {
  var links = [].slice.call(document.querySelectorAll('.gallery a'));
  if (!links.length) return;
  var lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = '<span class="lb-x" aria-label="关闭">×</span>' +
    '<span class="lb-nav lb-prev" aria-label="上一张">‹</span>' +
    '<img alt="大图查看">' +
    '<span class="lb-nav lb-next" aria-label="下一张">›</span>' +
    '<span class="lb-n"></span>';
  document.body.appendChild(lb);
  var img = lb.querySelector('img'), num = lb.querySelector('.lb-n'), cur = 0;
  function show(i) {
    cur = (i + links.length) % links.length;
    img.src = links[cur].getAttribute('href');
    var alt = links[cur].querySelector('img');
    if (alt) img.alt = alt.alt;
    num.textContent = (cur + 1) + ' / ' + links.length;
    lb.classList.add('on');
  }
  function hide() { lb.classList.remove('on'); img.src = ''; }
  links.forEach(function (a, i) {
    a.addEventListener('click', function (e) { e.preventDefault(); show(i); });
  });
  lb.querySelector('.lb-x').addEventListener('click', hide);
  lb.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(cur - 1); });
  lb.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(cur + 1); });
  lb.addEventListener('click', hide);
  img.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') hide();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
})();
