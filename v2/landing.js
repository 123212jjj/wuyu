(() => {
  const shotImg = document.getElementById('shot-img');
  const shotCaption = document.getElementById('shot-caption');
  const shotButtons = document.querySelectorAll('.seg__btn[data-shot]');
  const shots = {
    result: { src: './assets/shot-result.png', caption: '编译结果 · 标题 / 配文 / 正文 / 话题，逐项可复制' },
    studio: { src: './assets/shot-studio-coffee.png', caption: '封面工坊 · 换图、套版式、调字体，一套带走' },
  };

  shotButtons.forEach((button) => {
    button.addEventListener('click', () => {
      shotButtons.forEach((item) => {
        item.classList.toggle('is-on', item === button);
        item.setAttribute('aria-selected', item === button ? 'true' : 'false');
      });
      const shot = shots[button.dataset.shot];
      if (shot && shotImg) {
        shotImg.src = shot.src;
        shotImg.alt = shot.caption;
        if (shotCaption) shotCaption.textContent = shot.caption;
      }
    });
  });

  const compareButtons = document.querySelectorAll('.seg__btn[data-compare]');
  const examples = [...document.querySelectorAll('.example')];
  const withTool = examples.filter((item) => item.dataset.kind === 'on');
  const pager = document.querySelector('.pager');
  const label = document.getElementById('pager-label');
  let index = 0;
  let mode = 'on';

  const render = () => {
    examples.forEach((item) => {
      const visible = mode === 'off' ? item.dataset.kind === 'off' : item.dataset.kind === 'on' && withTool.indexOf(item) === index;
      item.classList.toggle('is-on', visible);
    });
    if (pager) pager.hidden = mode === 'off';
    if (label) label.textContent = `第 ${index + 1} / ${withTool.length} 例`;
  };

  compareButtons.forEach((button) => {
    button.addEventListener('click', () => {
      compareButtons.forEach((item) => {
        item.classList.toggle('is-on', item === button);
        item.setAttribute('aria-selected', item === button ? 'true' : 'false');
      });
      mode = button.dataset.compare === 'off' ? 'off' : 'on';
      if (mode === 'on') index = 0;
      render();
    });
  });

  const step = (delta) => {
    if (!withTool.length) return;
    index = (index + delta + withTool.length) % withTool.length;
    render();
  };

  document.getElementById('prev')?.addEventListener('click', () => step(-1));
  document.getElementById('next')?.addEventListener('click', () => step(1));

  render();
})();

// ===== 工作台内嵌：一个网址里切换 =====
(() => {
  const overlay = document.getElementById('app-overlay');
  const frame = document.getElementById('app-frame');
  const closeBtn = document.getElementById('app-close');
  if (!overlay || !frame) return;

  const openApp = () => {
    frame.src = './app/';
    overlay.hidden = false;
    document.body.classList.add('app-open');
  };

  const closeApp = () => {
    overlay.hidden = true;
    document.body.classList.remove('app-open');
    frame.src = 'about:blank';
  };

  document.querySelectorAll('[data-open-app]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openApp();
    });
  });

  closeBtn?.addEventListener('click', closeApp);
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'wenan:exit-app') closeApp();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) closeApp();
  });
})();