# Trappi Tools

Un marketplace di plugin e skills personalizzati per Claude Code, creato e mantenuto da Daniele Trapani.

## Panoramica

Questo repository contiene una collezione curata di plugin e skills che estendono le capacità di [Claude Code](https://claude.com/claude-code), il CLI ufficiale di Anthropic per Claude. Ogni plugin è progettato per risolvere problemi specifici e migliorare la produttività nello sviluppo software.

## Plugin Disponibili

### 🌐 Browser Automation Lite

Toolkit leggero per l'automazione del browser utilizzando il Chrome DevTools Protocol.

**Caratteristiche principali:**

- Web scraping e estrazione contenuti
- Ispezione elementi DOM
- Automazione form e interazioni
- Screenshot e testing browser
- Approccio minimalista basato su script Node.js componibili

**Casi d'uso ideali:**

- Scraping di pagine web esistenti
- Estrazione di contenuti da articoli
- Automazione di task ripetitivi nel browser
- Ispezione e debug di elementi DOM
- Testing di interfacce web

**Differenze rispetto a webapp-testing:**

- Runtime: Node.js (vs Python)
- Browser: Chrome + CDP (vs Chromium + Playwright)
- Sessione: Persistente su localhost:9222 (vs effimera)
- Pattern: Script CLI componibili (vs integrazione Python)

**Documentazione:** [Browser Automation Lite](./plugins/browser-automation-lite/skills/browser-automation-lite/README.md)

## Installazione

### Prerequisiti

- [Claude Code](https://claude.com/claude-code) installato
- Node.js (per plugin basati su Node.js)
- Chrome/Chromium (per browser-automation-lite)

### Installazione dal Marketplace GitHub

Il modo più semplice per installare i plugin è tramite il marketplace GitHub:

1. **Aggiungi il marketplace** all'interno di Claude Code:

```
/plugin marketplace add danitrap/trappi-tools
```

oppure usando il repository completo:

```
/plugin marketplace add https://github.com/danitrap/trappi-tools.git
```

2. **Installa i plugin** che desideri utilizzare:

```
/plugin install browser-automation-lite@trappi-tools
```

3. **Verifica l'installazione**:

```
/plugin list
```

### Installazione Locale (per sviluppo)

Se vuoi testare il marketplace localmente o contribuire allo sviluppo:

1. Clona questo repository:

```bash
git clone https://github.com/danitrap/trappi-tools.git
cd trappi-tools
```

2. Aggiungi il marketplace locale in Claude Code:

```
/plugin marketplace add ./trappi-tools
```

3. Installa i plugin:

```
/plugin install browser-automation-lite@trappi-tools
```

### Dipendenze dei Plugin

Alcuni plugin richiedono dipendenze aggiuntive. Dopo l'installazione:

**Per browser-automation-lite:**

```bash
cd ~/.claude/plugins/browser-automation-lite/scripts
npm install
```

Per dettagli specifici, consulta la documentazione di ogni plugin.

## Struttura del Repository

```
trappi-tools/
├── .claude-plugin/
│   └── marketplace.json       # Metadata del marketplace
├── plugins/
│   └── browser-automation-lite/
│       └── skills/
│           └── browser-automation-lite/
│               ├── SKILL.md           # Documentazione skill
│               ├── README.md          # Guida implementazione
│               ├── LICENSE.txt        # Licenza MIT
│               ├── scripts/           # Script Node.js
│               └── examples/          # Esempi d'uso
└── README.md                  # Questo file
```

## Contribuire

Questo è un marketplace personale, ma feedback e suggerimenti sono sempre benvenuti!

### Segnalare Bug o Richiedere Feature

Apri una [issue](https://github.com/danitrap/trappi-tools/issues) descrivendo:

- Il plugin coinvolto
- Il comportamento atteso vs quello osservato
- Passaggi per riprodurre il problema
- Eventuali log o messaggi di errore

## Roadmap

- [ ] Aggiungere più plugin per automazione workflow
- [ ] Creare templates per development comune
- [ ] Integrazioni con servizi esterni
- [ ] Documentation enhancement

## Licenze

Ogni plugin può avere la propria licenza. Controlla il file `LICENSE.txt` nella directory di ciascun plugin.

- **browser-automation-lite**: MIT License (basato su [browser-tools](https://github.com/badlogic/browser-tools) di Mario Zechner)

## Autore

**Daniele Trapani**

- Email: <daniele.trapani@outlook.it>
- GitHub: [@danitrap](https://github.com/danitrap)

## Riconoscimenti

- **browser-automation-lite** è basato sull'approccio di [Mario Zechner](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/)
- Tutti i plugin sono progettati per integrarsi perfettamente con [Claude Code](https://claude.com/claude-code) di Anthropic

## Supporto

Per domande o assistenza:

1. Consulta la documentazione specifica del plugin
2. Cerca nelle [issues esistenti](https://github.com/danitrap/trappi-tools/issues)
3. Apri una nuova issue se necessario

---

**Nota**: Questo marketplace è in costante evoluzione. Nuovi plugin e miglioramenti vengono aggiunti regolarmente. Metti una stella ⭐ al repository per rimanere aggiornato!
