import { describe, expect, it } from 'vitest';
import { classifyGesture, flickThreshold } from '@/lib/gesture';

describe('flickThreshold', () => {
  it('25 % del ancho de la tecla', () => {
    expect(flickThreshold(80)).toBe(20);
    expect(flickThreshold(100)).toBe(25);
  });
  it('mínimo 15 px', () => {
    expect(flickThreshold(40)).toBe(15);
    expect(flickThreshold(0)).toBe(15);
  });
});

describe('classifyGesture (tecla de 80 px → umbral 20 px)', () => {
  const W = 80;
  it('sin moverse o poco: toque', () => {
    expect(classifyGesture(0, 0, W)).toBe('tap');
    expect(classifyGesture(19, 0, W)).toBe('tap');
    expect(classifyGesture(-12, 12, W)).toBe('tap'); // ≈17 px
  });
  it('justo en el umbral ya es deslizar', () => {
    expect(classifyGesture(20, 0, W)).toBe('right');
  });
  it('las 4 direcciones (y hacia abajo es positiva)', () => {
    expect(classifyGesture(-30, 0, W)).toBe('left');
    expect(classifyGesture(30, 0, W)).toBe('right');
    expect(classifyGesture(0, -30, W)).toBe('up');
    expect(classifyGesture(0, 30, W)).toBe('down');
  });
  it('manda el eje dominante en diagonales', () => {
    expect(classifyGesture(-40, -25, W)).toBe('left');
    expect(classifyGesture(10, -40, W)).toBe('up');
    expect(classifyGesture(35, 34, W)).toBe('right');
    expect(classifyGesture(-34, 35, W)).toBe('down');
  });
  it('empate exacto → horizontal', () => {
    expect(classifyGesture(30, 30, W)).toBe('right');
    expect(classifyGesture(-30, -30, W)).toBe('left');
  });
  it('la diagonal cuenta por distancia, no por eje', () => {
    // 15 y 15 → 21 px > 20: ya es deslizar
    expect(classifyGesture(15, -15, W)).toBe('right');
  });
});

import { clampFanX } from '@/lib/gesture';

describe('clampFanX', () => {
  it('centrado en la tecla si cabe', () => {
    expect(clampFanX(200, 50, 400)).toBe(200);
  });
  it('se desplaza para no salirse por los lados', () => {
    expect(clampFanX(30, 50, 400)).toBe(75);
    expect(clampFanX(390, 50, 400)).toBe(325);
  });
  it('contenedor más estrecho que la cruz: centrado', () => {
    expect(clampFanX(10, 50, 100)).toBe(50);
  });
});
