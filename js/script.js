/* ============================================================
   NAUB — Not An Usual Brand
   Script principale (vanilla JS, nessuna dipendenza esterna)
   ============================================================ */
(function(){
  "use strict";

  document.getElementById('year').textContent = new Date().getFullYear();

  function reduceMotionCheck(){ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // Hero background video: only autoplay when motion is welcome, otherwise
  // it just sits on its poster frame.
  var heroVideo = document.getElementById('heroVideo');
  if (heroVideo && !reduceMotionCheck()){
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
  var revealEls = document.querySelectorAll('.reveal, .grid-4, .portfolio-grid, .team-grid');
  function revealTarget(target){
    if (target.matches('.grid-4, .portfolio-grid, .team-grid')){
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
      var progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;

      pinCards.forEach(function(card, i){
        var delay = i * 0.12;
        var p = clamp((progress - delay) / 0.35, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        card.style.opacity = eased;
        card.style.transform = 'translateY(' + ((1 - eased) * 70) + 'px)';
      });

      var travel = 120;
      var offset = (0.5 - progress) * travel;
      if (blendText) blendText.style.transform = 'translateY(' + offset + 'vh)';
    }
    window.addEventListener('scroll', onPinScroll, {passive:true});
    window.addEventListener('resize', onPinScroll);
    onPinScroll();
  }

  // Portfolio data + overlay
  var projects = {
    streetwear1: {
      tag: 'Direzione Creativa · Format dimostrativo',
      title: 'Streetwear Capsule — Look 01',
      goal: 'Raccontare una capsule streetwear con un\'estetica cinematografica, lontana dai codici del classico still life prodotto.',
      solution: 'Styling, scelta della scenografia vintage e direzione posa per costruire un\'ambientazione editoriale coerente con l\'identità del brand.',
      stack: 'Direzione creativa · Fotografia · Styling',
      img: 'assets/foto/IMG_4180.PNG',
      alt: 'Streetwear capsule, look editoriale in studio',
      pos: 'center 15%'
    },
    streetwear2: {
      tag: 'Direzione Creativa · Format dimostrativo',
      title: 'Streetwear Capsule — Look 02',
      goal: 'Completare la narrazione visiva della capsule con un secondo look, mantenendo coerenza di scenografia e palette.',
      solution: 'Stessa produzione, seconda uscita: continuità di luce, colore e composizione per una serie editoriale coesa.',
      stack: 'Direzione creativa · Fotografia · Post-produzione',
      img: 'assets/foto/IMG_4182.PNG',
      alt: 'Streetwear capsule, secondo look editoriale in studio',
      pos: 'center 20%'
    },
    ritratto: {
      tag: 'Fotografia · Format dimostrativo',
      title: 'Ritratto Editoriale',
      goal: 'Costruire un immaginario riconoscibile per un brand emergente, con un linguaggio più vicino all\'editoriale moda che alla campagna prodotto classica.',
      solution: 'Shooting on-location con luce naturale, ricerca della location e color grading dedicato in post-produzione.',
      stack: 'Fotografia · Color grading · Location scouting',
      img: 'assets/foto/IMG_4170.PNG',
      alt: 'Ritratto editoriale moda su fondale urbano',
      pos: 'center 15%'
    },
    retail: {
      tag: 'Content · Format dimostrativo',
      title: 'Apertura Concept Store',
      goal: 'Documentare l\'apertura di un concept store multibrand valorizzando il visual merchandising in vetrina.',
      solution: 'Reportage fotografico della facciata e degli allestimenti interni, in coordinamento con i brand ospitati nello spazio.',
      stack: 'Fotografia · Reportage · Content per social',
      img: 'assets/foto/IMG_4178.PNG',
      alt: 'Vetrina di un concept store multibrand',
      pos: 'center center'
    },
    product: {
      tag: 'Fotografia · Format dimostrativo',
      title: 'Product Still Life',
      goal: 'Valorizzare un pezzo iconico per una campagna prodotto destinata a e-commerce e social.',
      solution: 'Composizione still life in luce naturale, dettaglio in primo piano e post-produzione dedicata a colore e texture.',
      stack: 'Still life · Fotografia prodotto · Retouching',
      img: 'assets/foto/IMG_4179.PNG',
      alt: 'Still life prodotto, sneaker in primo piano',
      pos: 'center center'
    },
    live: {
      tag: 'Content · Format dimostrativo',
      title: 'Live & Music Coverage',
      goal: 'Documentare un live set con un linguaggio fotografico da concerto, tra energia sul palco e atmosfera del backstage.',
      solution: 'Copertura fotografica dal pit e dal backstage in condizioni di bassa luce, con selezione ed editing rapido per i canali social dell\'artista.',
      stack: 'Fotografia live · Bassa luce · Editing rapido',
      img: 'assets/foto/IMG_4167.PNG',
      alt: 'Copertura fotografica di un live set',
      pos: 'center 18%'
    }
  };

  var overlay = document.getElementById('overlay');
  var overlayClose = document.getElementById('overlayClose');
  var lastFocused = null;

  function openProject(key){
    var p = projects[key];
    if (!p) return;
    document.getElementById('overlayTag').textContent = p.tag;
    document.getElementById('overlayTitle').textContent = p.title;
    document.getElementById('overlayGoal').textContent = p.goal;
    document.getElementById('overlaySolution').textContent = p.solution;
    document.getElementById('overlayStack').textContent = p.stack;
    var img = document.getElementById('overlayImg');
    img.src = p.img;
    img.alt = p.alt;
    img.style.objectPosition = p.pos || 'center center';
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    overlayClose.focus();
    document.body.style.overflow = 'hidden';
    if (history.pushState) { history.pushState(null, '', '#progetto-' + key); }
  }
  function closeOverlay(){
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
    if (history.pushState) { history.pushState(null, '', '#lavori'); }
  }

  document.querySelectorAll('.proj-card[data-project]').forEach(function(card){
    card.addEventListener('click', function(){ openProject(card.getAttribute('data-project')); });
  });
  overlayClose.addEventListener('click', closeOverlay);
  overlay.addEventListener('click', function(e){ if (e.target === overlay) closeOverlay(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay(); });

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
