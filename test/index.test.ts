import { GameLoop } from '../src/game-loop';

describe(nameof(GameLoop), () => {

  it('does not call the game step function significantly early', (done: jest.DoneCallback) => {
    // TODO: figure out if this can be properly tested with mock timers
    // to speed up test.

    const stepRateHz = 60;
    const stepsToRun = 30;

    let stepCount = 0;
    let timeOfLastStep = new Date().getTime();

    const gameLoop = new GameLoop(step, stepRateHz);

    gameLoop.start();

    let isFirstStep = true;
    function step() {

      const now = new Date().getTime();
      const dt = now - timeOfLastStep;
      timeOfLastStep = now;

      if (!isFirstStep) {
        const interval = hzToMs(stepRateHz);
        expect(dt).toBeGreaterThanOrEqual(Math.floor(interval));
      }
      isFirstStep = false;

      if (stepCount > stepsToRun) {
        gameLoop.stop();
        done();
      }
      stepCount++;
    };
  });

  describe('clamping', () => {
    it('does not drop steps with a sufficiently fast step fn', () => {
      const stepIntervalMs = 50;
      const delayClampMs = 100;
      const stepsToRun = 5;

      let steps = 0;
      function step() {
        if (steps > stepsToRun) {
          loop.stop();
          expect(stepDroppedHandler).toHaveBeenCalledTimes(0);
        }
        steps++;
      }

      const stepDroppedHandler = jest.fn();
      const loop = new GameLoop(step, msToHz(stepIntervalMs), {
        delayClampMs,
      }).start();
      loop.onGameStepDropped(stepDroppedHandler);
    });

    it('drops game steps if step fn takes too long', (done: jest.DoneCallback) => {
      const stepIntervalMs = 10;
      const delayClampMs = 30;

      let isFirstStep = true;
      function step() {
        if (isFirstStep) {
          busyWaitUntilClampExceeded();
          isFirstStep = false;
        } else {
          const timeLostMs: number = stepDroppedHandler.mock.calls[0][0];
          expect(timeLostMs).toBeLessThanOrEqual(stepIntervalMs + 1); // Add one because of setTimeout inprecision.
          expect(timeLostMs).toBeGreaterThan(0);
          loop.stop();
          done();
        }

        function busyWaitUntilClampExceeded() {
          const start = new Date().getTime();
          while (true) {
            const elapsed = new Date().getTime() - start;
            if (elapsed > delayClampMs) {
              break;
            }
          }
        }
      }
      const stepDroppedHandler = jest.fn();

      const loop = new GameLoop(step, msToHz(stepIntervalMs), {
        delayClampMs,
      }).start();
      loop.onGameStepDropped(stepDroppedHandler);
    });
  });
});

function hzToMs(hz: number) {
  return 1000 / hz;
}

function msToHz(ms: number) {
  return 1000 / ms;
}