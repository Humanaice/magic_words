# Magic Words

Magic Words é um jogo de digitação: digite a palavra escrita em uma nuvem para a bruxa Willow pular nela. Vá subindo
de nuvem em nuvem até chegar no espaço!

Esta versão foi reescrita com **Vite + TypeScript + React**. É um site estático que não precisa de PHP nem de
banco de dados, e funciona no computador e no celular.

## Como jogar

- **Stairs**: sempre aparecem três nuvens por degrau, e você escolhe só uma delas para subir.
- **Random**: aparecem de uma a três nuvens por vez, e você pode pular em qualquer uma.
- No começo (e quando a Willow renasce) você tem alguns segundos parado antes de começar a cair.
- A cor da palavra diz o que a nuvem faz:

  | Cor          | Tipo      | Efeito                                                         |
  | ------------ | --------- | -------------------------------------------------------------- |
  | Branco       | normal    | Nuvem comum                                                    |
  | **Amarelo**  | bom       | Dobra os pontos ganhos por um tempo                            |
  | **Azul**     | bom       | O tempo fica devagar                                           |
  | **Verde**    | bom       | Vida extra                                                     |
  | **Laranja**  | bom       | Escudo: absorve a próxima nuvem ruim (anil ou vermelha) *(nova)* |
  | **Salmão**   | truque    | Mistura as letras                                              |
  | **Rosa**     | truque    | Inverte a palavra                                              |
  | **Cinza**    | truque    | Neblina: esconde algumas letras com "?" *(nova)*               |
  | **Anil**     | perigo    | Tempestade: a nuvem despenca e você precisa pular logo *(nova)* |
  | **Vermelho** | perigo    | Mata a Willow (ou gasta a vida extra)                          |

- Em todo degrau do Stairs, e em toda leva de nuvens do Random, sempre há pelo menos uma nuvem que não é perigosa.
  Isso é garantido no código que cria as nuvens (`rollRowTypes` em `src/game/Game.ts`) e coberto por testes.
- **Espaço** ou **Enter** apagam o que você digitou. **Esc** pausa o jogo.
- No celular, toque na caixa de texto, ou em qualquer lugar do jogo, para abrir o teclado.

## Rodando localmente

É preciso ter o Node.js 20.19 ou mais novo (recomendado: 24).

```bash
npm install
npm run dev        # http://localhost:5173
```

Outros comandos:

| Comando             | O que faz                                                 |
| ------------------- | --------------------------------------------------------- |
| `npm run build`     | Checa os tipos (TypeScript) e gera o site em `dist/`      |
| `npm run preview`   | Serve o `dist/` localmente para testar o build            |
| `npm run lint`      | ESLint                                                    |
| `npm test`          | Testes unitários (Vitest) das regras do jogo e do placar |

Para testar no celular na mesma rede Wi-Fi, rode `npm run dev -- --host` e abra no celular o endereço "Network" que
o Vite mostrar.

## Estrutura

```
src/
  game/                  jogo em TypeScript puro (sem React)
    Game.ts              regras + desenho no canvas (porte do GameScript.js original)
    engine/loop.ts       requestAnimationFrame com passo fixo (60 ticks/s, igual em todo monitor)
    engine/canvas.ts     ajusta o canvas à tela e ao devicePixelRatio (texto nítido)
    engine/text.ts       texto com contorno e caixas de fundo (legível em qualquer fundo)
    modes/               diferenças entre Stairs e Random
    words.ts             lista de palavras e transformações (inverter, misturar)
    assets.ts, audio.ts  sprites, fontes, música e efeito sonoro
  leaderboard/           placar com backends trocáveis (local e Supabase)
  ui/                    telas e componentes React (menu, jogo, placar, manual e créditos)
  styles/global.css
supabase/schema.sql      tabela do placar online com Row Level Security
.github/workflows/       deploy no GitHub Pages
Dockerfile, nginx.conf   alternativa com Docker
```

O React cuida só das telas e do HUD (pontuação, poderes, texto digitado). O loop do jogo roda fora do React e
avisa o HUD apenas quando algo muda, e não a cada frame.

### Teclado do celular

- A digitação vem de um `<input>` de verdade, invisível, posicionado sobre a caixa de texto. Ele tem
  `autocapitalize="off"`, `autocorrect="off"`, `autocomplete="off"`, `spellcheck=false` e `enterkeyhint`, e
  `font-size` de 16px ou mais para o iOS não dar zoom.
- O jogo lê o valor do input no evento `input` (e o Enter em `beforeinput`), não pelo `keydown`. No Android, o
  `keydown` vem com `keyCode 229` e não diz qual letra foi digitada.
- A tela do jogo usa a altura do `window.visualViewport` (eventos resize e scroll) e a meta
  `interactive-widget=resizes-content`. Assim, o jogo e a palavra digitada ficam acima do teclado, tanto no Android
  quanto no iOS.
- Tocar no jogo coloca o foco de volta no input e reabre o teclado. No computador, basta digitar.

## Leaderboard (placar)

O jogador só digita um apelido no fim da partida. Não há conta nem senha. Cada modo (Stairs e Random) tem o seu
próprio top 10.

O placar é uma interface (`src/leaderboard/types.ts`) com dois backends:

- **Local** (padrão, sem configuração nenhuma): salva no `localStorage`, ou seja, só neste navegador.
- **Supabase** (online, plano gratuito): usado automaticamente quando as variáveis `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` existem no build.

> **Aviso:** num jogo que roda inteiro no navegador, é possível enviar uma pontuação falsa direto para a API.
> O banco só aceita leitura e inserção, com validação de apelido, pontuação e modo, mas não tem como provar que a
> partida aconteceu. Para um jogo casual isso é aceitável; se alguém abusar, apague as linhas pelo painel do
> Supabase.

### Ativando o placar online com Supabase (passo a passo)

1. Crie uma conta em [supabase.com](https://supabase.com) e clique em **New project** (o plano Free basta).
2. No projeto, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e
   clique em **Run**. Isso cria a tabela `scores` com Row Level Security: o público só pode **ler** e **inserir**
   (nada de editar ou apagar), com apelido de 1 a 20 caracteres, pontuação entre 0 e 1.000.000 e modo `stairs` ou
   `random`.
3. Em **Project Settings → API** (ou **Connect**), copie a **Project URL** e a chave pública **anon** (nos projetos
   novos ela se chama **publishable key**, `sb_publishable_...`, e também funciona). Nunca use a chave
   `service_role`/secret no site.
4. Para rodar localmente: copie `.env.example` para `.env.local` e preencha:
   ```bash
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon
   ```
5. Para o GitHub Pages: no repositório, vá em **Settings → Secrets and variables → Actions → New repository
   secret** e crie dois secrets, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, com os mesmos valores. O próximo
   deploy já usa o placar online.

A chave anon fica visível no JavaScript publicado, e isso é esperado: quem protege os dados é o RLS. Os secrets
servem só para não deixar os valores escritos no código.

## Deploy no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) faz o build com Node e publica a pasta
`dist/` a cada push na `main` (ou manualmente em **Actions → Deploy to GitHub Pages → Run workflow**).

1. No GitHub, abra o repositório e vá em **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. (Opcional) Adicione os secrets do Supabase (veja acima).
3. Faça push na `main`. O site fica em `https://<usuario>.github.io/<repositorio>/`, por exemplo
   https://humanaice.github.io/magic_words/.

O caminho base (`base` do Vite) vem da variável `VITE_BASE_PATH`. O workflow usa `/<nome-do-repositorio>/`
automaticamente. Para um domínio próprio, crie em **Settings → Secrets and variables → Actions → Variables** uma
variável `BASE_PATH` com o valor `/`. Localmente e no Docker, o padrão é `/`.

## Docker

```bash
docker build -t magic-words .
docker run --rm -p 8080:80 magic-words
# abra http://localhost:8080
```

Com o placar online:

```bash
docker build -t magic-words \
  --build-arg VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=sua-chave-anon .
```

A imagem faz o build com `node:24-alpine` e serve os arquivos estáticos com `nginx`.

## O que mudou em relação à versão em PHP

- O backend em PHP e MySQL (cadastro, login, tokens, ligas e histórico de partidas) foi removido. O histórico do
  git ainda guarda esse código. O placar agora usa apelido e pode ser local ou Supabase.
- O jogo roda no mesmo ritmo em qualquer tela: 60 ticks por segundo, com delta time, sem depender da taxa de
  atualização do monitor.
- As palavras ficam maiores, com contorno e caixa de fundo, e a parte já digitada aparece destacada. O que você
  digita também aparece grande embaixo do jogo e fica vermelho quando não bate com nenhuma nuvem. Há ainda uma
  contagem regressiva antes da Willow cair e uma barra de tempo nos poderes.
- O layout é responsivo, inclusive em retrato, e funciona com o teclado do celular.
- Três tipos novos de nuvem: Escudo (laranja), Neblina (cinza) e Tempestade (anil), com a garantia de sempre haver
  uma nuvem segura para pular.

## Créditos

Jogo feito por **Matheus Nunes Santana** ([Humanaice](https://github.com/Humanaice)) e **Rodrigo do Vale
Stankowicz** ([rodrigovalest](https://github.com/rodrigovalest)).

Arte e sons: Pico-8 (inspiração da TV), [9E0](https://9e0.itch.io/witches-pack) (bruxa), Vecteezy (janela),
Pizza Tower (torre), Mega Voxels (nuvem), George Chairborn (terra), FancySnacks (caveira), Doodle Jump Jornal
(quadro), [Abstraction](https://soundcloud.com/abstraction/albums) (música),
[Mixkit](https://mixkit.co/free-sound-effects/magic/) (efeito sonoro) e [NYKNCK](https://nyknck.itch.io)
(fumaça). A lista completa, com links, está na seção "Manual e Créditos" do jogo.
