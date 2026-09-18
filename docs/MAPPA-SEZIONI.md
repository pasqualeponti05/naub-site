# Mappa delle sezioni del sito

Ordine dall'alto in basso, con l'id/classe da usare per riferirsi a ciascuna zona. Aggiorna questo file se aggiungi/rimuovi sezioni.

| # | Nome | Selettore | Contenuto |
|---|------|-----------|-----------|
| — | Header | `header` | Barra fissa in alto: logo, menu, bottoni "Scrivici" / "Parliamo del progetto" |
| — | Menu mobile | `#mobileSheet` | Pannello a schermo intero che si apre col bottone hamburger su mobile |
| 1 | Hero | `.hero` (nessun id) | Video di sfondo, titolo "we build what people remember", bottone "Richiedi una proposta creativa" |
| 2 | Marquee servizi | `.marquee-wrap` / `#marquee` | Striscia di testo scorrevole con i servizi (Marketing & Communication, Brand Strategy...) |
| 3 | Animazione pinnata (loghi/foto) | `#pinWrap` | Sezione "a scorrimento": 3 foto che appaiono + logo NAUB in dissolvenza mentre si scende |
| 4 | Testo manifesto | `#manifesto` | I tre paragrafi ("Naub è una creative agency...", "Uniamo strategia...", "ESTETICA E BUSINESS...") — spostato qui dalla hero |
| 5 | Studio / Perché NAUB | `#studio` | Titolo "WE DON'T FOLLOW CULTURE..." + le 4 card (Brand positioning, Creative strategy, Content that performs, Data-driven growth) |
| 6 | Clienti / loghi partner | `#clienti` | Titolo "Our partner." + carosello a scorrimento dei loghi clienti |
| 7 | Collage foto | `#collageWrap` | Sezione pinnata con le foto che si susseguono con slide + dissolvenza scendendo |
| 8 | Risultati / Shopify | `#risultati` | Badge "Official partner Shopify.", anello con contatore ordini live, stack di screenshot "a faldone" |
| 9 | Team | `#team` | **Nascosta** (attributo `hidden`) — card dei membri del team |
| 10 | Contatti | `#contatti` | Lista contatti (email, telefono, sede, orari) + form di richiesta |
| — | Footer | `footer` | Logo, link rapidi, contatti, copyright |

## Note utili

- Le sezioni **Team** è momentaneamente nascosta (`hidden` su `#team` + sui link di navigazione corrispondenti). Per riattivarla basta togliere `hidden` in [index.html](../index.html) e dai link nel menu.
- `#pinWrap` e `#collageWrap` sono le due sezioni "a scorrimento pinnato": restano ferme sullo schermo mentre si scrolla e l'animazione è guidata dalla posizione di scroll (gestita in [js/script.js](../js/script.js)).
- Il file CSS è unico: [css/styles.css](../css/styles.css). Le regole specifiche di una sezione sono quasi sempre prefissate con l'id, es. `#risultati .split{...}`, `#manifesto .hero-sub{...}`.
- Quando chiedi una modifica, indicare il **numero o il nome** di questa tabella (es. "nella sezione 8, Risultati...") mi permette di editare subito il punto giusto senza dover ricercare.
