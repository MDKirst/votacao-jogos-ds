# Votação dos Jogos — 1 voto confirmado por e-mail

Como funciona: o visitante escolhe o jogo, digita o e-mail e recebe um link.
O voto só conta depois do clique no link, e cada e-mail vale 1 voto.
Os votos ficam numa planilha sua; o envio dos e-mails sai da sua conta Google.

## 1. Planilha + Apps Script (≈5 min)
1. Crie uma planilha nova no Google Planilhas: "Votação dos Jogos — DS".
2. **Extensões → Apps Script**. Apague o que estiver lá e cole todo o conteúdo de `apps-script/Code.gs`. Salve.
3. No editor, escolha a função **configurar** e clique **Executar**. Autorize o acesso (planilha e Gmail).
   Se aparecer "app não verificado": Avançado → Acessar (é o seu próprio script).
4. **Implantar → Nova implantação** → tipo **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL que termina em **/exec**.

## 2. Configurar a página
No topo do `index.html`, cole a URL:
```
API_URL: "https://script.google.com/macros/s/.../exec",
```
Opcional: no `Code.gs`, preencha `SITE` com o endereço do GitHub Pages
(aparece o link "Ver placar" depois da confirmação). Se mudar o Code.gs,
faça **Implantar → Gerenciar implantações → editar → Nova versão** (a URL continua a mesma).

## 3. Hospedar no GitHub Pages
1. Repositório público novo (ex.: `votacao-jogos-ds`).
2. Envie `index.html` e a pasta `img/` (a pasta `apps-script/` não precisa ir).
3. Settings → Pages → Branch `main` / root → Save.

## Endereços
- Votação: `https://SEU-USUARIO.github.io/votacao-jogos-ds/`
- Placar: `.../#resultados`
- Telão: `.../?telao=1`

## Prazo
Fecha sozinho em **28/11/2026 23:59** (página e servidor). Para mudar, altere `FIM` nos dois arquivos.

## Limites que você precisa saber
- **Cota de e-mail:** conta Gmail comum manda ~100 e-mails/dia; conta escolar/Workspace, ~1.500/dia.
  Se a feira for grande num dia só, implante o script logado na conta institucional.
- **Spam:** o primeiro e-mail pode cair no spam. Avise os alunos para olhar lá.
- **Fraude:** quem tiver vários e-mails vota várias vezes. Para escola é um nível razoável.
- **LGPD:** são e-mails de alunos, muitos menores. Use só para a votação e apague a aba "Votos"
  depois de divulgar o resultado (exporte antes só os totais, se quiser guardar).

## Ver os votos
A aba **Votos** da planilha mostra email, jogo, status (pendente/confirmado) e horários.
O placar conta só os confirmados.
