# Mock Interview

Treine entrevistas de emprego **falando em voz alta** com um entrevistador de IA (Google Gemini).

Você cola a descrição de uma vaga e o entrevistador faz perguntas sob medida para ela. Você responde pelo microfone e ele reage ao que você disse, com um aprofundamento ou um novo tema. No fim, você recebe um relatório com nota e dicas de melhoria.

Cada rodada tem três passos:

1. **Você fala:** sua resposta é transcrita ao vivo. Como numa entrevista real, a transcrição não pode ser editada nem regravada.
2. **O entrevistador pensa:** o Gemini lê sua resposta e decide a próxima pergunta.
3. **O entrevistador fala:** a resposta dele é lida em voz alta enquanto ainda está sendo gerada.

Nada fica salvo: não há banco de dados nem login. A entrevista existe só na aba do navegador.

## Requisitos

- **Node.js** 20 ou mais recente
- Uma **chave da API do Google Gemini**, gratuita em https://aistudio.google.com/apikey
- **Google Chrome ou Microsoft Edge** no computador. O Firefox não tem reconhecimento de fala.
- Microfone e conexão com a internet. O Chrome e o Edge transcrevem a fala na nuvem.

## Instalação

```bash
npm install
cp .env.example .env.local
```

Abra o `.env.local` e cole sua chave:

```env
GEMINI_API_KEY=sua-chave-aqui

# Opcional: outro modelo Gemini 3 ou mais recente (padrão: gemini-3.8-flash)
# GEMINI_MODEL=gemini-3.8-flash
```

A chave fica só no servidor e nunca é enviada ao navegador. O `.env.local` já está no `.gitignore`.

## Como rodar

```bash
npm run dev
```

Abra http://localhost:3000 no Chrome ou no Edge. O microfone só funciona em `localhost` ou em HTTPS.

## Como usar

### 1. Configure a entrevista

| Campo | O que fazer |
|---|---|
| **Descrição da vaga** | Cole o anúncio da vaga: cargo, empresa, responsabilidades e requisitos (de 50 a 20.000 caracteres). Quanto mais detalhes, mais específicas ficam as perguntas. |
| **Idioma da entrevista** | Português (Brasil) ou English (US). O idioma vale para a tela, a transcrição, a voz, as perguntas e o feedback. |
| **Número de perguntas** | 3, 5, 8 ou 10. As perguntas de aprofundamento também contam. |
| **Voz do entrevistador** | Deixe em "Automática" ou escolha uma voz instalada. Use **Testar voz** para ouvir como ela soa. |

Clique em **Começar entrevista**. Na primeira vez, o navegador pede permissão para usar o microfone.

### 2. Responda às perguntas

1. O entrevistador se apresenta e faz a primeira pergunta em voz alta.
2. Quando ele terminar de falar, clique em **Começar a responder** e fale normalmente.
3. Clique em **Finalizar resposta** quando terminar. O entrevistador então faz a próxima pergunta.

O microfone nunca fica aberto enquanto o entrevistador fala. Durante a entrevista você pode usar estes botões:

| Botão | O que faz |
|---|---|
| **Repetir** | Ouve de novo a última fala do entrevistador |
| **Pular voz** | Interrompe a fala atual. O texto continua na tela. |
| **Silenciar / Ativar som** | Liga ou desliga a voz do entrevistador |
| **Encerrar entrevista** | Termina antes do fim e gera feedback só sobre as perguntas já respondidas |

Se a gravação parar sozinha no meio da resposta, você pode clicar em **Continuar respondendo** ou em **Enviar resposta** para mandar o que já foi captado. Se der erro na IA, **Tentar novamente** reenvia a mesma rodada.

### 3. Leia o feedback

Depois da última resposta, o entrevistador se despede e o relatório aparece com:

- **nota geral** de 1 a 10 (5 é a média), resumo, pontos fortes e o que melhorar;
- **pergunta por pergunta**: nota, o que foi bem, o que melhorar e como deixar a resposta mais forte;
- **próximos passos** e a **transcrição** completa.

Opções do relatório:

- **Ler resumo em voz alta**
- **Baixar relatório (.md)**: arquivo Markdown com feedback, transcrição e descrição da vaga
- **Praticar de novo (mesma vaga)**
- **Nova descrição de vaga**

## Dicas e problemas comuns

| Problema | Solução |
|---|---|
| "O servidor não tem uma chave da API" | Preencha `GEMINI_API_KEY` no `.env.local` e reinicie o `npm run dev`. |
| "A chave da API do Gemini foi recusada" | Confira se a chave foi copiada inteira, sem espaços. |
| Microfone bloqueado | Clique no ícone de cadeado na barra de endereço, libere o microfone e recarregue a página. |
| "Não captamos nada" | Verifique se o microfone certo está selecionado no sistema e no navegador. |
| Você ouve a própria voz enquanto fala | Isso não vem do app. No Windows, desative "Escutar este dispositivo" (Configurações de som → Gravação → seu microfone → Propriedades → Escutar) ou o retorno de microfone do headset. |
| A voz soa robótica | A qualidade depende das vozes instaladas. No Edge, as vozes "Natural/Online" costumam soar melhor. |
| Recarreguei a página e perdi tudo | É o comportamento esperado, porque nada é salvo. Baixe o relatório antes de sair. |

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em http://localhost:3000 |
| `npm run build` | Build de produção |
| `npm start` | Roda o build de produção |
| `npm test` | Testes unitários (vitest) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Checagem de tipos |

## Tecnologias

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Google Gemini (`@google/genai`), zod e a Web Speech API do navegador para transcrição e voz.

## Aviso antes de publicar

As rotas da API não têm autenticação nem limite de requisições. O projeto foi feito para uso local ou pessoal: se for publicado como está, qualquer pessoa pode gastar seus créditos do Gemini.

Arquitetura, contratos da API, detalhes dos prompts e a lista completa de funcionalidades estão em [CONTEXT.md](./CONTEXT.md).
