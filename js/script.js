/* ============================================================
   NAUB — Not An Usual Brand
   Script principale.
   Il motion usa GSAP (+ ScrollTrigger, SplitText) e Lenis da CDN; se non sono
   disponibili, o se il visitatore ha "riduci movimento" attivo, si torna alle
   animazioni CSS/IntersectionObserver di riserva (classe .no-gsap su <html>).
   ============================================================ */
(function(){
  "use strict";

  var root = document.documentElement;
  document.getElementById('year').textContent = new Date().getFullYear();

  function reduceMotionCheck(){ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var useGsap = !!(window.gsap && window.ScrollTrigger) && !reduceMotionCheck() && !root.classList.contains('no-gsap');
  root.classList.add(useGsap ? 'gsap' : 'no-gsap');
  if (!useGsap) root.classList.remove('gsap');

  // Hero background video: deve sempre partire, anche con "riduci movimento" attivo.
  var heroVideo = document.getElementById('heroVideo');
  if (heroVideo){
    heroVideo.play().catch(function(){});
  }

  // Smooth scroll con inerzia (solo rotella/trackpad: su touch resta lo scroll nativo).
  var lenis = null;
  if (useGsap && window.Lenis){
    lenis = new window.Lenis({ lerp:0.09, wheelMultiplier:1, smoothWheel:true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // Link interni: scorrimento morbido tenendo conto dell'header fisso.
  var headerEl = document.querySelector('header');
  var sheet = document.getElementById('mobileSheet');
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href');
      var target = id === '#top' ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      // Il menu mobile ferma Lenis: va chiuso prima di scorrere, altrimenti lo scroll viene ignorato.
      if (sheet && sheet.classList.contains('open')) closeSheet();
      var offset = id === '#top' ? 0 : -(headerEl ? headerEl.offsetHeight : 0);
      if (lenis){
        lenis.scrollTo(id === '#top' ? 0 : target, { offset:offset, duration:1.4 });
      } else {
        var y = id === '#top' ? 0 : target.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top:y, behavior: reduceMotionCheck() ? 'auto' : 'smooth' });
      }
    });
  });

  // Mobile nav (apertura a tendina con clip-path, gestita in CSS)
  var toggle = document.getElementById('navToggle');
  var close = document.getElementById('navClose');
  function openSheet(){
    sheet.classList.add('open');
    toggle.setAttribute('aria-expanded','true');
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
  }
  function closeSheet(){
    sheet.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
    if (lenis) lenis.start();
    document.body.style.overflow = '';
  }
  toggle && toggle.addEventListener('click', openSheet);
  close && close.addEventListener('click', closeSheet);
  sheet && sheet.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeSheet); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet(); });

  // Bottoni: l'etichetta viene duplicata per l'effetto "roll" in hover.
  // Il bottone di invio del form è escluso perché il suo testo cambia durante l'invio.
  document.querySelectorAll('.btn').forEach(function(btn){
    if (btn.type === 'submit' || btn.querySelector('.btn-roll')) return;
    var label = btn.textContent.trim();
    btn.textContent = '';
    var roll = document.createElement('span');
    roll.className = 'btn-roll';
    var a = document.createElement('span'); a.textContent = label;
    var b = document.createElement('span'); b.textContent = label; b.setAttribute('aria-hidden','true');
    roll.appendChild(a); roll.appendChild(b);
    btn.appendChild(roll);
  });

  // Card: la luce interna segue il cursore.
  if (finePointer){
    document.querySelectorAll('.card').forEach(function(card){
      card.addEventListener('pointermove', function(e){
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  // ------------------------------------------------------------
  // Fallback senza GSAP: reveal con IntersectionObserver (comportamento originale).
  // ------------------------------------------------------------
  function initFallbackReveals(){
    var revealEls = document.querySelectorAll('.reveal, .grid-4, .portfolio-grid, .team-grid, .folder-stack');
    function revealTarget(target){
      if (target.matches('.grid-4, .portfolio-grid, .team-grid, .folder-stack')){
        Array.prototype.forEach.call(target.children, function(child, idx){
          setTimeout(function(){ child.classList.add('in'); }, idx * 90);
        });
      } else {
        target.classList.add('in');
      }
    }
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting){ revealTarget(entry.target); io.unobserve(entry.target); }
        });
      }, {threshold:0.15});
      revealEls.forEach(function(el){ io.observe(el); });
    } else {
      revealEls.forEach(function(el){ revealTarget(el); });
    }
  }

  function initFallbackPin(){
    var pinWrap = document.getElementById('pinWrap');
    if (!pinWrap || reduceMotionCheck()) return;
    var pinCards = pinWrap.querySelectorAll('.pin-card');
    var blendText = document.getElementById('blendText');
    function onPinScroll(){
      var rect = pinWrap.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var progress = total > 0 ? clamp((window.innerHeight - rect.top) / (window.innerHeight + total), 0, 1) : 0;
      pinCards.forEach(function(card, i){
        var delay = 0.1 + i * 0.12;
        var p = clamp((progress - delay) / 0.35, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        card.style.opacity = eased;
        card.style.transform = 'translateY(' + ((1 - eased) * 70) + 'px)';
      });
      var isMobile = window.innerWidth <= 700;
      var startOffset = isMobile ? 55 : 110;
      var endOffset = isMobile ? -85 : -110;
      var logoProgress = clamp((progress - 0.4) / 0.5, 0, 1);
      if (blendText) blendText.style.transform = 'translateY(' + (startOffset + (endOffset - startOffset) * logoProgress) + 'vh)';
    }
    var ticking = false;
    function throttled(){
      if (!ticking){ ticking = true; requestAnimationFrame(function(){ onPinScroll(); ticking = false; }); }
    }
    window.addEventListener('scroll', throttled, {passive:true});
    window.addEventListener('resize', throttled);
    onPinScroll();
  }

  // ------------------------------------------------------------
  // Motion GSAP
  // ------------------------------------------------------------
  function initGsap(){
    gsap.registerPlugin(ScrollTrigger);
    var hasSplit = !!window.SplitText;
    if (hasSplit) gsap.registerPlugin(SplitText);
    var EXPO = 'expo.out';
    var mm = gsap.matchMedia();

    // Header: si nasconde scendendo, ricompare appena si risale.
    if (headerEl){
      var headerShown = true;
      ScrollTrigger.create({
        start:0, end:'max',
        onUpdate:function(self){
          var y = self.scroll();
          var show = self.direction < 0 || y < 160 || (sheet && sheet.classList.contains('open'));
          if (show !== headerShown){
            headerShown = show;
            gsap.to(headerEl, { yPercent: show ? 0 : -105, duration: show ? .6 : .45, ease: show ? EXPO : 'power2.in', overwrite:true });
          }
        }
      });
    }

    // --- Hero: momento d'autore. Il video si apre da una cornice, il titolo sale parola per parola.
    var heroTitle = document.getElementById('heroTitle');
    var heroMedia = document.getElementById('heroMedia');
    var heroCta = document.querySelector('.hero-ctas');
    var heroSplit = hasSplit ? new SplitText(heroTitle, { type:'lines,words', mask:'lines', linesClass:'split-mask' }) : null;
    gsap.set(heroTitle, { opacity:1 });
    gsap.set(heroCta, { opacity:1 });
    // Gli stati iniziali di video e marquee sono già impostati in CSS (niente flash al primo paint).
    var intro = gsap.timeline({ defaults:{ ease:EXPO } });
    intro
      .fromTo(heroMedia, { clipPath:'inset(14% 10% 14% 10% round 28px)', scale:1.12 },
                         { clipPath:'inset(0% 0% 0% 0% round 0px)', scale:1, duration:1.7, ease:'expo.inOut' }, 0)
      .from(heroSplit ? heroSplit.words : heroTitle, { yPercent:115, rotate:3, duration:1.25, stagger:.07 }, .75)
      .from(heroCta, { y:24, opacity:0, duration:1 }, 1.25)
      .fromTo('.marquee-wrap', { opacity:0 }, { opacity:1, duration:1 }, 1.1);

    // Uscita della hero mentre si scorre: il video scende più lento del contenuto.
    gsap.to('.hero-video', { yPercent:14, scale:1.08, ease:'none',
      scrollTrigger:{ trigger:'.hero', start:'top top', end:'bottom top', scrub:true } });
    gsap.to('.hero-copy', { yPercent:-30, opacity:.15, ease:'none',
      scrollTrigger:{ trigger:'.hero', start:'center center', end:'bottom top', scrub:true } });

    // --- Marquee servizi: loop infinito che accelera e cambia verso con lo scroll.
    var marquee = document.getElementById('marquee');
    if (marquee){
      var loop = gsap.to(marquee, { xPercent:-50, duration:28, ease:'none', repeat:-1 });
      var dir = 1;
      ScrollTrigger.create({
        trigger:'.marquee-wrap', start:'top bottom', end:'bottom top',
        onUpdate:function(self){
          dir = self.direction;
          var boost = clamp(Math.abs(self.getVelocity()) / 220, 0, 6);
          gsap.to(loop, { timeScale: dir * (1 + boost), duration:.25, overwrite:true });
          gsap.to(loop, { timeScale: dir, duration:1.2, delay:.25, ease:'power2.out' });
          gsap.to(marquee.children, { skewX: -dir * clamp(boost * 2.2, 0, 10), duration:.3, overwrite:true });
          gsap.to(marquee.children, { skewX:0, duration:1, delay:.25, ease:'power3.out' });
        }
      });
    }

    // --- Stage pinnato: le foto si aprono dal basso con la maschera, il logo attraversa lo stage.
    var pinWrap = document.getElementById('pinWrap');
    if (pinWrap){
      var pinCards = pinWrap.querySelectorAll('.pin-card');
      var blendText = document.getElementById('blendText');
      var pinTl = gsap.timeline({
        defaults:{ ease:'none' },
        scrollTrigger:{ trigger:pinWrap, start:'top bottom', end:'bottom bottom', scrub:0.6, invalidateOnRefresh:true }
      });
      pinCards.forEach(function(card, i){
        var at = 0.1 + i * 0.12;
        pinTl.fromTo(card, { clipPath:'inset(100% 0% 0% 0% round 18px)', y:90 },
                           { clipPath:'inset(0% 0% 0% 0% round 18px)', y:0, duration:.35, ease:'power3.out' }, at);
        pinTl.fromTo(card.querySelector('img'), { scale:1.35 }, { scale:1, duration:.5, ease:'power2.out' }, at);
        // Dopo l'entrata le tre foto proseguono a velocità diverse: profondità.
        pinTl.to(card, { y: [-40, -90, -60][i] || -50, duration:1 - at - .35 }, at + .35);
      });
      if (blendText){
        pinTl.fromTo(blendText,
          { y:function(){ return window.innerHeight * (window.innerWidth <= 700 ? .55 : 1.1); } },
          { y:function(){ return window.innerHeight * (window.innerWidth <= 700 ? -.85 : -1.1); }, duration:.5 }, .4);
      }
      pinTl.to({}, { duration:.1 }, .9);
    }

    // --- Manifesto: le parole si "accendono" seguendo lo scroll.
    var manifestoParas = document.querySelectorAll('#manifesto .hero-sub:not(.hero-tagline)');
    if (manifestoParas.length && hasSplit){
      var words = [];
      manifestoParas.forEach(function(p){ words = words.concat(new SplitText(p, { type:'words' }).words); });
      gsap.fromTo(words, { opacity:.14 }, {
        opacity:1, ease:'none', stagger:.1,
        scrollTrigger:{ trigger:'#manifesto', start:'top 82%', end:'center 45%', scrub:true }
      });
    }
    var tagline = document.querySelector('#manifesto .hero-tagline');
    if (tagline){
      var tagSplit = hasSplit ? new SplitText(tagline, { type:'lines', mask:'lines', linesClass:'split-mask' }) : null;
      gsap.from(tagSplit ? tagSplit.lines : tagline, {
        yPercent:110, duration:1.2, ease:EXPO, stagger:.12,
        scrollTrigger:{ trigger:tagline, start:'top 85%' }
      });
    }

    // --- Titoli di sezione: righe che salgono da dietro una maschera, poi il sottotitolo.
    document.querySelectorAll('.section-head').forEach(function(head){
      var h2 = head.querySelector('h2');
      var rest = head.querySelectorAll(':scope > :not(h2)');
      var tl = gsap.timeline({ scrollTrigger:{ trigger:head, start:'top 85%' }, defaults:{ ease:EXPO } });
      if (h2){
        var s = hasSplit ? new SplitText(h2, { type:'lines', mask:'lines', linesClass:'split-mask' }) : null;
        tl.from(s ? s.lines : h2, { yPercent:110, duration:1.2, stagger:.1 });
      }
      if (rest.length) tl.from(rest, { y:24, opacity:0, duration:1 }, .3);
    });

    // --- Sezioni scure: si aprono da una cornice arrotondata mentre entrano (continuità bianco → nero).
    mm.add('(min-width: 561px)', function(){
      ['#studio', '#risultati'].forEach(function(sel){
        gsap.fromTo(sel,
          { clipPath:'inset(0% 3.5% 0% 3.5% round 36px)' },
          { clipPath:'inset(0% 0% 0% 0% round 0px)', ease:'none',
            scrollTrigger:{ trigger:sel, start:'top bottom', end:'top 25%', scrub:true } });
      });
    });

    // --- Card servizi in cascata.
    gsap.from('#studio .card', {
      y:80, opacity:0, duration:1.1, ease:EXPO, stagger:.09, clearProps:'transform,opacity',
      scrollTrigger:{ trigger:'#studio .grid-4', start:'top 85%' }
    });

    // --- Collage: la striscia di foto si apre dal centro.
    gsap.fromTo('.collage-marquee-outer',
      { clipPath:'inset(8% 22% 8% 22% round 24px)' },
      { clipPath:'inset(0% 0% 0% 0% round 0px)', ease:'none',
        scrollTrigger:{ trigger:'#collageWrap', start:'top bottom', end:'center 55%', scrub:true } });

    // --- Risultati: badge, statistica e screenshot "a faldone" che cadono in pila.
    gsap.from('#risultati .partner-badge', { scale:.85, opacity:0, duration:1.1, ease:EXPO,
      scrollTrigger:{ trigger:'#risultati .split', start:'top 80%' } });
    gsap.from('#orbitBadge', { y:40, opacity:0, duration:1.1, ease:EXPO, delay:.1,
      scrollTrigger:{ trigger:'#risultati .split', start:'top 80%' } });
    gsap.from('.folder-item', {
      y:120, rotate:function(i){ return i % 2 ? 4 : -4; }, opacity:0, duration:1.2, ease:EXPO, stagger:.1,
      clearProps:'transform,opacity',
      scrollTrigger:{ trigger:'.folder-stack', start:'top 80%' }
    });
    gsap.from('.partner-logo-tile', { y:30, opacity:0, duration:1, ease:EXPO, stagger:.08,
      scrollTrigger:{ trigger:'.partner-logos', start:'top 92%' } });

    // --- Contatti.
    gsap.from('.contact-list li', { x:-30, opacity:0, duration:1, ease:EXPO, stagger:.08,
      scrollTrigger:{ trigger:'.contact-list', start:'top 85%' } });
    gsap.from('.form-card', { y:60, opacity:0, duration:1.2, ease:EXPO,
      scrollTrigger:{ trigger:'.form-card', start:'top 88%' } });

    // --- Team (sezione nascosta, pronta se riattivata).
    gsap.from('.team-photo-card', { y:60, opacity:0, duration:1.1, ease:EXPO, stagger:.1,
      scrollTrigger:{ trigger:'.team-grid', start:'top 85%' } });

    // --- Footer.
    gsap.from('.footer-top > *', { y:30, opacity:0, duration:1, ease:EXPO, stagger:.1,
      scrollTrigger:{ trigger:'footer', start:'top 90%' } });

    // --- Bottoni magnetici (solo mouse).
    if (finePointer){
      document.querySelectorAll('.btn-primary').forEach(function(btn){
        var xTo = gsap.quickTo(btn, 'x', { duration:.6, ease:'elastic.out(1, .45)' });
        var yTo = gsap.quickTo(btn, 'y', { duration:.6, ease:'elastic.out(1, .45)' });
        btn.addEventListener('pointermove', function(e){
          var r = btn.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * .25);
          yTo((e.clientY - r.top - r.height / 2) * .35);
        });
        btn.addEventListener('pointerleave', function(){ xTo(0); yTo(0); });
      });

      // Cursore follower: cresce sopra link, bottoni e immagini cliccabili.
      var dot = document.getElementById('cursorDot');
      if (dot){
        var dx = gsap.quickTo(dot, 'x', { duration:.35, ease:'power3.out' });
        var dy = gsap.quickTo(dot, 'y', { duration:.35, ease:'power3.out' });
        window.addEventListener('pointermove', function(e){
          dot.classList.add('is-visible');
          dx(e.clientX); dy(e.clientY);
        }, { passive:true });
        document.addEventListener('pointerleave', function(){ dot.classList.remove('is-visible'); });
        document.addEventListener('pointerover', function(e){
          dot.classList.toggle('is-hover', !!e.target.closest('a, button, .folder-item, .card'));
        });
      }
    }

    // Le misure delle righe dipendono dai font: ricalcola quando sono pronti.
    if (document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ ScrollTrigger.refresh(); });
    }
    window.addEventListener('load', function(){ ScrollTrigger.refresh(); });
  }

  if (useGsap){
    // SplitText misura le righe: aspetta i font (con un tetto, per non bloccare l'intro).
    var started = false;
    var start = function(){ if (started) return; started = true; initGsap(); };
    if (document.fonts && document.fonts.ready){
      document.fonts.ready.then(start);
      setTimeout(start, 1200);
    } else {
      start();
    }
  } else {
    initFallbackReveals();
    initFallbackPin();
  }

  // ------------------------------------------------------------
  // Stat "Ordini generati": quando la sezione Risultati entra in vista, la card
  // fa fade-up e il contatore sale rapidamente da 0 a 350.000; dopodiché continua
  // a incrementarsi con un effetto di sostituzione dal basso.
  // ------------------------------------------------------------
  var orbitBadge = document.getElementById('orbitBadge');
  var liveOrdersCounter = document.getElementById('liveOrdersCounter');
  var ORDERS_TARGET = 350000;

  function formatOrders(n){ return Math.round(n).toLocaleString('it-IT'); }

  function rollCounterTo(el, newText){
    el.style.transition = 'transform .35s cubic-bezier(.16,1,.3,1), opacity .35s ease';
    el.style.transform = 'translateY(-100%)';
    el.style.opacity = '0';
    setTimeout(function(){
      el.style.transition = 'none';
      el.textContent = newText;
      el.style.transform = 'translateY(100%)';
      el.style.opacity = '0';
      void el.offsetWidth; // forza il reflow, altrimenti il browser unisce i due stati
      el.style.transition = 'transform .35s cubic-bezier(.16,1,.3,1), opacity .35s ease';
      el.style.transform = 'translateY(0)';
      el.style.opacity = '1';
    }, 350);
  }

  function startOrdersLoop(){
    if (!liveOrdersCounter) return;
    var count = ORDERS_TARGET;
    function scheduleNext(){
      var delay = 400 + Math.random() * 2600; // intervallo casuale tra 0.4s e 3s
      setTimeout(function(){
        var increment = 1 + Math.floor(Math.random() * 14); // incremento casuale tra 1 e 14
        count += increment;
        rollCounterTo(liveOrdersCounter, formatOrders(count));
        scheduleNext();
      }, delay);
    }
    scheduleNext();
  }

  function runResultsIntro(){
    if (orbitBadge) orbitBadge.classList.add('in');
    if (!liveOrdersCounter){ return; }
    if (reduceMotionCheck()){
      liveOrdersCounter.textContent = formatOrders(ORDERS_TARGET);
      startOrdersLoop();
      return;
    }
    var duration = 1800;
    var start = null;
    function tick(ts){
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      liveOrdersCounter.textContent = formatOrders(eased * ORDERS_TARGET);
      if (p < 1){
        requestAnimationFrame(tick);
      } else {
        startOrdersLoop();
      }
    }
    requestAnimationFrame(tick);
  }

  if (orbitBadge){
    if ('IntersectionObserver' in window){
      var resultsIo = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting){ runResultsIntro(); resultsIo.unobserve(entry.target); }
        });
      }, {threshold:0.4});
      resultsIo.observe(orbitBadge);
    } else {
      runResultsIntro();
    }
  }

  // Stack "a faldone": un click porta la foto in primo piano e scurisce le altre, non più l'hover.
  document.querySelectorAll('.folder-stack').forEach(function(stack){
    stack.querySelectorAll('.folder-item').forEach(function(item){
      item.addEventListener('click', function(){
        var alreadyActive = item.classList.contains('active');
        stack.querySelectorAll('.folder-item.active').forEach(function(a){ a.classList.remove('active'); });
        if (alreadyActive){
          stack.classList.remove('has-active');
        } else {
          item.classList.add('active');
          stack.classList.add('has-active');
        }
      });
    });
  });

  // Contact form -> invio reale via contact.php
  var form = document.getElementById('contactForm');
  var formError = document.getElementById('formError');

  // Timestamp di caricamento pagina, usato dal server per scartare submit troppo rapide (bot)
  var loadedAtField = document.getElementById('cf-loaded-at');
  if (loadedAtField) loadedAtField.value = Date.now();

  var contactErrorMessages = {
    too_fast: 'Invio troppo rapido, riprova tra qualche secondo.',
    too_many_requests: 'Hai raggiunto il numero massimo di richieste. Riprova più tardi o scrivici a info@naub.it.'
  };

  function showFormError(msg){
    if (!formError){ alert(msg); return; }
    formError.textContent = msg;
    formError.hidden = false;
    if (useGsap) gsap.fromTo(formError, { y:-8, opacity:0 }, { y:0, opacity:1, duration:.5, ease:'expo.out' });
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso...';
    if (formError) formError.hidden = true;

    fetch('contact.php', {
      method: 'POST',
      body: new FormData(form)
    })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (data.ok) {
          // Il messaggio di successo sta dentro il form: si nascondono solo i campi.
          Array.prototype.forEach.call(form.children, function(c){ c.hidden = c.id !== 'formSuccess'; });
          document.getElementById('formSuccess').hidden = false;
        } else {
          throw new Error(data.error || 'send_failed');
        }
      })
      .catch(function(err){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Invia richiesta';
        showFormError(contactErrorMessages[err.message] || 'Invio non riuscito. Riprova o scrivici direttamente a info@naub.it.');
      });
  });
})();
