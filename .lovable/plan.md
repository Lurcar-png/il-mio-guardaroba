# Guardaroba personale con outfit e Chat AI

Web app privata che riproduce lo stile degli screenshot: sfondo bianco, colore principale turchese, pulsanti a pillola, schede con angoli arrotondati su grigio chiaro, menu in alto centrato.

## Prima di iniziare (lo fai tu)
Colleghi il tuo Supabase da Impostazioni progetto → General → External Supabase → Connect. Senza questo collegamento non si possono salvare capi, foto e outfit.

## Pagine
- **Accesso**: login con email e password. Senza login non si vede nulla.
- **Guardaroba** (pagina iniziale): filtri a pillola Tutti / Giubbotti / Felpe / Maglie / Pantaloni / Scarpe / Accessori, numero articoli, griglia di schede con foto. Pulsante "Aggiungi vestiti" (foto + categoria + nome, colore e stile facoltativi). Su ogni scheda: elimina con conferma, segna come preferito.
- **Crea Outfit**: a sinistra il guardaroba filtrabile, a destra la tela dove i capi scelti si dispongono come negli screenshot (sopra, pantaloni, scarpe, accessori di lato). Nome dell'outfit, occasione, pulsante Salva.
- **Outfit**: griglia degli outfit salvati con l'impaginazione degli screenshot; apri, modifica, elimina.
- **Chat AI**: scrivi una richiesta ("pranzo informale", "più elegante"), l'AI sceglie solo tra i tuoi capi e propone 2-3 outfit mostrati come schede grafiche, ognuno con una breve spiegazione e un pulsante "Salva outfit". La chat si azzera a ogni visita.
- **Profilo**: nome, iniziale nel cerchio, conteggi di capi e outfit, esci.

## Extra utili
- Ricerca per nome nel guardaroba.
- Rimozione dello sfondo non inclusa; le foto vengono mostrate su fondo grigio chiaro per uniformità.
- Ottimizzazione per telefono (menu in basso).
- Contatore "indossato" su ogni outfit e data dell'ultimo utilizzo.

## Dettagli tecnici
- Tabelle: `items` (user_id, name, category enum, color, style, image_path, favorite), `outfits` (user_id, name, occasion, worn_count, last_worn), `outfit_items` (outfit_id, item_id, slot). RLS per proprietario, GRANT ad authenticated.
- Archivio file privato `wardrobe` con cartelle per utente; immagini mostrate con URL firmati.
- Route protette sotto `_authenticated/`, login su `/auth`.
- Chat: server function autenticata che invia l'elenco dei capi (id, nome, categoria, colore, stile) al Lovable AI Gateway (`openai/gpt-6-astra`, Responses API) con output strutturato: lista di outfit con item_id e motivazione; gli id vengono validati sul server.
- Font arrotondato simile agli screenshot (es. Nunito/Quicksand), token turchese in `styles.css`.
