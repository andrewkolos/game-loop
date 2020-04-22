import { EventEmitter } from 'typed-event-emitter';
import { UpdateHandler } from './update-handler';
import { GameStepDroppedHandler } from './game-step-dropped-handler';
import { GameStepper } from './game-stepper';
import { GameLoopOptions } from './game-loop-options';

/**
 * Executes (game/physics) logic at a constant rate across any hardware using a fixed time step.
 */
export class GameLoop extends EventEmitter {

  /**
   * Adds a listener that is called when the loop has finished an iteration.
   */
  public onUpdate = this.registerEvent<UpdateHandler>();

  /**
   * Adds a listener that is called when calls to the loop's step function are
   * dropped due to game steps taking too long.
   */
  public onGameStepDropped = this.registerEvent<GameStepDroppedHandler>();

  private previousStepTime: number = 0;
  private residualDelay: number = 0;
  private delayClamp: number;
  private stepRate: number;

  private tickIntervalId?: number;
  private readonly stepHandler: GameStepper;

  private get msPerStep() {
    return 1000 / this.stepRate;
  }

  /**
   * Creates a game loop. The loop is stopped by default.
   * @param gameUpdateFn Function that advances the state of the game by one game step.
   * @param stepRateHz How often a game step occurs, in hertz.
   * @param [opts] Additional options.
   */
  public constructor(gameUpdateFn: GameStepper, stepRateHz: number, opts: GameLoopOptions = {}) {
    super();

    const completeOpts = provideDefaultsForMissingOpts();

    this.stepHandler = gameUpdateFn;
    this.stepRate = stepRateHz;
    this.delayClamp = completeOpts.delayClampMs;

    function provideDefaultsForMissingOpts(): Required<GameLoopOptions> {
      return {
        delayClampMs: opts.delayClampMs != null ? opts.delayClampMs : 200,
      };
    }
  }

  /**
   * Starts the loop.
   * @param stepRateHz How often the game should advance its state.
   */
  public start() {
    this.stop();
    this.tickIntervalId = setInterval(() => this.update(), this.stepRate) as any;
    this.previousStepTime = currentTime();
  }

  /**
   * Stops the loop.
   */
  public stop(): void {
    clearInterval(this.tickIntervalId);
  }

  /**
   * Determines whether the game is running.
   * @returns true if the game is running.
   */
  public isRunning() {
    return this.tickIntervalId != null;
  }

  private update() {
    const now = currentTime();

    this.residualDelay += now - this.previousStepTime;
    this.previousStepTime = now;

    this.clampResidualDelay();

    while (this.residualDelay >= this.msPerStep) {
      this.stepHandler();
      this.residualDelay -= this.msPerStep;
    }

    this.emit(this.onUpdate, this.residualDelay);
  }

  private clampResidualDelay() {
    if (this.residualDelay > this.delayClamp) {
      this.emit(this.onGameStepDropped, this.residualDelay - this.delayClamp);
      this.residualDelay = Math.min(this.residualDelay, this.delayClamp);
    }
  }
}

function currentTime() {
  return new Date().getTime();
}
