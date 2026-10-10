# Clip Maker

Um SaaS simples: você envia um vídeo `.mp4` e recebe **3 cortes de até 30 segundos**, tirados do começo, do meio e do fim do vídeo, prontos para baixar.

**Veja funcionando:** https://clips.flowads.io

Este guia foi feito para quem está começando. Se você nunca programou, siga os passos na ordem.

---

## Sumário

1. [Como funciona (em 1 minuto)](#1-como-funciona-em-1-minuto)
2. [Caminho mais fácil: publicar sua cópia sem terminal](#2-caminho-mais-fácil-publicar-sua-cópia-sem-terminal)
3. [Rodar no seu computador](#3-rodar-no-seu-computador)
4. [Publicar pelo terminal](#4-publicar-pelo-terminal)
5. [Entendendo o código](#5-entendendo-o-código)
6. [Como modificar (receitas prontas)](#6-como-modificar-receitas-prontas)
7. [Modificando com IA](#7-modificando-com-ia)
8. [Problemas comuns](#8-problemas-comuns)
9. [Por que upload e não link do YouTube?](#9-por-que-upload-e-não-link-do-youtube)
10. [Custos e cuidados](#10-custos-e-cuidados)

---

## 1. Como funciona (em 1 minuto)

```
 Seu navegador                      Vercel (servidor)                 Vercel Blob (armazenamento)
 ─────────────                      ─────────────────                 ───────────────────────────
 1. Você escolhe o .mp4  ─────────────────────────────────────────▶  2. O vídeo é guardado aqui
 3. Clica "Gerar cortes" ─────────▶ 4. Baixa o vídeo do Blob
                                    5. O FFmpeg corta 3 trechos
                                    6. Salva os cortes ───────────▶  7. Cortes guardados aqui
 8. Você vê e baixa os cortes ◀──── (devolve só os links)
```

Palavras que aparecem neste guia:

| Termo | O que é |
| --- | --- |
| **Next.js** | O framework usado para fazer o site. Ele junta a tela (frontend) e o servidor (backend) num projeto só. |
| **Tailwind CSS** | Um jeito de estilizar a tela escrevendo classes como `bg-white` e `rounded-xl` direto no HTML. |
| **Vercel** | Onde o site fica hospedado na internet. Tem plano gratuito. |
| **Vercel Blob** | O "HD na nuvem" da Vercel. Guarda os vídeos enviados e os cortes. |
| **FFmpeg** | Programa gratuito que edita vídeo pela linha de comando. É ele que faz os cortes. |
| **API route** | Um arquivo do servidor que responde a pedidos da tela. Aqui temos duas: `/api/upload` e `/api/clips`. |

**Por que o vídeo vai direto para o Blob?** O servidor da Vercel não aceita receber arquivos com mais de 4,5 MB. Então o navegador envia o vídeo direto para o Blob, e o servidor só busca de lá.

---

## 2. Caminho mais fácil: publicar sua cópia sem terminal

Você consegue ter o seu próprio Clip Maker no ar só clicando:

1. **Crie uma conta no GitHub** (https://github.com) e outra na **Vercel** (https://vercel.com). Na Vercel, entre usando "Continue with GitHub".
2. **Faça uma cópia deste projeto:** no topo desta página do GitHub, clique em **Fork** e depois em **Create fork**. Agora você tem o projeto na sua conta.
3. **Importe na Vercel:** em https://vercel.com/new, encontre o seu fork (`Clips`), clique em **Import** e depois em **Deploy**. Espere terminar.
4. **Crie o armazenamento (Blob):** no painel do projeto na Vercel:
   - abra a aba **Storage**, clique em **Create** e escolha **Blob**;
   - dê um nome, por exemplo `clips-blob`;
   - escolha **Public** (importante: o código precisa de acesso público para mostrar os cortes);
   - conecte ao seu projeto, em todos os ambientes.

   Isso cria sozinho a variável secreta `BLOB_READ_WRITE_TOKEN` no projeto.
5. **Publique de novo** para o site enxergar o Blob: aba **Deployments**, clique nos **⋯** do deploy mais recente e depois em **Redeploy**.
6. Abra o link do seu projeto e teste com um `.mp4`.

A partir daqui, toda alteração que você fizer no seu fork no GitHub é publicada sozinha pela Vercel.

---

## 3. Rodar no seu computador

### 3.1 Instale as ferramentas (só uma vez)

| Ferramenta | Para que serve | Onde baixar |
| --- | --- | --- |
| **Node.js** (versão LTS, 20.9 ou mais nova) | Roda o projeto e instala as bibliotecas | https://nodejs.org |
| **Git** | Baixa o código do GitHub | https://git-scm.com (no Mac geralmente já vem instalado) |
| **VS Code** (opcional) | Editor para ver e mudar o código | https://code.visualstudio.com |
| **Conta na Vercel** | Para criar o Blob, mesmo rodando localmente | https://vercel.com |

**O que é o terminal:** é a janela onde você digita comandos. No Mac, abra o app **Terminal**. No Windows, abra o **PowerShell**. Digite cada comando abaixo e aperte **Enter**.

Para conferir a instalação, rode estes comandos. Cada um deve mostrar um número de versão:

```sh
node -v
git --version
```

### 3.2 Baixe o código e instale as bibliotecas

```sh
git clone https://github.com/pdrvieira/Clips.git
cd Clips
npm install
```

- `git clone` baixa o projeto para uma pasta chamada `Clips`.
- `cd Clips` entra nessa pasta. Os próximos comandos precisam ser rodados dentro dela.
- `npm install` baixa todas as bibliotecas que o projeto usa, inclusive o FFmpeg. Pode levar alguns minutos.

### 3.3 Crie o seu armazenamento (Vercel Blob)

Mesmo no seu computador, os vídeos são guardados no Blob da Vercel. Rode:

```sh
npm install -g vercel
vercel login
vercel link
vercel blob create-store clips-blob --access public --yes
vercel env pull .env.local
```

- `npm install -g vercel` instala o Vercel CLI, o programa que controla a Vercel pelo terminal.
- `vercel login` abre o navegador para você entrar na sua conta.
- `vercel link` cria um projeto na sua conta Vercel. Responda às perguntas: confirme com **Y**, escolha sua conta, diga que **não** quer usar um projeto existente e aceite os nomes sugeridos com Enter.
- `vercel blob create-store` cria o Blob público e conecta ao projeto.
- `vercel env pull .env.local` baixa a chave secreta do Blob para o arquivo `.env.local`.

> **Nunca compartilhe o `.env.local`.** Ele tem a chave do seu Blob. O arquivo `.gitignore` já impede que ele vá para o GitHub.

### 3.4 Rode o projeto

```sh
npm run dev
```

Abra **http://localhost:3000** no navegador e teste com um `.mp4`. Para parar o servidor, volte ao terminal e aperte **Ctrl + C**.

Enquanto o `npm run dev` estiver rodando, toda vez que você salvar um arquivo a página atualiza sozinha.

---

## 4. Publicar pelo terminal

Depois de fazer o passo 3, publicar é um comando só:

```sh
vercel deploy --prod
```

No fim, ele mostra o link do seu site. A chave do Blob já fica configurada no projeto pelo `vercel blob create-store`.

**Domínio próprio (opcional):** no painel da Vercel, abra o projeto, vá em **Settings → Domains** e adicione o seu domínio. A Vercel mostra o que configurar no seu provedor de DNS.

---

## 5. Entendendo o código

```
Clips/
├── app/
│   ├── page.tsx              ← a tela (tudo que você vê)
│   ├── layout.tsx            ← a "moldura" da página: título da aba e fonte
│   ├── globals.css           ← estilos gerais, como a cor de fundo
│   ├── limits.ts             ← limites: tamanho e duração máximos do vídeo
│   └── api/
│       ├── upload/route.ts   ← autoriza o navegador a enviar o vídeo para o Blob
│       └── clips/route.ts    ← o coração: baixa, corta com FFmpeg e salva os cortes
├── next.config.ts            ← configuração do Next.js (inclui o FFmpeg no servidor)
├── package.json              ← lista de bibliotecas e de comandos (npm run dev, etc.)
└── AGENTS.md                 ← instruções para IAs que forem mexer no código
```

O que acontece em `app/api/clips/route.ts`, passo a passo:

1. **Confere** se o vídeo está mesmo no seu Blob, na pasta `uploads/`. Isso impede alguém de pedir para o servidor baixar qualquer coisa da internet.
2. **Baixa** o vídeo para uma pasta temporária do servidor.
3. **Mede a duração** com o FFmpeg e recusa vídeos com mais de 15 minutos.
4. **Corta 3 trechos**, um no meio de cada terço do vídeo, e reduz para no máximo 720p, para caber no tempo do servidor.
5. **Salva os cortes** no Blob e devolve só os links para a tela.
6. **Apaga** o vídeo original e a pasta temporária.

---

## 6. Como modificar (receitas prontas)

Depois de cada mudança, teste com `npm run dev` e publique com `vercel deploy --prod`. Se você usou o caminho sem terminal, basta salvar a mudança no seu fork do GitHub.

### Mudar a duração dos cortes

Em `app/api/clips/route.ts`:

```ts
const CLIP_SECONDS = 30;   // mude para 15, 60...
```

Atualize também o texto "3 cortes de 30s" em `app/page.tsx`.

### Mudar a quantidade de cortes

No mesmo arquivo:

```ts
const CLIP_COUNT = 3;      // mude para 5, por exemplo
```

Em `app/page.tsx`, a grade mostra 3 colunas (`sm:grid-cols-3`). Ajuste o número se quiser outra arrumação.

### Cortes verticais (9:16, para Reels, TikTok e Shorts)

Em `app/api/clips/route.ts`, troque a linha do `-vf`:

```ts
// antes
"-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
// depois: recorta o centro do vídeo em 9:16 e deixa em 720x1280
"-vf", "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=720:1280,setsar=1",
```

Em `app/page.tsx`, troque `aspect-video` por `aspect-[9/16]` na tag `<video>` para a prévia ficar em pé.

### Mudar os limites de tamanho e duração

Em `app/limits.ts`:

```ts
export const MAX_UPLOAD_MB = 200;
export const MAX_VIDEO_MINUTES = 15;
```

Cuidado: o servidor tem no máximo 5 minutos para processar. Vídeos muito longos ou em alta resolução podem estourar esse tempo.

### Mudar a qualidade dos cortes

Na lista de opções do FFmpeg em `app/api/clips/route.ts`:

- `-crf 23`: quanto **menor** o número, melhor a qualidade e maior o arquivo. Valores comuns vão de 18 a 28.
- `720` dentro do `-vf`: a resolução máxima. Resolução maior deixa o processamento mais lento.

### Mudar cores e textos da tela

- Textos: edite direto em `app/page.tsx`.
- Cores e espaçamentos: são classes do Tailwind em `app/page.tsx`. Por exemplo, `bg-white` é o fundo branco do botão; troque por `bg-blue-500` para azul. Lista de classes: https://tailwindcss.com/docs
- Cor de fundo da página: em `app/globals.css`, no `background` do `body`.

---

## 7. Modificando com IA

Este projeto foi feito com o **Claude Code**. Você pode continuar com ele ou com outra IA de programação:

1. Abra a pasta do projeto na IA.
2. Peça em português o que quer. Exemplos:
   - "Mude os cortes para 15 segundos e atualize os textos da tela."
   - "Faça os cortes saírem na vertical, 9:16."
   - "Adicione um botão para baixar os 3 cortes de uma vez."
3. Peça para ela **testar antes de publicar**: "rode o projeto e confirme que os cortes são gerados".

Dica: o Next.js 16 mudou muita coisa em relação às versões antigas. O arquivo `AGENTS.md` avisa a IA para consultar a documentação certa, que já vem dentro do projeto.

---

## 8. Problemas comuns

**"node", "npm" ou "git" não é reconhecido como comando**
A ferramenta não está instalada, ou o terminal foi aberto antes da instalação. Instale (veja o passo 3.1) e abra um terminal novo.

**`EACCES` ou "permission denied" ao rodar `npm install -g vercel`** (Mac/Linux)
Pule a instalação global e use `npx vercel` no lugar de `vercel` em todos os comandos. Exemplo: `npx vercel login`.

**Ao enviar o vídeo aparece "Failed to retrieve the client token"**
O servidor não encontrou a chave do Blob.
- No seu computador: rode `vercel env pull .env.local`, pare o servidor (Ctrl + C) e rode `npm run dev` de novo.
- Na Vercel: confira se o Blob está conectado ao projeto (aba **Storage**) e faça um **Redeploy**.

**"Erro inesperado" e no terminal aparece "FFmpeg não encontrado"**
O FFmpeg não foi baixado na instalação. Rode:

```sh
node node_modules/ffmpeg-static/install.js
```

**O envio falha ou os cortes não abrem, mesmo com a chave configurada**
Confira se o Blob foi criado como **Public**. Este código só funciona com Blob público. Se ele estiver como **Private**, crie outro como **Public**, conecte ao projeto e faça um Redeploy.

**O vídeo do celular não é aceito**
O app só aceita `.mp4`. Vídeos do iPhone costumam vir em `.mov`: exporte ou converta para MP4 antes.

**"Port 3000 is in use"**
Outra coisa está usando a porta 3000. O Next.js escolhe outra porta sozinho (por exemplo 3001). Abra o endereço que aparece no terminal.

**Demora muito ou dá erro de tempo esgotado**
Vídeos longos ou em 4K exigem mais do servidor. Teste com vídeos menores, ou reduza os limites em `app/limits.ts`.

---

## 9. Por que upload e não link do YouTube?

A primeira versão deste projeto recebia um link do YouTube e baixava o vídeo com o **yt-dlp**. No computador funcionou. Na Vercel, o YouTube bloqueou com a mensagem *"Sign in to confirm you're not a bot"*.

O motivo: o YouTube bloqueia downloads vindos de servidores na nuvem (datacenters). Testamos 11 formas diferentes de acesso e todas foram bloqueadas. Trocar de hospedagem não resolve, porque todas usam servidores em datacenter. As saídas seriam:

- pagar um proxy residencial, que faz o pedido parecer vir de uma casa;
- usar cookies de uma conta do YouTube, o que viola os Termos de Uso e pode levar ao bloqueio da conta.

Por isso trocamos para o upload do arquivo, que funciona sem depender de ninguém. A lição: **teste em produção cedo**. Funcionar no seu computador não garante que funcione no servidor.

---

## 10. Custos e cuidados

- **Plano gratuito da Vercel (Hobby):** serve para projetos pessoais e roda este app. Para uso comercial, a Vercel pede o plano Pro.
- **Armazenamento:** o vídeo original é apagado depois do processamento, mas **os cortes ficam guardados** no Blob. O plano gratuito tem limite de espaço. Para limpar, use a aba **Storage** do painel da Vercel ou rode `vercel blob empty-store`, que apaga **todos** os arquivos do Blob.
- **Segredos:** nunca publique o `.env.local` nem nenhum token da Vercel.
- **Direitos autorais:** só envie vídeos que você tem direito de usar.
