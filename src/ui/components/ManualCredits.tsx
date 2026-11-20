import bruxaGifUrl from '../../assets/ui/bruxa_gif.gif';
import bruxaIdleUrl from '../../assets/ui/bruxa_idle.gif';
import cloudUrl from '../../assets/sprites/CloudSprite.png';
import danteUrl from '../../assets/ui/Dante.jpg';
import frontImageUrl from '../../assets/ui/front_image.gif';
import rodrigoUrl from '../../assets/ui/Rodrigo.png';
import skullUrl from '../../assets/ui/pixelart_skull.png';
import { PLATFORM_STYLES, type PlatformType } from '../../game/types';
import { routeHref } from '../router';

/** Cloud colors and what they do (colors come from the game itself, so they always match). */
const CLOUD_COLORS = [
  { name: 'Amarelo', type: 'Double', effect: 'Dobra os pontos ganhos' },
  { name: 'Azul', type: 'SlowTime', effect: 'O tempo fica devagar' },
  { name: 'Verde', type: 'ExtraLife', effect: 'Te dá mais uma vida' },
  { name: 'Laranja', type: 'Guard', effect: 'Escudo: te protege da próxima nuvem ruim' },
  { name: 'Salmão', type: 'Shuffle', effect: 'Mistura as letras' },
  { name: 'Rosa', type: 'Reverse', effect: 'Inverte a palavra' },
  { name: 'Cinza', type: 'Fog', effect: 'Neblina: esconde algumas letras com "?"' },
  { name: 'Anil', type: 'Storm', effect: 'Tempestade: a nuvem despenca, pule rápido!' },
  { name: 'Vermelho', type: 'Death', effect: 'Mata a Willow!' },
] as const satisfies readonly { name: string; type: PlatformType; effect: string }[];

const ART_CREDITS = [
  { what: 'Background da TV', who: 'Pico-8', href: 'https://www.lexaloffle.com/pico-8.php' },
  { what: 'Bruxa', who: '9E0', href: 'https://9e0.itch.io/witches-pack' },
  {
    what: 'Janela',
    who: 'Vecteezy',
    href: 'https://pt.vecteezy.com/arte-vetorial/7530655-vector-pixel-windows-for-games',
  },
  { what: 'Torre', who: 'Pizza Tower', href: 'https://store.steampowered.com/app/2231450/Pizza_Tower/' },
  { what: 'Nuvem', who: 'Mega Voxels', href: 'https://www.megavoxels.com/learn/how-to-make-pixel-art-clouds/' },
  {
    what: 'Terra',
    who: 'George Chairborn',
    href: 'https://stock.adobe.com/br/images/colorful-simple-flat-pixel-art-illustration-of-cartoon-outdoor-landscape-background-pixel-arcade-screen-for-game-design-game-design-concept-in-retro-style/449685130',
  },
  { what: 'Caveira', who: 'FancySnacks', href: 'https://opengameart.org/content/pixel-art-skull' },
  {
    what: 'Quadro do Doodle Jump',
    who: 'Doodle Jump Jornal',
    href: 'https://www.amazon.com.br/Doodle-Jump-Journal-Lima-Sky/dp/1452101183',
  },
  { what: 'Música', who: 'Abstraction', href: 'https://soundcloud.com/abstraction/albums' },
  {
    what: 'Efeito sonoro',
    who: 'Mixkit (Fantasy game sweep notification)',
    href: 'https://mixkit.co/free-sound-effects/magic/',
  },
  { what: 'Efeito fumaça', who: 'NYKNCK', href: 'https://nyknck.itch.io' },
] as const;

const PROGRAMMERS = [
  {
    name: 'Matheus Nunes Santana',
    photo: danteUrl,
    github: 'Humanaice',
    email: 'matheusnsantana@gmail.com',
    linkedin: 'https://www.linkedin.com/in/matheus-santana-36058a266/',
    linkedinLabel: 'Matheus Santana',
  },
  {
    name: 'Rodrigo do Vale Stankowicz',
    photo: rodrigoUrl,
    github: 'rodrigovalest',
    email: 'rodrigo.vale.st@gmail.com',
    linkedin: 'https://www.linkedin.com/in/rodrigo-do-vale-stankowicz-8a6529288/',
    linkedinLabel: 'Rodrigo do Vale',
  },
] as const;

/** "Manual e Créditos" section of the original home page. */
export function ManualCredits() {
  return (
    <div id="manual" className="manual">
      <section className="manual-hero">
        <div className="manual-hero-text">
          <h2 className="big-title">Conjure Magias para Alcançar o Inalcançável</h2>
          <p className="big-subtitle">Nesse jogo de digitação, use a sua magia e ajude a bruxa Willow a chegar no espaço!</p>
          <button
            type="button"
            className="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Jogue Agora!
          </button>
        </div>
        <img className="manual-hero-image" src={frontImageUrl} alt="A bruxa Willow subindo nas nuvens" />
      </section>

      <section className="manual-howto">
        <h2 className="md-title">Como Jogar</h2>
        <p className="md-subtitle">
          Uma Bruxa consegue chegar no espaço? Claro que sim, bom, com a sua ajuda! Magic Words é um jogo de digitação
          infinito, onde você ajuda a Bruxa Willow a realizar o seu sonho de visitar o espaço sideral!
        </p>

        <div className="bubble-grid">
          <article className="bubble">
            <h3>Suba nas Nuvens</h3>
            <div className="bubble-row">
              <p>
                A Willow consegue sumonar nuvens que caem do céu. Mas para subir em cima delas, ela terá que realizar
                uma magia digitando a palavra corretamente, assim conseguindo continuar na sua missão!
              </p>
              <div className="bubble-art">
                <img className="witch-gif" src={bruxaIdleUrl} alt="" />
                <img className="cloud-img" src={cloudUrl} alt="" />
              </div>
            </div>
          </article>

          <article className="bubble">
            <h3>Nuvens Mágicas</h3>
            <p>Diferentes nuvens podem ajudar ou dificultar a vida da Willow, então preste atenção nas cores das nuvens:</p>
            <ul className="color-list">
              {CLOUD_COLORS.map((c) => (
                <li key={c.name}>
                  <span className="color-chip" style={{ color: PLATFORM_STYLES[c.type].textColor }}>
                    {c.name}
                  </span>
                  <span>{c.effect}</span>
                </li>
              ))}
            </ul>
            <p>
              Nuvens brancas são normais. Não se preocupe: em todo degrau (e em toda leva de nuvens no modo Random)
              sempre há pelo menos uma nuvem que não é perigosa.
            </p>
          </article>

          <article className="bubble">
            <h3>Não Morra</h3>
            <p>
              As nuvens desaparecem ao sair da tela, então a Willow tem que ficar trocando de nuvem para não morrer, mas
              tenha cuidado para não subir em uma nuvem com letras vermelhas!
              <br />
              Caso você morra, mas tenha mais uma vida, não se estresse, a Willow irá renascer e você poderá digitar
              qualquer palavra que vier!
            </p>
            <div className="bubble-art">
              <img className="witch-icon" src={bruxaIdleUrl} alt="" />
              <img className="skull-img" src={skullUrl} alt="" />
            </div>
          </article>

          <article className="bubble">
            <h3>Escolha o seu modo de Jogar</h3>
            <p>
              Há dois modos de Jogo: o Stairs e o Random.
              <br />
              No modo Stairs sempre aparecerão três nuvens para a Willow escolher, sendo que ela pode escolher somente
              uma, enquanto no modo Random, pode aparecer entre uma até três nuvens, podendo a Willow subir em todas
              elas caso queira.
            </p>
            <div className="bubble-art">
              <img className="cloud-img" src={cloudUrl} alt="" />
              <span className="mystery">?</span>
              <img className="cloud-img" src={cloudUrl} alt="" />
            </div>
          </article>
        </div>
      </section>

      <section className="manual-leaderboard">
        <h2 className="md-title">Leaderboard</h2>
        <div className="bubble bubble-wide">
          <p>
            Quem chegou mais longe no espaço? Você ou seus amigos? Quem é a melhor bruxa do mundo? Ao terminar uma
            partida, digite um apelido para colocar a sua pontuação no placar do modo que você jogou. Cada modo (Stairs
            e Random) tem o seu próprio placar!
          </p>
          <div className="bubble-art">
            <img className="witch-big" src={bruxaGifUrl} alt="" />
            <a className="button" href={routeHref({ name: 'leaderboard', mode: 'stairs' })}>
              Ver Leaderboard
            </a>
            <img className="witch-big mirrored" src={bruxaGifUrl} alt="" />
          </div>
        </div>
      </section>

      <section className="manual-credits">
        <h2 className="md-title">Créditos</h2>
        <div className="credits-grid">
          <div>
            <h3 className="credits-heading">Programadores</h3>
            <ul className="programmers">
              {PROGRAMMERS.map((p) => (
                <li key={p.github} className="programmer">
                  <img src={p.photo} alt={`Foto de ${p.name}`} />
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      GitHub: <a href={`https://github.com/${p.github}`}>{p.github}</a>
                    </span>
                    <span>E-mail: {p.email}</span>
                    <span>
                      LinkedIn: <a href={p.linkedin}>{p.linkedinLabel}</a>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="credits-heading">Arte feita por:</h3>
            <ul className="art-credits">
              {ART_CREDITS.map((c) => (
                <li key={c.what}>
                  {c.what}: <a href={c.href}>{c.who}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <div className="manual-ground" aria-hidden="true" />
    </div>
  );
}
