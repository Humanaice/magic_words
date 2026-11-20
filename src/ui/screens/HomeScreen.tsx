import { useState } from 'react';
import groundUrl from '../../assets/sprites/Ground.png';
import towerUrl from '../../assets/sprites/Tower.png';
import { Icon } from '../components/Icons';
import { ManualCredits } from '../components/ManualCredits';
import { Room, Tv } from '../components/Room';
import { routeHref } from '../router';

export function HomeScreen() {
  const [tvOn, setTvOn] = useState(true);

  return (
    <div className="home">
      <Room className="home-room">
        <Tv
          off={!tvOn}
          controls={
            <button
              type="button"
              className={`round-button power-button${tvOn ? '' : ' is-off'}`}
              onClick={() => setTvOn((on) => !on)}
              aria-pressed={!tvOn}
              aria-label={tvOn ? 'Desligar a TV' : 'Ligar a TV'}
            >
              <Icon name="power" />
            </button>
          }
        >
          <div className="title-screen" hidden={!tvOn}>
            <img src={towerUrl} className="title-tower" alt="" aria-hidden="true" />
            <img src={groundUrl} className="title-ground" alt="" aria-hidden="true" />
            <div className="title-content">
              <h1 className="game-title">Magic Words</h1>
              <nav className="mode-picker" aria-label="Modos de jogo">
                <a className="button button-mode" href={routeHref({ name: 'play', mode: 'stairs' })}>
                  Stairs
                </a>
                <span className="mode-label" aria-hidden="true">
                  MODE
                </span>
                <a className="button button-mode" href={routeHref({ name: 'play', mode: 'random' })}>
                  Random
                </a>
              </nav>
              <a className="button" href={routeHref({ name: 'leaderboard', mode: 'stairs' })}>
                Leaderboard
              </a>
            </div>
          </div>
        </Tv>
      </Room>

      <button
        type="button"
        className="divider"
        onClick={() => document.getElementById('manual')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <Icon name="arrowDown" size={30} />
        <span>Manual e Créditos</span>
        <Icon name="arrowDown" size={30} />
      </button>

      <ManualCredits />
    </div>
  );
}
