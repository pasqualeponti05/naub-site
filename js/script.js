/* ============================================================
   NAUB — Not An Usual Brand
   Script principale (vanilla JS, nessuna dipendenza esterna)
   ============================================================ */
(function(){
  "use strict";

  document.getElementById('year').textContent = new Date().getFullYear();

  function reduceMotionCheck(){ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // Hero background video: deve sempre partire, anche con "riduci movimento" attivo.
  var heroVideo = document.getElementById('heroVideo');
  if (heroVideo){
    heroVideo.play().catch(function(){});
  }

  // Mobile nav
  var sheet = document.getElementById('mobileSheet');
  var toggle = document.getElementById('navToggle');
  var close = document.getElementById('navClose');
  function openSheet(){ sheet.classList.add('open'); toggle.setAttribute('aria-expanded','true'); }
  function closeSheet(){ sheet.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }
  toggle && toggle.addEventListener('click', openSheet);
  close && close.addEventListener('click', closeSheet);
  sheet && sheet.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeSheet); });

  // Reveal on scroll: simple blocks fade up immediately, card grids stagger
  // child-by-child (same technique as the reference demo: index * 90ms via setTimeout).
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

  // Magnetic 3D tilt on the header pill buttons
  if (!reduceMotionCheck() && window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    document.querySelectorAll('[data-tilt]').forEach(function(pill){
      pill.addEventListener('mousemove', function(e){
        var r = pill.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        var rotY = (x / r.width) * 26;
        var rotX = -(y / r.height) * 26;
        pill.style.transform = 'perspective(300px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) scale(1.06)';
      });
      pill.addEventListener('mouseleave', function(){ pill.style.transform = ''; });
    });
  }

  // Pinned manifesto stage: cards fade/rise in sequence and the giant blend-text
  // scrolls through the stage as the visitor scrolls past this section.
  var pinWrap = document.getElementById('pinWrap');
  if (pinWrap && !reduceMotionCheck()){
    var pinCards = pinWrap.querySelectorAll('.pin-card');
    var blendText = document.getElementById('blendText');
    function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
    function onPinScroll(){
      var rect = pinWrap.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      // Il progresso parte già mentre la sezione entra in vista da sotto (non solo
      // una volta agganciata in cima), cosi le foto compaiono prima.
      var progress = total > 0 ? clamp((window.innerHeight - rect.top) / (window.innerHeight + total), 0, 1) : 0;

      pinCards.forEach(function(card, i){
        var delay = 0.1 + i * 0.12;
        var p = clamp((progress - delay) / 0.35, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        card.style.opacity = eased;
        card.style.transform = 'translateY(' + ((1 - eased) * 70) + 'px)';
      });

      var travel = 220;
      var logoProgress = clamp((progress - 0.4) / 0.5, 0, 1);
      var offset = (0.5 - logoProgress) * travel;
      if (blendText) blendText.style.transform = 'translateY(' + offset + 'vh)';
    }
    var pinTicking = false;
    function onPinScrollThrottled(){
      if (!pinTicking){
        pinTicking = true;
        requestAnimationFrame(function(){ onPinScroll(); pinTicking = false; });
      }
    }
    window.addEventListener('scroll', onPinScrollThrottled, {passive:true});
    window.addEventListener('resize', onPinScrollThrottled);
    onPinScroll();
  }

  // Collage foto: la pagina scorre normalmente, ma la sezione resta pinnata
  // mentre le foto si susseguono con uno slide verticale, tipo reel Instagram/TikTok.
  var collageWrap = document.getElementById('collageWrap');
  if (collageWrap && !reduceMotionCheck()){
    var collagePhotos = collageWrap.querySelectorAll('.collage-item');
    var collageCount = collagePhotos.length;
    function collageClamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
    function onCollageScroll(){
      var rect = collageWrap.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var progress = total > 0 ? collageClamp(-rect.top / total, 0, 1) : 0;
      var pos = progress * (collageCount - 1);
      var activeIdx = collageClamp(Math.floor(pos), 0, collageCount - 2 < 0 ? 0 : collageCount - 2);
      var frac = collageCount > 1 ? collageClamp(pos - activeIdx, 0, 1) : 0;

      collagePhotos.forEach(function(item, i){
        var y, scale, dim, op;
        if (i <= activeIdx){
          // Foto già posizionate: restano ferme e vengono progressivamente coperte da quella sopra.
          y = 0; scale = 1; op = 1; dim = (i === activeIdx) ? frac * 0.4 : 0;
        } else if (i === activeIdx + 1){
          // Foto in ingresso: scivola dal basso, dissolvendo in vista, e va sopra quella attuale.
          y = (1 - frac) * 100; scale = 1.08 - frac * 0.08; op = frac; dim = 0;
        } else {
          y = 100; scale = 1.08; op = 0; dim = 0;
        }
        item.style.transform = 'translateY(' + y + '%) scale(' + scale + ')';
        item.style.opacity = op;
        item.style.filter = 'brightness(' + (1 - dim) + ')';
        item.style.zIndex = i;
      });
    }
    window.addEventListener('scroll', onCollageScroll, {passive:true});
    window.addEventListener('resize', onCollageScroll);
    onCollageScroll();
  }

  // Stat "Ordini generati": quando la sezione Risultati entra in vista, la card
  // fa fade-up e il contatore sale rapidamente da 0 a 350.000; dopodiché continua
  // a incrementarsi con un effetto di sostituzione dal basso.
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

  // Timestamp di caricamento pagina, usato dal server per scartare submit troppo rapide (bot)
  var loadedAtField = document.getElementById('cf-loaded-at');
  if (loadedAtField) loadedAtField.value = Date.now();

  var contactErrorMessages = {
    too_fast: 'Invio troppo rapido, riprova tra qualche secondo.',
    too_many_requests: 'Hai raggiunto il numero massimo di richieste. Riprova più tardi o scrivici a info@naub.it.'
  };

  form.addEventListener('submit', function(e){
    e.preventDefault();

    var submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio in corso...';

    fetch('contact.php', {
      method: 'POST',
      body: new FormData(form)
    })
      .then(function(res){ return res.json(); })
      .then(function(data){
        if (data.ok) {
          form.hidden = true;
          document.getElementById('formSuccess').hidden = false;
        } else {
          throw new Error(data.error || 'send_failed');
        }
      })
      .catch(function(err){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Invia richiesta';
        var msg = contactErrorMessages[err.message] || 'Invio non riuscito. Riprova o scrivici direttamente a info@naub.it.';
        alert(msg);
      });
  });
})();
