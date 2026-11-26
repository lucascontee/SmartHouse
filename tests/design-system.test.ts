import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootDir = resolve(__dirname, '..');

describe('Design System Monocromático & Regras Base', () => {
  const systemCss = readFileSync(resolve(rootDir, 'src/styles/system.css'), 'utf8');
  const motionCss = readFileSync(resolve(rootDir, 'src/styles/motion.css'), 'utf8');
  const hudCss = readFileSync(resolve(rootDir, 'src/styles/hud.css'), 'utf8');
  const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');

  it('define todos os tokens fixos monocromáticos em :root', () => {
    expect(systemCss).toContain('--bg: #070708;');
    expect(systemCss).toContain('--surface: #111113;');
    expect(systemCss).toContain('--ink: #FAFAFA;');
    expect(systemCss).toContain('--muted: #71717A;');
    expect(systemCss).toContain('--accent: #E4E4E7;');
    expect(systemCss).toContain('--border: rgba(255, 255, 255, 0.08);');
    expect(systemCss).toContain('--border-active: rgba(255, 255, 255, 0.24);');
  });

  it('impõe data-radius="sharp", viewport fixa 100dvh e botões solid/tonal com >= 44px', () => {
    expect(indexHtml).toContain('data-radius="sharp"');
    expect(systemCss).toContain('height: 100dvh;');
    expect(hudCss).toContain('height: 100dvh;');
    expect(systemCss).toContain('--touch-min: 44px;');
    expect(systemCss).toContain('.btn-solid');
    expect(systemCss).toContain('.btn-tonal');
    expect(systemCss).toContain('font-variant-numeric: tabular-nums;');
  });

  it('respeita prefers-reduced-motion e não cria artefato bloqueado .taste-skill/build.json', () => {
    expect(motionCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(existsSync(resolve(rootDir, '.taste-skill/build.json'))).toBe(false);
  });
});
