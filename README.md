# Domotica ESP32-C3 SuperMini con rele

Questo progetto ti permette di comandare luci e rele con ESP32-C3 SuperMini da un pannello web con password.

Ho scelto una versione semplice: niente broker MQTT, niente Docker, niente Node. Le ESP32 parlano direttamente con un server Python gia eseguibile su questo PC.

## Cosa contiene

- `server-python`: server domotica in Python, senza librerie esterne.
- `server/public`: pannello web con login.
- `firmware/esp32c3-relay-node`: firmware per ESP32-C3 SuperMini.
- `scripts`: script Windows per preparare, avviare e configurare le ESP32.
- `SCHEMA_COLLEGAMENTI.txt`: schema base dei collegamenti.

## Cosa devi installare

Sul PC Python e gia presente.

Per caricare il firmware sulle ESP32 ti servono:

1. VS Code: https://code.visualstudio.com/
2. Estensione PlatformIO dentro VS Code.

## Primo avvio del pannello

1. Entra nella cartella `domotica` sul Desktop.
2. Fai doppio clic su `PREPARA_DOMOTICA.bat`.
3. Segnati utente e password mostrati dalla finestra.
4. Fai doppio clic su `AVVIA_DOMOTICA.bat`.
5. Apri:

```text
http://localhost:8000
```

Quando vuoi spegnere il sistema, fai doppio clic su `STOP_DOMOTICA.bat`.

## Usarlo dal telefono

Il telefono deve essere nella stessa Wi-Fi del PC.

Trova l'IP del PC con:

```powershell
ipconfig
```

Cerca `Indirizzo IPv4`, per esempio `192.168.1.20`, poi apri dal telefono:

```text
http://192.168.1.20:8000
```

## Configurare una ESP32

1. Fai doppio clic su `CONFIGURA_ESP32.bat`.
2. Inserisci:
   - nome Wi-Fi
   - password Wi-Fi
   - IP del PC dove gira il pannello, esempio `192.168.1.20`
   - ID dispositivo senza spazi, esempio `luce_soggiorno`
   - nome visibile, esempio `Luce soggiorno`
   - stanza, esempio `Soggiorno`
3. Apri con VS Code questa cartella:

```text
domotica\firmware\esp32c3-relay-node
```

4. Collega la ESP32-C3 SuperMini via USB.
5. In PlatformIO premi `Upload`.
6. Dopo l'avvio, la luce apparira nel pannello web.

Per ogni nuova ESP32 ripeti `CONFIGURA_ESP32.bat`, cambia `ID dispositivo`, poi carica il firmware sulla scheda.

## Collegamenti elettrici base

Schema logico per un rele singolo:

```text
Alimentatore 5V +  ->  5V ESP32-C3
Alimentatore 5V -  ->  GND ESP32-C3

5V ESP32-C3       ->  VCC modulo rele
GND ESP32-C3      ->  GND modulo rele
GPIO4 ESP32-C3    ->  IN modulo rele

Interruttore:
GPIO3 ESP32-C3    ->  un contatto interruttore
GND ESP32-C3      ->  altro contatto interruttore
```

Lato lampada 230V:

```text
Fase ingresso      ->  COM rele
NO rele            ->  fase lampada
Neutro             ->  neutro lampada
Terra              ->  terra lampada, se prevista
```

Usa `NO` se vuoi che la luce resti spenta quando il rele non e alimentato.

## Note sui rele

- L'ESP32-C3 usa GPIO a 3.3V.
- Il modulo rele puo essere alimentato a 5V, ma l'ingresso `IN` deve funzionare con segnale 3.3V.
- Se il rele non scatta bene, serve un modulo rele compatibile ESP32 oppure un transistor/optoisolatore.
- Gli alimentatori 5V 700 mA bastano per una ESP32-C3 e un rele singolo piccolo.
- Non alimentare tanti rele con lo stesso alimentatore da 700 mA.
- Molti moduli rele sono `active-low`; il firmware e gia impostato con `RELAY_ACTIVE_LOW true`.

## Sicurezza 230V

La 230V e pericolosa. Spegni sempre il magnetotermico prima di lavorare sui cavi. Usa contenitori isolati e morsetti adatti. Se non sei pratico, fai fare la parte 230V a un elettricista.

## Sempre online

Per essere sempre online il server deve girare su un dispositivo sempre acceso:

- PC sempre acceso
- mini PC
- Raspberry Pi
- VPS

Su questo PC `AVVIA_DOMOTICA.bat` avvia il server in background. Resta attivo finche il PC resta acceso oppure finche non usi `STOP_DOMOTICA.bat`.

Per comandare da fuori casa, la soluzione piu semplice e sicura e una VPN tipo Tailscale o un tunnel tipo Cloudflare Tunnel verso `http://localhost:8000`. Evita di aprire porte del router se non sai esattamente cosa stai facendo.

## File con password

- `PASSWORD_PANNELLO_WEB.txt`: utente e password del pannello.
- `DEVICE_TOKEN_ESP32.txt`: token usato dalle ESP32.
- `server-python/config.json`: configurazione del server.

Non condividere questi file.
