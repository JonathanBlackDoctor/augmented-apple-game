/* board-engine.js — themeable, playable "sum-to-10" apple board.
 * Pure DOM + pointer events. Visuals come entirely from themed CSS scoped
 * under a direction class (.dir-a / .dir-b / .dir-c) on an ancestor; this
 * engine only builds structure + geometry + behavior.
 *
 * window.mountAppleBoard(rootEl, {
 *   cols, rows, cell,            // geometry (px)
 *   total,                       // round seconds (default 30)
 *   onUpdate(state),             // {score, combo, timeLeft, total, running, over}
 *   seed,                        // optional int for repeatable boards
 * }) -> { reset(), destroy() }
 */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.mountAppleBoard = function mountAppleBoard(root, opts) {
    opts = opts || {};
    const cols = opts.cols || 12;
    const rows = opts.rows || 8;
    const cell = opts.cell || 40;
    const total = opts.total || 30;
    const onUpdate = opts.onUpdate || function () {};
    let rng = mulberry32(opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0);

    root.classList.add('ab-root');
    root.style.position = 'relative';
    root.innerHTML = '';

    // ---- grid ----
    const grid = document.createElement('div');
    grid.className = 'ab-grid';
    grid.style.position = 'relative';
    grid.style.width = cols * cell + 'px';
    grid.style.height = rows * cell + 'px';
    grid.style.touchAction = 'none';
    grid.style.setProperty('--cell', cell + 'px');
    root.appendChild(grid);

    // selection box
    const sel = document.createElement('div');
    sel.className = 'ab-sel';
    sel.style.position = 'absolute';
    sel.style.display = 'none';
    sel.style.pointerEvents = 'none';
    grid.appendChild(sel);

    // fx layer
    const fx = document.createElement('div');
    fx.className = 'ab-fx';
    fx.style.position = 'absolute';
    fx.style.inset = '0';
    fx.style.pointerEvents = 'none';
    fx.style.overflow = 'visible';
    grid.appendChild(fx);

    // game-over overlay
    const over = document.createElement('div');
    over.className = 'ab-over';
    over.style.display = 'none';
    over.innerHTML =
      '<div class="ab-over-card">' +
      '<div class="ab-over-title">시간 종료</div>' +
      '<div class="ab-over-score"></div>' +
      '<button class="ab-replay" type="button">다시 플레이</button>' +
      '</div>';
    root.appendChild(over);
    over.querySelector('.ab-replay').addEventListener('click', function (e) {
      e.stopPropagation();
      reset();
    });

    // ---- state ----
    const val = [];      // value[r][c]
    const alive = [];    // bool
    const elc = [];      // cell wrapper el
    const ela = [];      // apple el
    let score = 0, combo = 0, timeLeft = total, running = false, gameover = false;
    let comboT = 0, tick = null;
    let dragging = false, sR = 0, sC = 0;

    function emit() {
      onUpdate({ score: score, combo: combo, timeLeft: timeLeft, total: total, running: running, over: gameover });
    }

    function buildCells() {
      for (let r = 0; r < rows; r++) {
        val[r] = []; alive[r] = []; elc[r] = []; ela[r] = [];
        for (let c = 0; c < cols; c++) {
          const wrap = document.createElement('div');
          wrap.className = 'ab-cell';
          wrap.style.position = 'absolute';
          wrap.style.left = c * cell + 'px';
          wrap.style.top = r * cell + 'px';
          wrap.style.width = cell + 'px';
          wrap.style.height = cell + 'px';

          const apple = document.createElement('div');
          apple.className = 'apple';
          const body = document.createElement('div');
          body.className = 'apple-body';
          const stem = document.createElement('span');
          stem.className = 'leaf-stem';
          const leaf = document.createElement('span');
          leaf.className = 'leaf';
          const num = document.createElement('span');
          num.className = 'num';
          apple.appendChild(body);
          apple.appendChild(stem);
          apple.appendChild(leaf);
          apple.appendChild(num);
          wrap.appendChild(apple);
          grid.appendChild(wrap);

          elc[r][c] = wrap; ela[r][c] = apple;
        }
      }
    }

    // Apples are always visible at rest (base opacity:1); never gate the
    // resting state on a one-shot animation. The entrance is a single
    // grid-level fade handled in mount/reset.
    function fill() {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = 1 + ((rng() * 9) | 0);
          val[r][c] = v; alive[r][c] = true;
          const wrap = elc[r][c], apple = ela[r][c];
          wrap.classList.remove('empty');
          apple.classList.remove('popping');
          apple.querySelector('.num').textContent = v;
        }
      }
    }

    function clearSel() {
      sel.style.display = 'none';
      sel.classList.remove('valid');
      const hi = grid.querySelectorAll('.ab-cell.sel');
      for (let i = 0; i < hi.length; i++) hi[i].classList.remove('sel');
    }

    function cellFromEvent(e) {
      const rect = grid.getBoundingClientRect();
      const cw = rect.width / cols, ch = rect.height / rows;
      let c = Math.floor((e.clientX - rect.left) / cw);
      let r = Math.floor((e.clientY - rect.top) / ch);
      c = Math.max(0, Math.min(cols - 1, c));
      r = Math.max(0, Math.min(rows - 1, r));
      return { r: r, c: c };
    }

    let curSum = 0, cur = null;
    function paintSel(r0, c0, r1, c1) {
      const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
      const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
      sel.style.display = 'block';
      sel.style.left = minC * cell + 'px';
      sel.style.top = minR * cell + 'px';
      sel.style.width = (maxC - minC + 1) * cell + 'px';
      sel.style.height = (maxR - minR + 1) * cell + 'px';

      let sum = 0;
      const prev = grid.querySelectorAll('.ab-cell.sel');
      for (let i = 0; i < prev.length; i++) prev[i].classList.remove('sel');
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (alive[r][c]) { sum += val[r][c]; elc[r][c].classList.add('sel'); }
        }
      }
      curSum = sum;
      cur = { minR: minR, maxR: maxR, minC: minC, maxC: maxC };
      const ok = sum === 10;
      sel.classList.toggle('valid', ok);
    }

    function burst(cx, cy, n) {
      n = Math.min(n, 7);
      for (let i = 0; i < n; i++) {
        const p = document.createElement('div');
        p.className = 'ab-particle';
        const ang = (Math.PI * 2 * i) / n + rng() * 0.7;
        const dist = cell * (0.5 + rng() * 0.7);
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.setProperty('--tx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--ty', (Math.sin(ang) * dist - cell * 0.2) + 'px');
        p.style.setProperty('--ps', (0.5 + rng() * 0.7).toFixed(2));
        fx.appendChild(p);
        p.addEventListener('animationend', function () { p.remove(); });
      }
    }

    function popText(cx, cy, n, big) {
      const t = document.createElement('div');
      t.className = 'ab-pop' + (big ? ' big' : '');
      t.textContent = '+' + n;
      t.style.left = cx + 'px';
      t.style.top = cy + 'px';
      fx.appendChild(t);
      t.addEventListener('animationend', function () { t.remove(); });
    }

    function commit() {
      if (gameover) return;
      if (curSum === 10 && cur) {
        let removed = 0;
        for (let r = cur.minR; r <= cur.maxR; r++) {
          for (let c = cur.minC; c <= cur.maxC; c++) {
            if (!alive[r][c]) continue;
            alive[r][c] = false; removed++;
            const apple = ela[r][c], wrap = elc[r][c];
            apple.classList.add('popping');
            const cx = c * cell + cell / 2, cy = r * cell + cell / 2;
            burst(cx, cy, 5);
            (function (w, a) {
              a.addEventListener('animationend', function onEnd() {
                a.removeEventListener('animationend', onEnd);
                w.classList.add('empty');
              });
            })(wrap, apple);
          }
        }
        if (removed > 0) {
          combo += 1;
          score += removed;
          const cx = ((cur.minC + cur.maxC + 1) / 2) * cell;
          const cy = ((cur.minR + cur.maxR + 1) / 2) * cell;
          popText(cx, cy, removed, removed >= 4);
          clearTimeout(comboT);
          comboT = setTimeout(function () { combo = 0; emit(); }, 2600);
          emit();
        }
      }
      clearSel();
      curSum = 0; cur = null;
    }

    // ---- pointer ----
    function onDown(e) {
      if (gameover) return;
      e.preventDefault();
      e.stopPropagation();
      if (!running && timeLeft > 0) startTimer();
      try { grid.setPointerCapture(e.pointerId); } catch (err) {}
      dragging = true;
      const p = cellFromEvent(e);
      sR = p.r; sC = p.c;
      paintSel(sR, sC, sR, sC);
    }
    function onMove(e) {
      if (!dragging) return;
      e.preventDefault();
      const p = cellFromEvent(e);
      paintSel(sR, sC, p.r, p.c);
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      try { grid.releasePointerCapture(e.pointerId); } catch (err) {}
      commit();
    }
    grid.addEventListener('pointerdown', onDown);
    grid.addEventListener('pointermove', onMove);
    grid.addEventListener('pointerup', onUp);
    grid.addEventListener('pointercancel', onUp);

    // ---- timer ----
    function startTimer() {
      running = true;
      emit();
      tick = setInterval(function () {
        timeLeft = Math.max(0, timeLeft - 0.1);
        if (timeLeft <= 0) {
          clearInterval(tick); tick = null;
          running = false; gameover = true;
          over.querySelector('.ab-over-score').textContent = score + '점';
          over.style.display = 'flex';
        }
        emit();
      }, 100);
    }

    function reset() {
      if (tick) { clearInterval(tick); tick = null; }
      clearTimeout(comboT);
      rng = mulberry32((Math.random() * 1e9) | 0);
      score = 0; combo = 0; timeLeft = total; running = false; gameover = false;
      clearSel();
      over.style.display = 'none';
      const ps = fx.querySelectorAll('.ab-particle,.ab-pop');
      for (let i = 0; i < ps.length; i++) ps[i].remove();
      fill();
      emit();
    }

    buildCells();
    fill();
    emit();

    return {
      reset: reset,
      destroy: function () {
        if (tick) clearInterval(tick);
        clearTimeout(comboT);
        grid.removeEventListener('pointerdown', onDown);
        grid.removeEventListener('pointermove', onMove);
        grid.removeEventListener('pointerup', onUp);
        grid.removeEventListener('pointercancel', onUp);
        root.innerHTML = '';
      }
    };
  };
})();
