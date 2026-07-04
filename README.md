# Chill & Focus

Chill & Focus é uma extensão de navegador Manifest V3 para acompanhar o tempo gasto em sites que tiram o foco e bloquear essas páginas quando o limite diário configurado é atingido.

O projeto é local-first: não usa backend, não envia telemetria e salva configurações e estatísticas apenas no `chrome.storage.local` do navegador.

## Recursos

- Conta o tempo apenas quando a janela do navegador está em foco e a aba ativa pertence a um domínio rastreado.
- Usa um limite diário total para todos os sites rastreados, com 5 minutos como padrão inicial.
- Bloqueia páginas rastreadas assim que o limite diário é atingido.
- Mostra no badge da extensão quanto tempo ainda resta no dia.
- Exibe no popup o site ativo, o tempo restante e o uso do dia por domínio.
- Inclui uma página de opções com edição da lista de domínios, idioma, limite diário, repetição de notificações e gráfico dos últimos 14 dias.
- Suporta inglês e português.
- Mantém os dados de uso no próprio navegador.

## Privacidade

A extensão não possui servidor, analytics, anúncios ou chamadas para APIs externas. Os dados de configuração e histórico ficam em armazenamento local do navegador.

Por funcionar em qualquer site configurado pelo usuário, o manifesto usa `host_permissions` e `content_scripts` com `<all_urls>`. O código só contabiliza e bloqueia páginas cujo domínio esteja na lista rastreada.

## Permissões usadas

- `alarms`: agenda verificações periódicas para atualizar o tempo ativo.
- `notifications`: mostra lembretes quando o limite diário foi atingido.
- `scripting`: injeta o bloqueador em abas já abertas quando necessário.
- `storage`: salva configurações e estatísticas localmente.
- `tabs`: identifica a aba ativa e seu domínio.
- `<all_urls>`: permite que a extensão reconheça e bloqueie qualquer domínio que o usuário adicione à lista.

## Instalação no Chrome, Edge ou Brave

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions` ou a página equivalente do seu navegador.
3. Ative o modo de desenvolvedor.
4. Clique em **Load unpacked** ou **Carregar sem compactação**.
5. Selecione a pasta do projeto `Chill & Focus`.

## Instalação temporária no Firefox

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Load Temporary Add-on**.
3. Selecione o arquivo `manifest.json` deste projeto.

Navegadores Chromium são o alvo principal porque a extensão usa service workers do Manifest V3.

## Como usar

1. Abra o popup da extensão para ver o tempo restante do dia.
2. Clique em **Edit sites** para abrir as configurações.
3. Ajuste o limite diário total em minutos.
4. Edite a lista de domínios rastreados, um domínio por linha.
5. Salve as alterações.

Quando o limite diário é atingido, as páginas rastreadas passam a mostrar uma tela de bloqueio com opção para sair da página ou abrir as configurações.

## Sites rastreados por padrão

A lista inicial inclui domínios comuns de redes sociais, vídeo, fóruns e streaming, como Instagram, Facebook, X/Twitter, Reddit, TikTok, YouTube, Twitch, Discord, Pinterest, Netflix, Hulu, Disney+, Prime Video, Max, 9GAG e Imgur.

O usuário pode remover, adicionar ou restaurar esses domínios pela página de opções.

## Estrutura do projeto

- `manifest.json`: definição da extensão Manifest V3.
- `background.js`: service worker responsável por tempo ativo, estado, badge, notificações e bloqueio.
- `content-blocker.js`: content script que renderiza a tela de bloqueio nas páginas rastreadas.
- `popup.html`, `popup.css`, `popup.js`: interface rápida da extensão.
- `options.html`, `options.css`, `options.js`: página de configurações e histórico.
- `i18n.js`: textos em inglês e português.
- `lucide-icons.js`: ícones usados pela interface.
- `icons/`: ícones da extensão.

## Desenvolvimento

Não há etapa de build. Depois de editar os arquivos, recarregue a extensão na página de extensões do navegador.

Para empacotar manualmente antes de distribuir, gere o pacote a partir da pasta do projeto e mantenha arquivos como `.pem`, `.crx` e `.zip` fora do Git. Esses padrões já estão cobertos pelo `.gitignore`.

## Observações

- O limite é diário e reinicia quando a data local muda.
- O bloqueio é calculado pelo total acumulado em todos os sites rastreados, não por site individual.
- A extensão não tenta sincronizar dados entre navegadores ou dispositivos.
