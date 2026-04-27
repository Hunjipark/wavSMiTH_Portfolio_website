/* ============================================
   wavSMiTH Portfolio — script.js
   - 오빗 노드 + 외부 레이블 각도 배치
   - GSAP 트랜지션 (오빗 좌측 스윙 + 패널 슬라이드)
   - Wavesurfer.js 파형 / 슬라이드바 플레이어
   - 전체 볼륨 마스터 페이더
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // =============================================
  // 0. 초기화: 중앙 텍스트 정렬 (CSS 충돌 방지 및 쏠림 해결)
  // =============================================
  const centerTextObj = document.getElementById('orbit-center-text');
  if (centerTextObj) {
    // xPercent/yPercent: CSS top:50%/left:50% 기준에서의 미세 보정값.
    // Space Mono 폰트 + 현재 텍스트 내용 기준으로 시각적 정중앙에 맞춰 조율된 수치입니다.
    // 폰트나 텍스트 내용 변경 시 재조율이 필요합니다.
    gsap.set(centerTextObj, { xPercent: -48.5, yPercent: -54, x: 0, y: 0 });
  }

  // 0-1. Ambience Design 무작위 유튜브 로딩 (videos.js 데이터 참조)
  // =============================================
  const ambienceContent = document.getElementById('ambience-content');
  if (ambienceContent && typeof ambienceVideos !== 'undefined') {
    const shuffled = [...ambienceVideos];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 전체 리스트에서 무작위 5개만 추출 (videos.js에서 데이터 공급)
    const selectedVideos = shuffled.slice(0, 5);
    
    let html = '';
    selectedVideos.forEach(video => {
      html += `
        <div class="yt-item">
          <h4 class="yt-song-title">${video.title}</h4>
          <div class="yt-wrapper">
            <iframe width="100%" height="100%" src="https://www.youtube.com/embed/${video.id}" frameborder="0" allowfullscreen></iframe>
          </div>
        </div>
      `;
    });
    ambienceContent.innerHTML = html;
  }

  // =============================================
  // 1. 오빗 노드 + 외부 레이블 각도 배치
  // =============================================

  function placeNodes() {
    const container = document.getElementById('orbit-container');
    const containerHalf = container.offsetWidth / 2;
    const ratio = container.offsetWidth / 500;
    const r      = 200 * ratio;          // 궤도 반지름

    // 버튼 배치 (CSS transform: translate(-50%,-50%) 가 중앙 정렬)
    document.querySelectorAll('.orbit-node').forEach(node => {
      const angleRad = (parseFloat(node.dataset.angle) - 90) * (Math.PI / 180);
      node.style.left = (containerHalf + r * Math.cos(angleRad)) + 'px';
      node.style.top  = (containerHalf + r * Math.sin(angleRad)) + 'px';

      // 터치 히트 영역 방향 주입 (궤도 중심에서 바깥쪽으로 버튼 반지름(7px)만큼 오프셋)
      // → ::after 원이 바깥방향으로 이동해 시각 크기는 유지하면서 클릭 범위 2배 확장
      const nodeHalfSize = 7; // 버튼 시각 반지름 (14px / 2)
      node.style.setProperty('--hit-dx', (Math.cos(angleRad) * nodeHalfSize) + 'px');
      node.style.setProperty('--hit-dy', (Math.sin(angleRad) * nodeHalfSize) + 'px');
    });

    // 레이블 배치 (CSS transform: translate(-50%,-50%) 가 중앙 정렬)
    document.querySelectorAll('.orbit-label').forEach(label => {
      const angleRad = (parseFloat(label.dataset.angle) - 90) * (Math.PI / 180);
      
      // 텍스트 박스 크기를 고려하여 '글자 테두리와 버튼 테두리 간의 거리'를 일정하게 유지
      const wHalf = label.offsetWidth / 2;
      const hHalf = label.offsetHeight / 2;
      
      const extraX = wHalf * Math.abs(Math.cos(angleRad));
      const extraY = hHalf * Math.abs(Math.sin(angleRad));
      
      // r(가운데노드) + 26px(고정간격) + extra(글자크기 보정)
      const adjustedRLabel = r + (26 * ratio) + extraX + extraY;
      
      label.style.left = (containerHalf + adjustedRLabel * Math.cos(angleRad)) + 'px';
      label.style.top  = (containerHalf + adjustedRLabel * Math.sin(angleRad)) + 'px';
    });
  }

  placeNodes();
  window.addEventListener('resize', placeNodes);

  // =============================================
  // 2. 패널 열기/닫기 — GSAP 트랜지션
  // =============================================
  const app         = document.getElementById('app');
  const panel       = document.getElementById('content-panel');
  const panelClose  = document.getElementById('panel-close');
  const allContents = document.querySelectorAll('.panel-content');
  let currentCategory = null;

  function openPanel(category) {
    if (currentCategory === category) { closePanel(); return; }
    currentCategory = category;

    // 모든 패널 내용 히든
    allContents.forEach(el => { el.hidden = true; });

    // 해당 카테고리 패널 표시
    const target = document.getElementById('panel-' + category);
    if (target) target.hidden = false;

    // 노드 & 레이블 active 상태
    document.querySelectorAll('.orbit-node').forEach(n =>
      n.classList.toggle('active', n.dataset.category === category)
    );
    document.querySelectorAll('.orbit-label').forEach(l =>
      l.classList.toggle('active', l.dataset.category === category)
    );

    // 패널이 이미 열려 있는지 확인 (애니메이션 분기용)
    const isAlreadyOpen = app.classList.contains('panel-open');

    // CSS 클래스 추가 → CSS transition 발동 (오빗 이동 및 축소)
    app.classList.add('panel-open');
    panel.setAttribute('aria-hidden', 'false');

    // GSAP 오빗 미세 탄성 이펙트
    // - 이미 패널이 열려 있는 상태에서 카테고리만 바꿀 때 실행 (사용자 선호 효과)
    // - 처음 열릴 때는 실행하지 않음 (부드러운 축소 유지)
    if (isAlreadyOpen) {
      gsap.fromTo('#orbit-container',
        { scale: 1 },
        { scale: 0.92, duration: 0.3, ease: 'power2.out',
          onComplete: () => gsap.to('#orbit-container', { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' })
        }
      );
    }

    // Wavesurfer 초기화 (패널 열린 뒤 약간 딜레이)
    setTimeout(() => initWaveforms(category), 450);
  }

  function closePanel() {
    currentCategory = null;
    app.classList.remove('panel-open');
    panel.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.orbit-node').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.orbit-label').forEach(l => l.classList.remove('active'));

    // Wavesurfer 인스턴스 정리
    waveInstances.forEach(ws => { try { ws.destroy(); } catch(e) {} });
    waveInstances = [];
    initializedWaves.clear();
  }

  document.querySelectorAll('.orbit-node').forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation(); // 노드 클릭 시 이벤트 전파 방지
      
      const cat = node.dataset.category;
      if (cat === 'youtube') {
        window.open('https://www.youtube.com/@wavsmith/featured', '_blank');
      } else if (cat === 'artive') {
        window.open('https://www.artivesound.com/', '_blank');
      } else {
        openPanel(cat);
      }
    });
  });

  // ======== 다국어(i18n) 통합 엔진 ========
  function setLanguage(lang) {
    // lang.js에서 데이터를 불러옴
    if (!window.i18nData || !window.i18nData[lang]) return;
    const data = window.i18nData[lang];
    
    // 일반 텍스트 데이터 교체
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (data[key]) el.textContent = data[key];
    });

    // 줄바꿈(<br>) 등 HTML 태그 포함 텍스트 교체
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (data[key]) el.innerHTML = data[key];
    });

    // 브라우저에 현재 표출 중인 언어 인식 교체
    document.documentElement.lang = lang;
  }

  // 언어 변경 버튼 기능 및 트리거
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // 누른 버튼의 언어(en, kr)로 일괄 변경!
      const newLang = btn.dataset.lang || 'en';
      setLanguage(newLang);
    });
  });

  // 웹사이트 첫 로딩 시 기본적으로 켜질 언어 설정
  const initialLang = document.querySelector('.lang-btn.active')?.dataset.lang || 'en';
  setLanguage(initialLang);
  
  // ======== 0. 폴더 아코디언 접기/펴기 이벤트 연결 ========
  document.querySelectorAll('.yt-folder-title').forEach(title => {
    title.addEventListener('click', (e) => {
      e.stopPropagation();
      const folder = title.closest('.yt-folder');
      if (folder) folder.classList.toggle('open');
    });
  });
  
  // 1. X 버튼 누르면 닫기
  panelClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closePanel();
  });
  
  // 2. ESC 키 누르면 닫기
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && app.classList.contains('panel-open')) closePanel();
  });

  // 3. 슬라이드 밖 화면 클릭 시 패널 닫기
  document.addEventListener('click', (e) => {
    if (app.classList.contains('panel-open')) {
      // 패널 영역이 클릭된 위치를 포함하지 않으면 외부 클릭으로 간주
      const isInsidePanel = panel.contains(e.target);
      if (!isInsidePanel) {
        closePanel();
      }
    }
  });

  // =============================================
  // 3. Wavesurfer.js 슬라이드바 파형 플레이어
  // =============================================
  let waveInstances  = [];
  const initializedWaves = new Set();

  function initWaveforms(category) {
    const panelEl = document.getElementById('panel-' + category);
    if (!panelEl) return;

    const waveEls = panelEl.querySelectorAll('.waveform');

    waveEls.forEach((el) => {
      if (initializedWaves.has(el.id)) return;
      initializedWaves.add(el.id);

      const playBtn = el.closest('.waveform-wrap')?.querySelector('.play-btn');
      const src = playBtn?.dataset.src || '';

      try {
        const ws = WaveSurfer.create({
          container: el,
          waveColor:     'rgba(255,255,255,0.28)',
          progressColor: '#FFE135',
          cursorColor:   'rgba(255,225,53,0.7)',
          cursorWidth:   2,
          barWidth:      2,
          barRadius:     2,
          barGap:        2,
          height:        44,
          normalize:     true,
          interact:      true,   // 클릭해서 seek 가능
        });

        ws.setVolume(0.8);

        if (src) {
          ws.load(src);
        }

        // 재생 상태에 따라 버튼 아이콘 토글
        if (playBtn) {
          ws.on('play',  () => { playBtn.innerHTML = '&#9646;&#9646;'; });
          ws.on('pause', () => { playBtn.innerHTML = '&#9654;'; });
          ws.on('finish',() => { playBtn.innerHTML = '&#9654;'; });

          playBtn.addEventListener('click', () => {
            // 다른 트랙 일시정지
            waveInstances.forEach(w => { if (w !== ws) { try { w.pause(); } catch(e) {} } });
            ws.playPause();
          });
        }

        waveInstances.push(ws);

      } catch(e) {
        console.warn('Wavesurfer init error:', e);
      }
    });
  }

  // =============================================
  // 4. 구도 GSAP 초기 등장 애니메이션
  // =============================================
  gsap.from('#orbit-container', {
    scale: 0.85, opacity: 0, duration: 1.2, ease: 'elastic.out(1, 0.6)',
  });
  // 노드/레이블에 GSAP 적용 안 함 — transform 충돌 방지

  // =============================================
  // 5. 고도화된 테마 스위칭 시스템 (시작점 제한 + 전역 거리 추적)
  // =============================================
  const themes = ['mint-yellow', 'dark-gold', 'nomadic-tribe', 'purple-cloud', 'cyber-trunk'];
  let currentThemeIndex = themes.indexOf(document.documentElement.getAttribute('data-theme'));
  if (currentThemeIndex === -1) currentThemeIndex = 0;

  let isDragging = false;
  let startX = 0;

  // 6-1. 제스처 시작: 반드시 제목 영역(centerTextObj) 내부여야 함
  function handleGestureStart(e) {
    isDragging = true;
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    if (centerTextObj) centerTextObj.style.cursor = 'grabbing';

    // 전역 추적을 위해 리스너를 window에 바인딩
    window.addEventListener('mousemove', handleGestureMove);
    window.addEventListener('mouseup', handleGestureEnd);
    window.addEventListener('touchmove', handleGestureMove, { passive: false });
    window.addEventListener('touchend', handleGestureEnd);
  }

  function handleGestureMove(e) {
    if (!isDragging) return;
    // 드래그 중 브라우저 기본 동작(스크롤 등) 방해 방지
    if (e.cancelable) e.preventDefault();
  }

  // 6-2. 제스처 종료: 시작 영역과 상관없이 '이동 거리'가 Orbit 지름의 2/3 이상이면 트리거
  function handleGestureEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    if (centerTextObj) centerTextObj.style.cursor = 'grab';

    const endX = e.type.includes('touch') ? e.changedTouches[0].clientX : e.clientX;
    const diff = endX - startX;

    // 트리거 거리 계산: 사용자 지정 수치인 180px를 임계값으로 사용
    const threshold = 180; 

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        currentThemeIndex = (currentThemeIndex - 1 + themes.length) % themes.length;
      } else {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      }

      document.documentElement.setAttribute('data-theme', themes[currentThemeIndex]);

      // 강력한 바운스 피드백 (정렬값을 보존하면서 x축만 튕김)
      gsap.fromTo(centerTextObj,
        { x: diff > 0 ? -25 : 25 },
        { x: 0, duration: 0.85, ease: 'elastic.out(1, 0.3)' }
      );
    } else {
      // 거리가 부족할 시 가벼운 흔들림 피드백 (미작동 알림)
      gsap.to(centerTextObj, { x: 0, duration: 0.4, ease: 'power2.out' });
    }

    // 전역 리스너 제거
    window.removeEventListener('mousemove', handleGestureMove);
    window.removeEventListener('mouseup', handleGestureEnd);
    window.removeEventListener('touchmove', handleGestureMove);
    window.removeEventListener('touchend', handleGestureEnd);
  }

  if (centerTextObj) {
    centerTextObj.style.cursor = 'grab';
    // 시작 리스너는 여전히 센터 텍스트 영역에만 걸어 "제한된 시작 영역"을 확보함
    centerTextObj.addEventListener('mousedown', handleGestureStart);
    centerTextObj.addEventListener('touchstart', handleGestureStart, { passive: false });
  }

  // ---------------------------------------------------------
  // 가로 스크롤 쇼츠 내비게이션 (화살표 버튼 클릭 시 한 칸씩 이동)
  // ---------------------------------------------------------
  window.scrollShorts = function(btn, direction) {
    const folder = btn.closest('.yt-folder');
    const container = folder.querySelector('.horizontal-scroll');
    if (!container) return;

    const firstItem = container.querySelector('.shorts-item');
    if (!firstItem) return;

    // CSS의 gap 값을 실제로 읽어와 하드코딩 의존 제거
    const computedGap = parseFloat(getComputedStyle(container).columnGap) || 15;
    const itemWidth = firstItem.offsetWidth;

    container.scrollBy({
      left: direction * (itemWidth + computedGap),
      behavior: 'smooth'
    });
  };

});
