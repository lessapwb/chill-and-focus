# Chill & Focus

<p align="center">
  <a href="#pt-br">Português</a> | <a href="#en">English</a>
</p>

---

<a id="pt-br"></a>

## Português

Chill & Focus é uma extensão de navegador Manifest V3 para acompanhar o tempo gasto em sites que tiram o foco e bloquear essas páginas quando o limite diário configurado é atingido.

O projeto é local-first: não usa backend, não envia telemetria e salva configurações e estatísticas apenas no `chrome.storage.local` do navegador.

[Read in English](#en)

### Recursos

- Conta o tempo apenas quando a janela do navegador está em foco e a aba ativa pertence a um domínio rastreado.
- Usa um limite diário total para todos os sites rastreados, com 5 minutos como padrão inicial.
- Bloqueia páginas rastreadas assim que o limite diário é atingido.
- Mostra no badge da extensão quanto tempo ainda resta no dia.
- Exibe no popup o site ativo, o tempo restante e o uso do dia por domínio.
- Inclui uma página de opções com edição da lista de domínios, idioma, limite diário, repetição de notificações e gráfico em série do tempo total dos últimos 14 dias.
- Suporta inglês e português.
- Mantém os dados de uso no próprio navegador.

### Privacidade

A extensão não possui servidor, analytics, anúncios ou chamadas para APIs externas. Os dados de configuração e histórico ficam em armazenamento local do navegador.

Por funcionar em qualquer site configurado pelo usuário, o manifesto usa `host_permissions` e `content_scripts` com `<all_urls>`. O código só contabiliza e bloqueia páginas cujo domínio esteja na lista rastreada.

### Permissões usadas

- `alarms`: agenda verificações periódicas para atualizar o tempo ativo.
- `notifications`: mostra lembretes quando o limite diário foi atingido.
- `scripting`: injeta o bloqueador em abas já abertas quando necessário.
- `storage`: salva configurações e estatísticas localmente.
- `tabs`: identifica a aba ativa e seu domínio.
- `<all_urls>`: permite que a extensão reconheça e bloqueie qualquer domínio que o usuário adicione à lista.

### Instalação no Chrome, Edge ou Brave

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions` ou a página equivalente do seu navegador.
3. Ative o modo de desenvolvedor.
4. Clique em **Load unpacked** ou **Carregar sem compactação**.
5. Selecione a pasta do projeto `Chill & Focus`.

### Instalação temporária no Firefox

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Load Temporary Add-on**.
3. Selecione o arquivo `manifest.json` deste projeto.

Navegadores Chromium são o alvo principal porque a extensão usa service workers do Manifest V3.

### Como usar

1. Abra o popup da extensão para ver o tempo restante do dia.
2. Clique em **Settings** para abrir as configurações.
3. Ajuste o limite diário total em minutos.
4. Edite a lista de domínios rastreados, um domínio por linha.
5. Salve as alterações.

Quando o limite diário é atingido, as páginas rastreadas passam a mostrar uma tela de bloqueio com opção para sair da página ou abrir as configurações.

### Sites rastreados por padrão

A lista inicial inclui domínios comuns de redes sociais, vídeo, fóruns e streaming, como Instagram, Facebook, X/Twitter, Reddit, TikTok, YouTube, Twitch, Discord, Pinterest, Netflix, Hulu, Disney+, Prime Video, Max, 9GAG e Imgur.

O usuário pode remover, adicionar ou restaurar esses domínios pela página de opções.

### Estrutura do projeto

- `manifest.json`: definição da extensão Manifest V3.
- `background.js`: service worker responsável por tempo ativo, estado, badge, notificações e bloqueio.
- `content-blocker.js`: content script que renderiza a tela de bloqueio nas páginas rastreadas.
- `popup.html`, `popup.css`, `popup.js`: interface rápida da extensão.
- `options.html`, `options.css`, `options.js`: página de configurações e histórico.
- `i18n.js`: textos em inglês e português.
- `lucide-icons.js`: ícones usados pela interface.
- `icons/`: ícones da extensão.

### Desenvolvimento

Não há etapa de build. Depois de editar os arquivos, recarregue a extensão na página de extensões do navegador.

Para empacotar manualmente antes de distribuir, gere o pacote a partir da pasta do projeto e mantenha arquivos como `.pem`, `.crx` e `.zip` fora do Git. Esses padrões já estão cobertos pelo `.gitignore`.

### Licença

Este repositório ainda não possui uma licença definida. Se a intenção for permitir que outras pessoas usem, modifiquem e distribuam o código com poucas restrições, a licença MIT é uma opção comum e permissiva.

---

<a id="en"></a>

## English

Chill & Focus is a Manifest V3 browser extension that tracks active time on distracting websites and blocks those pages after a configurable daily limit is reached.

The project is local-first: it does not use a backend, does not send telemetry, and stores settings and usage stats only in the browser's `chrome.storage.local`.

[Ler em português](#pt-br)

### Features

- Tracks time only when the browser window is focused and the active tab matches a tracked domain.
- Uses one daily total limit across all tracked websites, with 5 minutes as the initial default.
- Blocks tracked pages as soon as the daily limit is reached.
- Shows today's remaining time in the extension badge.
- Shows the active site, remaining time, and today's usage by domain in the popup.
- Includes an options page for editing domains, language, daily limit, notification repeat interval, and a time-series chart for the last 14 days.
- Supports English and Portuguese.
- Keeps usage data in the user's own browser.

### Privacy

The extension has no server, analytics, ads, or calls to external APIs. Settings and history are stored locally in the browser.

Because users can configure any site, the manifest uses `host_permissions` and `content_scripts` with `<all_urls>`. The code only tracks and blocks pages whose domain is in the tracked list.

### Permissions

- `alarms`: schedules periodic checks to update active time.
- `notifications`: shows reminders when the daily limit has been reached.
- `scripting`: injects the blocker into already-open tabs when needed.
- `storage`: saves settings and stats locally.
- `tabs`: identifies the active tab and its domain.
- `<all_urls>`: lets the extension recognize and block any domain the user adds to the tracked list.

### Install in Chrome, Edge, or Brave

1. Download or clone this repository.
2. Open `chrome://extensions` or the equivalent extensions page in your browser.
3. Enable developer mode.
4. Click **Load unpacked**.
5. Select the `Chill & Focus` project folder.

### Temporary install in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select this project's `manifest.json` file.

Chromium browsers are the primary target because the extension uses Manifest V3 service workers.

### Usage

1. Open the extension popup to see today's remaining time.
2. Click **Settings** to open settings.
3. Adjust the daily total limit in minutes.
4. Edit tracked domains, one domain per line.
5. Save the changes.

When the daily limit is reached, tracked pages show a blocking screen with actions to leave the page or open settings.

### Default Tracked Sites

The default list includes common social, video, forum, and streaming domains such as Instagram, Facebook, X/Twitter, Reddit, TikTok, YouTube, Twitch, Discord, Pinterest, Netflix, Hulu, Disney+, Prime Video, Max, 9GAG, and Imgur.

Users can remove, add, or restore those domains from the options page.

### Project Structure

- `manifest.json`: Manifest V3 extension definition.
- `background.js`: service worker for active time, state, badge, notifications, and blocking.
- `content-blocker.js`: content script that renders the blocking screen on tracked pages.
- `popup.html`, `popup.css`, `popup.js`: quick extension popup UI.
- `options.html`, `options.css`, `options.js`: settings and history page.
- `i18n.js`: English and Portuguese UI strings.
- `lucide-icons.js`: UI icons.
- `icons/`: extension icons.

### Development

There is no build step. After editing files, reload the extension from the browser extensions page.

To package manually before distribution, generate the package from the project folder and keep files such as `.pem`, `.crx`, and `.zip` out of Git. Those patterns are already covered by `.gitignore`.

### License

This repository does not have a license yet. If the goal is to let other people use, modify, and distribute the code with few restrictions, the MIT License is a common permissive option.
