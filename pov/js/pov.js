/* ============================================================
   POV by NAUB
   Script della pagina pov/index.html.
   Stesso stack della home (../index.html): GSAP (+ ScrollTrigger, SplitText) e Lenis da CDN.
   Senza GSAP, o con "riduci movimento", la pagina resta statica e completa
   (ogni sezione ha il proprio colore di fondo, classe .no-gsap su <html>).
   ============================================================ */
(function(){
  "use strict";

  var root = document.documentElement;
  document.getElementById('year').textContent = new Date().getFullYear();

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var useGsap = !!(window.gsap && window.ScrollTrigger) && !reduceMotion && !root.classList.contains('no-gsap');
  root.classList.add(useGsap ? 'gsap' : 'no-gsap');
  if (!useGsap) root.classList.remove('gsap');

  var THEMES = {
    pink:  { bg:'#E8C9CC', fg:'#1B191A', accent:'#1B191A' },
    cream: { bg:'#F3F0E9', fg:'#1B191A', accent:'#CC2A21' },
    ink:   { bg:'#1B191A', fg:'#F3F0E9', accent:'#E8C9CC' },
    sage:  { bg:'#C7CBC8', fg:'#1B191A', accent:'#1B191A' },
    red:   { bg:'#CC2A21', fg:'#F3F0E9', accent:'#F3F0E9' }
  };
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var chapterEl = document.getElementById('hdrChapter');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));

  // Video (galleria, iPhone, metodo): partono quando sono visibili per almeno metà e si
  // fermano quando escono, anche senza GSAP. Sul carosello mobile gira solo quello al centro.
  // Sempre muti: è la condizione perché i browser li facciano partire da soli.
  var videos = document.querySelectorAll('video');
  videos.forEach(function(v){ v.muted = true; });
  if ('IntersectionObserver' in window){
    var vio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.preload = 'auto'; e.target.play().catch(function(){}); }
        else e.target.pause();
      });
    }, { threshold:0.5 });
    videos.forEach(function(v){ vio.observe(v); });
  }

  // Link interni (#...) con scorrimento morbido.
  var lenis = null;
  function scrollToTarget(target){
    if (lenis) lenis.scrollTo(target, { duration:1.6 });
    else {
      var y = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top:y, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      scrollToTarget(target);
    });
  });

  if (!useGsap){
    // Versione statica: il capitolo nell'header segue comunque la sezione in vista.
    if ('IntersectionObserver' in window){
      var cio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting){
            chapterEl.textContent = e.target.dataset.chapter || '';
            var t = THEMES[e.target.dataset.theme];
            if (t){
              root.style.setProperty('--bg', t.bg);
              root.style.setProperty('--fg', t.fg);
              if (themeMeta) themeMeta.setAttribute('content', t.bg);
            }
          }
        });
      }, { rootMargin:'-50% 0px -50% 0px' });
      scenes.forEach(function(s){ cio.observe(s); });
    }
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  var hasSplit = !!window.SplitText;
  if (hasSplit) gsap.registerPlugin(SplitText);

  var EXPO = 'expo.out';

  // Smooth scroll con inerzia, agganciato al ticker di GSAP come nella home.
  if (window.Lenis){
    lenis = new window.Lenis({ lerp:0.09, smoothWheel:true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Copertina: il logo entra a sipario, poi vola nell'header ---------- */
  var hero = document.getElementById('hero');
  var heroLogo = document.getElementById('heroLogo');
  var heroWrap = heroLogo.parentNode;
  var heroTag = document.getElementById('heroTag');
  var hdrLogo = document.getElementById('hdrLogo');

  gsap.timeline({ defaults:{ ease:EXPO } })
    .fromTo(heroLogo, { clipPath:'inset(0 0 100% 0)', yPercent:12 }, { clipPath:'inset(0 0 0% 0)', yPercent:0, duration:1.6 }, .15)
    .from(heroTag, { opacity:0, y:24, duration:1.2 }, .7)
    .from('.hdr-nav > *', { opacity:0, y:-12, duration:1, stagger:.08 }, .8);

  // Posizione del logo nell'header rispetto a quella in copertina (la copertina è fissata durante il volo).
  function flight(){
    var h = hdrLogo.getBoundingClientRect();
    var w = heroWrap.getBoundingClientRect();
    var s = hero.getBoundingClientRect();
    return { x: h.left - (w.left - s.left), y: h.top - (w.top - s.top), scale: h.width / w.width };
  }
  var showHdr = false;
  gsap.to(heroLogo, {
    x: function(){ return flight().x; },
    y: function(){ return flight().y; },
    scale: function(){ return flight().scale; },
    ease: 'power2.inOut',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: '+=75%',
      pin: true,
      scrub: .6,
      invalidateOnRefresh: true,
      onUpdate: function(self){
        var done = self.progress > .985;
        if (done !== showHdr){
          showHdr = done;
          gsap.to(hdrLogo, { opacity: done ? 1 : 0, duration:.25, overwrite:true });
          gsap.to(heroLogo, { opacity: done ? 0 : 1, duration:.25, overwrite:'auto' });
        }
      }
    }
  });
  gsap.to(heroTag, { opacity:0, y:-30, ease:'none',
    scrollTrigger:{ trigger:hero, start:'top top', end:'+=40%', scrub:true } });

  /* ---------- Produzione: galleria orizzontale fissata (solo desktop) ----------
     Creata subito dopo il pin della copertina: i trigger delle sezioni successive
     devono essere calcolati tenendo conto dello spazio aggiunto dai pin. */
  var mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', function(){
    var track = document.getElementById('reelTrack');
    var distance = function(){ return Math.max(0, track.scrollWidth - window.innerWidth); };
    var pan = gsap.to(track, {
      x: function(){ return -distance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: '#produzione',
        start: 'top top',
        end: function(){ return '+=' + distance(); },
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true
      }
    });
    // Ogni immagine si scopre mentre attraversa lo schermo.
    gsap.utils.toArray('.reel-item').forEach(function(item){
      var inner = item.querySelector('img, video');
      gsap.fromTo(inner, { scale:1.2 }, { scale:1, ease:'none',
        scrollTrigger:{ trigger:item, containerAnimation:pan, start:'left right', end:'center center', scrub:true } });
    });
  });

  /* ---------- Titoli: righe che salgono da una maschera ---------- */
  // La maschera di ogni riga è alta quanto l'interlinea, che nei titoli è stretta:
  // senza questo spazio extra sotto, le lettere con la gamba (g, p, q) restano tagliate.
  function padMasks(lines){
    lines.forEach(function(line){
      var mask = line.parentNode;
      mask.style.paddingBottom = '.18em';
      mask.style.marginBottom = '-.18em';
    });
    return lines;
  }
  document.querySelectorAll('.split').forEach(function(el){
    var st = { trigger: el, start:'top 85%', once:true };
    if (hasSplit){
      SplitText.create(el, {
        type:'lines', mask:'lines', autoSplit:true,
        onSplit: function(self){
          return gsap.from(padMasks(self.lines), { yPercent:130, duration:1.3, stagger:.09, ease:EXPO, scrollTrigger:st });
        }
      });
    } else {
      gsap.from(el, { y:40, opacity:0, duration:1.2, ease:EXPO, scrollTrigger:st });
    }
  });

  gsap.utils.toArray('.reveal-up').forEach(function(el){
    gsap.from(el, { y:28, opacity:0, duration:1.1, ease:EXPO,
      scrollTrigger:{ trigger:el, start:'top 90%', once:true } });
  });

  /* ---------- Immagini: tendina dal basso + leggero parallasse ---------- */
  gsap.utils.toArray('.media-reveal').forEach(function(fig){
    var img = fig.querySelector('img, video');
    gsap.fromTo(fig, { clipPath:'inset(100% 0 0 0)' }, { clipPath:'inset(0% 0 0 0)', duration:1.5, ease:'expo.inOut',
      scrollTrigger:{ trigger:fig, start:'top 80%', once:true } });
    gsap.fromTo(img, { scale:1.18, yPercent:-6 }, { scale:1.06, yPercent:6, ease:'none',
      scrollTrigger:{ trigger:fig, start:'top bottom', end:'bottom top', scrub:true } });
  });

  /* ---------- Elenchi: le linee si disegnano, le voci seguono ---------- */
  gsap.utils.toArray('.rows').forEach(function(list){
    var rows = list.querySelectorAll('.row');
    var tl = gsap.timeline({ scrollTrigger:{ trigger:list, start:'top 80%', once:true } });
    rows.forEach(function(row, i){
      tl.fromTo(row, { '--line':0 }, { '--line':1, duration:1.2, ease:'expo.inOut' }, i * .12);
      tl.fromTo(row.querySelectorAll('dt, dd'), { y:24, opacity:0 }, { y:0, opacity:1, duration:1, ease:EXPO, stagger:.06 }, i * .12);
    });
  });
  gsap.utils.toArray('.plans .plan').forEach(function(plan, i){
    gsap.fromTo(plan, { '--line':0 }, { '--line':1, duration:1.4, ease:'expo.inOut', delay:i * .1,
      scrollTrigger:{ trigger:plan.parentNode, start:'top 80%', once:true } });
    gsap.from(plan.querySelectorAll('span'), { y:36, opacity:0, duration:1.2, ease:EXPO, stagger:.08, delay:i * .1,
      scrollTrigger:{ trigger:plan.parentNode, start:'top 80%', once:true } });
  });

  /* ---------- Metodo: la linea del percorso si riempie scorrendo ---------- */
  var steps = document.getElementById('steps');
  gsap.fromTo(steps, { '--progress':0 }, { '--progress':1, ease:'none',
    scrollTrigger:{ trigger:steps, start:'top 70%', end:'bottom 45%', scrub:true } });

  /* ---------- Manifesto: entrata unica, non legata allo scroll ----------
     Il titolo sale riga per riga, la foto si scopre dal basso mentre si assesta,
     poi arriva la didascalia. Parte una volta sola e si completa sempre. */
  var localeLines = hasSplit
    ? padMasks(SplitText.create('#localeTitle', { type:'lines', mask:'lines' }).lines)
    : [document.getElementById('localeTitle')];
  gsap.timeline({ scrollTrigger:{ trigger:'#locale', start:'top 60%', once:true }, defaults:{ ease:EXPO } })
    .from(localeLines, { yPercent:130, duration:1.3, stagger:.1 }, 0)
    .fromTo('#localeMedia', { clipPath:'inset(100% 0 0 0)' }, { clipPath:'inset(0% 0 0 0)', duration:1.6, ease:'expo.inOut' }, .25)
    .fromTo('#localeMedia img', { scale:1.3 }, { scale:1, duration:2.2 }, .25)
    .from('#localeCaption', { y:20, opacity:0, duration:1.1 }, 1.2);

  /* ---------- Chiusura: il logo si ricompone ---------- */
  gsap.fromTo('#endLogo', { clipPath:'inset(0 100% 0 0)' }, { clipPath:'inset(0 0% 0 0)', duration:1.6, ease:'expo.inOut',
    scrollTrigger:{ trigger:'#parliamone', start:'top 60%', once:true } });

  /* ---------- Cambio colore tra le sezioni ----------
     Lo sfondo è uno solo (body): quando una sezione supera metà schermo,
     i colori della pagina scivolano sul suo tema, come il cambio slide del Keynote. */
  var currentTheme = null;
  function applyTheme(scene, instant){
    var name = scene.dataset.theme;
    chapterEl.textContent = scene.dataset.chapter || '';
    if (name === currentTheme) return;
    currentTheme = name;
    var t = THEMES[name];
    gsap.to(root, { '--bg':t.bg, '--fg':t.fg, '--accent':t.accent, duration: instant ? 0 : .9, ease:'power2.inOut', overwrite:true });
    if (themeMeta) themeMeta.setAttribute('content', t.bg);
  }
  // La sezione attiva è l'ultima il cui inizio ha superato il 55% dello schermo:
  // così le sezioni fissate (copertina, galleria) tengono il colore per tutto il pin,
  // anche nei salti lunghi (link interni, tasto Fine).
  var sceneStarts = scenes.map(function(scene){
    return ScrollTrigger.create({ trigger: scene, start: 'top 55%' });
  });
  function pickScene(self){
    var y = self.scroll(), active = scenes[0];
    sceneStarts.forEach(function(t, i){ if (y >= t.start) active = scenes[i]; });
    applyTheme(active);
  }
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: pickScene, onRefresh: pickScene });
  applyTheme(scenes[0], true);

  // Le immagini lazy cambiano le altezze: ricalcolo dopo il caricamento completo.
  window.addEventListener('load', function(){ ScrollTrigger.refresh(); });
})();
