# Domotica online con GitHub Pages, Vercel e MongoDB Atlas

Questa versione non richiede il PC sempre acceso.

Architettura:

```text
GitHub Pages       -> pannello web
Vercel             -> API protetta
MongoDB Atlas Free -> database comandi/stati
ESP32-C3           -> legge comandi e comanda rele
```

## 1. Genera le password

Fai doppio clic su:

```text
PREPARA_CLOUD_SEGRETI.bat
```

Viene creato:

```text
CLOUD_SECRETS_DA_INSERIRE_SU_VERCEL.txt
```

Non caricarlo su GitHub.

## 2. MongoDB Atlas

Nel cluster Free che hai creato:

1. Crea un database user con password.
2. Vai su `Connect`.
3. Scegli `Drivers`.
4. Copia la stringa `mongodb+srv://...`.
5. Sostituisci `<password>` con la password del database user.
6. Incolla la stringa in `MONGODB_URI` dentro il file `CLOUD_SECRETS_DA_INSERIRE_SU_VERCEL.txt`.

Network Access:

- per iniziare puoi autorizzare `0.0.0.0/0`, cosi Vercel puo collegarsi;
- quando sarai piu pratico, si puo restringere meglio.

## 3. GitHub

Crea un repository GitHub e carica tutta la cartella `domotica`, esclusi i file ignorati da `.gitignore`.

GitHub Pages:

1. Apri il repository su GitHub.
2. Vai su `Settings`.
3. Vai su `Pages`.
4. In `Build and deployment`, scegli `GitHub Actions`.
5. Quando fai push su `main`, la workflow pubblica la cartella `github-pages`.

Il sito diventera qualcosa tipo:

```text
https://TUO-UTENTE.github.io/NOME-REPOSITORY/
```

## 4. Vercel

Serve un account Vercel. Puoi entrare con GitHub.

1. Da Vercel crea un nuovo progetto importando lo stesso repository GitHub.
2. Imposta `Root Directory` su:

```text
cloud-api
```

3. In `Environment Variables` aggiungi tutte le variabili del file:

```text
CLOUD_SECRETS_DA_INSERIRE_SU_VERCEL.txt
```

4. In `FRONTEND_ORIGIN` metti l'URL GitHub Pages, senza slash finale.

Esempio:

```text
FRONTEND_ORIGIN=https://TUO-UTENTE.github.io
```

Se il sito e un project site, puoi mettere anche:

```text
FRONTEND_ORIGIN=https://TUO-UTENTE.github.io
```

Il browser mandera comunque origin solo con dominio, non con path repository.

5. Fai deploy.

Alla fine avrai un URL tipo:

```text
https://nome-progetto.vercel.app
```

## 5. Collega sito GitHub Pages all'API

Apri:

```text
github-pages/config.js
```

Sostituisci:

```js
API_BASE_URL: "https://TUO-PROGETTO.vercel.app"
```

con l'URL reale di Vercel.

Poi fai commit/push su GitHub.

## 6. Configura ESP32 cloud

Fai doppio clic su:

```text
CONFIGURA_ESP32_CLOUD.bat
```

Inserisci:

- Wi-Fi
- URL API Vercel
- ID luce, esempio `luce_soggiorno`
- nome visibile
- stanza

Lo script legge automaticamente il `DEVICE_TOKEN` dal file dei secret, se esiste.

Poi apri con VS Code:

```text
firmware\esp32c3-relay-node
```

e fai `Upload` con PlatformIO.

## Endpoint API

- `POST /api/login`: login pannello.
- `GET /api/devices`: lista dispositivi, richiede token admin.
- `POST /api/command`: comando luce, richiede token admin.
- `POST /api/device-state`: stato inviato da ESP32, richiede `X-Device-Token`.
- `GET /api/device-poll?id=...`: polling comandi da ESP32, richiede `X-Device-Token`.

## Sicurezza

- Non mettere `MONGODB_URI` su GitHub Pages.
- Non mettere `ADMIN_PASSWORD` dentro il firmware.
- Il firmware usa solo `DEVICE_TOKEN`.
- La password MongoDB vive solo nelle variabili ambiente Vercel.
- La 230V va cablata con corrente staccata e contenitori/morsetti adatti.
