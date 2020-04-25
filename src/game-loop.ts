import { EventEmitter } from 'typed-event-emitter';
import { UpdateHandler } from './update-handler';
import { GameStepDroppedHandler } from './game-step-dropped-handler';
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

  /**
   * Whether or not the loop is running.
   */
  public get isRunning() {
    return this._isRunning;
  }

  /**
   * How much time is remaining after the most recent step, represented as an
   * alpha value between the time of the last step and the time of the next step.
   * This is useful as a blending factor for interpolating game states to get
   * a new state for rendering.
   */
  public get residualDelayAlpha() {
    return this.residualDelayMs / this.stepIntervalMs;
  }

  private stepRate: number;
  private previousStepTime: number = currentTime();
  private residualDelayMs: number = 0;
  private delayClamp: number;
  private _isRunning: boolean = false;

  private readonly stepFn: () => void;

  private get stepIntervalMs() {
    return 1000 / this.stepRate;
  }

  /**
   * Creates a game loop. The loop is stopped by default.
   * @param stepFn Function that advances the state of the game by one game step.
   * @param stepRateHz How often a game step occurs, in hertz.
   * @param [opts] Additional options.
   */
  public constructor(stepFn: () => void, stepRateHz: number, opts: GameLoopOptions = {}) {
    super();
    const completeOpts = provideDefaultsForMissingOpts();
    this.stepFn = stepFn;
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
   * @returns This instance of the game loop.
   */
  public start(): this {
    this.stop();
    this.previousStepTime = currentTime();
    this._isRunning = true;
    this.update();

    return this;
  }

  /**
   * Stops the loop.
   */
  public stop(): void {
    this._isRunning = false;
  }

  private update() {
    if (!this._isRunning) {
      // This update was enqueued before the stop method was called.
      return;
    }

    this.queueNextIteration();

    const now = currentTime();
    this.residualDelayMs += now - this.previousStepTime;
    this.previousStepTime = now;

    this.clampResidualDelay();

    while (this.residualDelayMs >= this.stepIntervalMs) {
      this.stepFn();
      this.residualDelayMs -= this.stepIntervalMs;
    }

    this.emit(this.onUpdate, this.residualDelayAlpha);
  }

  private clampResidualDelay() {
    if (this.residualDelayMs > this.delayClamp) {
      this.emit(this.onGameStepDropped, this.residualDelayMs - this.delayClamp);
      this.residualDelayMs = Math.min(this.residualDelayMs, this.delayClamp);
    }
  }

  private queueNextIteration() {
    setTimeout(() => this.update(), this.stepIntervalMs);
  }
}

function currentTime() {
  return new Date().getTime();
}
