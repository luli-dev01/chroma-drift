// Keyboard and mouse input, gathered into one plain object the world reads.
// The game never listens inside its update loop; listeners only record state.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    pressed: new Set(),   // keys that went down since the last frame
  };

  const down = (event) => {
    if (event.repeat) return;
    input.keys.add(event.code);
    input.pressed.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  };
  const up = (event) => input.keys.delete(event.code);
  const move = (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = event.clientX - rect.left;
    input.mouseY = event.clientY - rect.top;
  };
  const mouseDown = (event) => {
    move(event);
    input.mouseDown = true;
    input.pressed.add('Mouse');
  };
  const mouseUp = () => { input.mouseDown = false; };
  const blur = () => { input.keys.clear(); input.mouseDown = false; };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);

  return {
    input,
    // Movement as a unit-ish vector from WASD or the arrow keys.
    moveVector() {
      let x = 0;
      let y = 0;
      if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) x -= 1;
      if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) x += 1;
      if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) y -= 1;
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    firing() {
      return input.mouseDown || input.keys.has('Space');
    },
    wasPressed(code) {
      return input.pressed.has(code);
    },
    endFrame() {
      input.pressed.clear();
    },
    destroy() {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mouseup', mouseUp);
    },
  };
}
