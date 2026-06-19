/* ============================================================
   wavSMiTH Portfolio — data_loader.js
   CSV 파일을 fetch로 읽어 각 패널을 동적 렌더링합니다.
   - SFX / BGM / Career 세 가지 렌더러 포함
   - KR / EN 두 언어 모두 최초 1회 로드, 전환은 즉시 재렌더링
   ============================================================ */

(function () {

  // ── CSV 파일 경로 정의 ──────────────────────────────────────
  const CSV_FILES = {
    sfx:    { en: 'Portfolio_csv/wavsmith_website_PortfolioChart - SOUND FX EN.csv',
              kr: 'Portfolio_csv/wavsmith_website_PortfolioChart - SOUND FX KR.csv' },
    bgm:    { en: 'Portfolio_csv/wavsmith_website_PortfolioChart - BGM EN.csv',
              kr: 'Portfolio_csv/wavsmith_website_PortfolioChart - BGM KR.csv' },
    career: { en: 'Portfolio_csv/wavsmith_website_PortfolioChart - CAREER EN.csv',
              kr: 'Portfolio_csv/wavsmith_website_PortfolioChart - CAREER KR.csv' },
  };

  // 로드된 데이터 캐시 (최초 fetch 이후 재요청 없이 사용)
  const cache = { sfx: {}, bgm: {}, career: {} };

  // ── 유틸: CSV 파싱 ──────────────────────────────────────────
  function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = splitCSVLine(line);
      const obj = {};
      headers.forEach((h, idx) => { obj[h.trim()] = (values[idx] || '').trim(); });
      rows.push(obj);
    }
    return rows;
  }

  // RFC 4180 준수 CSV 한 줄 파싱 (쌍따옴표 내 쉼표 처리)
  function splitCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        result.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  // ── 유틸: YouTube ID 추출 ───────────────────────────────────
  function extractYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:v=|youtu\.be\/)([^&?/\s]+)/);
    return m ? m[1] : null;
  }

  // ── 유틸: YouTube iframe 엘리먼트 생성 ─────────────────────
  function createIframe(videoId, isShorts) {
    const wrapper = document.createElement('div');
    wrapper.className = isShorts ? 'yt-wrapper shorts-ratio' : 'yt-wrapper';
    const iframe = document.createElement('iframe');
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.loading = 'lazy';
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.frameBorder = '0';
    iframe.allowFullscreen = true;
    if (!isShorts) { iframe.width = '100%'; iframe.height = '100%'; }
    wrapper.appendChild(iframe);
    return wrapper;
  }

  // ── 유틸: yt-folder 엘리먼트 생성 ──────────────────────────
  function createFolder(titleText, isOpen) {
    const folder = document.createElement('div');
    folder.className = 'yt-folder' + (isOpen ? ' open' : '');

    const titleEl = document.createElement('div');
    titleEl.className = 'yt-folder-title';
    titleEl.textContent = titleText;
    // 클릭 이벤트는 script.js의 content-panel 이벤트 위임이 담당

    const wrapper = document.createElement('div');
    wrapper.className = 'folder-content-wrapper';

    folder.appendChild(titleEl);
    folder.appendChild(wrapper);
    return { folder, wrapper };
  }

  // ══════════════════════════════════════════════════════════
  // 렌더러 1: SFX 패널
  // ══════════════════════════════════════════════════════════
  function renderSFX(rows) {
    const container = document.getElementById('tracklist-sfx');
    if (!container) return;
    container.innerHTML = '';

    const visible = rows.filter(r => r.visible === 'TRUE');
    visible.sort((a, b) => Number(a.order) - Number(b.order));

    // 폴더별로 그룹핑
    const folderMap = new Map();
    const folderOrder = [];
    visible.forEach(row => {
      const folderName = row.folder;
      if (!folderMap.has(folderName)) {
        folderMap.set(folderName, []);
        folderOrder.push(folderName);
      }
      folderMap.get(folderName).push(row);
    });

    folderOrder.forEach(folderName => {
      const items = folderMap.get(folderName);
      const isRandomPool = items[0].group_type === 'random_pool';

      const { folder, wrapper } = createFolder(folderName, true);
      const content = document.createElement('div');
      content.className = 'folder-content';

      if (isRandomPool) {
        // Ambience: 셔플 후 5개만 선택
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        shuffled.slice(0, 5).forEach(row => {
          const videoId = extractYouTubeId(row.url);
          if (!videoId) return;
          const item = document.createElement('div');
          item.className = 'yt-item';
          const title = document.createElement('h4');
          title.className = 'yt-song-title';
          title.textContent = row.title;
          item.appendChild(title);
          item.appendChild(createIframe(videoId, false));
          content.appendChild(item);
        });
      } else {
        // normal: 전체 표시
        items.forEach(row => {
          const videoId = extractYouTubeId(row.url);
          if (!videoId) return;
          const item = document.createElement('div');
          item.className = 'yt-item';
          const title = document.createElement('h4');
          title.className = 'yt-song-title';
          title.textContent = row.title;
          item.appendChild(title);
          item.appendChild(createIframe(videoId, false));
          content.appendChild(item);
        });
      }

      wrapper.appendChild(content);
      container.appendChild(folder);
    });
  }

  // ══════════════════════════════════════════════════════════
  // 렌더러 2: BGM 패널
  // ══════════════════════════════════════════════════════════
  function renderBGM(rows) {
    const container = document.getElementById('tracklist-bgm');
    if (!container) return;
    container.innerHTML = '';

    const visible = rows.filter(r => r.visible === 'TRUE');
    visible.sort((a, b) => Number(a.order) - Number(b.order));

    // 프로젝트별 그룹핑 (같은 company+project → 하나의 폴더)
    const folderMap = new Map();
    const folderOrder = [];
    visible.forEach(row => {
      const key = `${row.company}|||${row.project}`;
      if (!folderMap.has(key)) {
        folderMap.set(key, []);
        folderOrder.push(key);
      }
      folderMap.get(key).push(row);
    });

    folderOrder.forEach(key => {
      const items = folderMap.get(key);
      const firstRow = items[0];
      const isShorts = firstRow.group_type === 'shorts';

      // 폴더 타이틀: "company · project" 형태
      let folderTitle = '';
      if (firstRow.company && firstRow.project) {
        folderTitle = `${firstRow.company} · ${firstRow.project}`;
      } else {
        folderTitle = firstRow.company || firstRow.project || 'Unknown';
      }

      const { folder, wrapper } = createFolder(folderTitle, true);

      if (isShorts) {
        // Shorts: 가로 스크롤 레이아웃
        const innerWrapper = document.createElement('div');
        innerWrapper.className = 'shorts-inner-wrapper';

        const nav = document.createElement('div');
        nav.className = 'shorts-nav';
        nav.setAttribute('onclick', 'event.stopPropagation()');
        nav.innerHTML = `
          <button type="button" class="shorts-nav-btn" onclick="scrollShorts(this,-1)" title="Previous">‹</button>
          <button type="button" class="shorts-nav-btn" onclick="scrollShorts(this,1)" title="Next">›</button>
        `;

        const content = document.createElement('div');
        content.className = 'folder-content horizontal-scroll';

        items.forEach(row => {
          const videoId = extractYouTubeId(row.url);
          if (!videoId) return;
          const item = document.createElement('div');
          item.className = 'yt-item shorts-item';
          item.appendChild(createIframe(videoId, true));
          content.appendChild(item);
        });

        innerWrapper.appendChild(nav);
        innerWrapper.appendChild(content);
        wrapper.appendChild(innerWrapper);
      } else {
        // Normal: 세로 목록
        const content = document.createElement('div');
        content.className = 'folder-content';

        items.forEach(row => {
          const videoId = extractYouTubeId(row.url);
          if (!videoId) return;
          const item = document.createElement('div');
          item.className = 'yt-item';
          const title = document.createElement('h4');
          title.className = 'yt-song-title';
          title.textContent = row.title;
          item.appendChild(title);
          item.appendChild(createIframe(videoId, false));
          content.appendChild(item);
        });

        wrapper.appendChild(content);
      }

      container.appendChild(folder);
    });
  }

  // ══════════════════════════════════════════════════════════
  // 렌더러 3: Career 패널
  // ══════════════════════════════════════════════════════════
  function renderCareer(rows) {
    const timelineContainer = document.getElementById('career-timeline-list');
    const projectContainer  = document.getElementById('career-project-grid');
    if (!timelineContainer || !projectContainer) return;

    timelineContainer.innerHTML = '';
    projectContainer.innerHTML  = '';

    const visible = rows.filter(r => r.visible === 'TRUE');
    visible.sort((a, b) => Number(a.order) - Number(b.order));

    visible.forEach(row => {
      if (row.item_type === 'timeline') {
        // 타임라인 항목
        const li = document.createElement('li');
        li.className = 'career-item';
        li.innerHTML = `
          <span class="career-year">${row.period}</span>
          <div class="career-detail">
            <strong>${row.title}</strong>
            <span>${row.description}</span>
          </div>
        `;
        timelineContainer.appendChild(li);

      } else if (row.item_type === 'project') {
        // 게임 프로젝트 그리드 카드
        const titleAttr = row.project || row.title;
        const altAttr   = row.title;

        const card = document.createElement('div');
        card.className = 'career-grid-item';
        card.title = titleAttr;

        const img = document.createElement('img');
        img.src     = row.image_url;
        img.alt     = altAttr;
        img.loading = 'lazy';

        card.appendChild(img);
        projectContainer.appendChild(card);
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  // fetch + 파싱 + 렌더링 통합 실행
  // ══════════════════════════════════════════════════════════
  async function fetchCSV(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`CSV 로드 실패: ${path}`);
    return parseCSV(await res.text());
  }

  async function loadAll() {
    try {
      // 두 언어 모두 병렬 로드
      const [sfxEN, sfxKR, bgmEN, bgmKR, careerEN, careerKR] = await Promise.all([
        fetchCSV(CSV_FILES.sfx.en),
        fetchCSV(CSV_FILES.sfx.kr),
        fetchCSV(CSV_FILES.bgm.en),
        fetchCSV(CSV_FILES.bgm.kr),
        fetchCSV(CSV_FILES.career.en),
        fetchCSV(CSV_FILES.career.kr),
      ]);

      cache.sfx    = { en: sfxEN,    kr: sfxKR    };
      cache.bgm    = { en: bgmEN,    kr: bgmKR    };
      cache.career = { en: careerEN, kr: careerKR };

      // 현재 언어로 초기 렌더링
      renderAll(getCurrentLang());

    } catch (err) {
      console.error('[data_loader] CSV 로드 오류:', err);
    }
  }

  function getCurrentLang() {
    const activeBtn = document.querySelector('.lang-btn.active');
    return (activeBtn?.dataset.lang === 'en') ? 'en' : 'kr';
  }

  // 외부에서 호출 가능한 재렌더링 함수 (언어 전환 시 script.js가 호출)
  function renderAll(lang) {
    const l = (lang === 'en') ? 'en' : 'kr';
    if (cache.sfx[l])    renderSFX(cache.sfx[l]);
    if (cache.bgm[l])    renderBGM(cache.bgm[l]);
    if (cache.career[l]) renderCareer(cache.career[l]);
  }

  // 전역 노출
  window.portfolioLoader = { renderAll };

  // DOM 준비 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }

})();
