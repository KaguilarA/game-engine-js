import { signalValue } from 'reactive-values';

/**
 * Reactive value holding the current window state (orientation, width, height).
 */
const screenInfo = signalValue({
  orientation:
    window.innerHeight > window.innerWidth ? "portrait" : "landscape",
  width: window.innerWidth,
  height: window.innerHeight,
});

window.addEventListener("resize", () => screenInfo.set({
  orientation:
    window.innerHeight > window.innerWidth ? "portrait" : "landscape",
  width: window.innerWidth,
  height: window.innerHeight,
}));

/**
 * Provides reactive window size and orientation state, and a method to update it.
 */
export default screenInfo;