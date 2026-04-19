/* ============================================
   wavSMiTH Portfolio — script.js
   - 오빗 노드 + 외부 레이블 각도 배치
   - GSAP 트랜지션 (오빗 좌측 스윙 + 패널 슬라이드)
   - Wavesurfer.js 파형 / 슬라이드바 플레이어
   - 전체 볼륨 마스터 페이더
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // =============================================
  // 0. Ambience Design 무작위 유튜브 로딩 (videos.js 데이터 참조)
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
          backend:       'WebAudio',
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
  // 노드/레이블에 GSAP 적용 안 함 — transform 충돌 법판


});
