import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Book } from '../db/schema';

export function canvasOf(width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  return canvas;
}

export function textureOf(canvas: HTMLCanvasElement) {
  const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace;
  return map;
}

function paper(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#f1ead9'; ctx.fillRect(0, 0, width, height);
  let seed = 421;
  for (let i = 0; i < width * height / 45; i++) {
    seed = (seed * 16807) % 2147483647; const x = seed % width;
    seed = (seed * 16807) % 2147483647; const y = seed % height;
    ctx.fillStyle = i % 4 ? '#433a2925' : '#433a2955';
    ctx.fillRect(x, y, 0.6, 0.8);
  }
}

export function coverCanvas(book: Book) {
  const canvas = canvasOf(384, 576); const ctx = canvas.getContext('2d')!;
  paper(ctx, 384, 576);
  ctx.strokeStyle = '#4d473e'; ctx.lineWidth = 2; ctx.strokeRect(14, 14, 356, 548);
  ctx.fillStyle = '#37342d'; ctx.font = '28px Georgia, serif'; ctx.textAlign = 'center';
  // Break Thai/no-space titles by code point when necessary; never crop the label.
  let line = ''; const lines: string[] = [];
  for (const char of book.title) {
    if (ctx.measureText(line + char).width > 310 && line) { lines.push(line); line = char; } else line += char;
  }
  lines.push(line);
  lines.slice(0, 7).forEach((text, i) => ctx.fillText(text, 192, 190 + i * 39, 310));
  ctx.font = '18px Georgia, serif'; ctx.fillText(book.author ?? '', 192, 470, 300);
  ctx.font = '14px sans-serif'; ctx.fillText('ยังไม่มีภาพปก', 192, 520);
  return canvas;
}

export function spineCanvas(book: Book, toned: boolean) {
  const canvas = canvasOf(128, 576); const ctx = canvas.getContext('2d')!;
  paper(ctx, 128, 576);
  if (toned) { ctx.globalAlpha = 0.16; ctx.fillStyle = book.color; ctx.fillRect(0, 0, 128, 576); ctx.globalAlpha = 1; }
  ctx.strokeStyle = '#493f30'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(7, 576); ctx.moveTo(119, 0); ctx.lineTo(121, 576); ctx.stroke();
  [27, 35, 530, 541].forEach(y => { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(118, y + 1); ctx.stroke(); });
  ctx.save(); ctx.translate(64, 288); ctx.rotate(Math.PI / 2);
  ctx.fillStyle = '#393428'; ctx.font = '31px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(book.title, 0, 0, 450); ctx.restore();
  return canvas;
}

export function pageCanvas() {
  const canvas = canvasOf(384, 96); const ctx = canvas.getContext('2d')!;
  paper(ctx, 384, 96);
  for (let y = 4; y < 94; y += 5) {
    ctx.strokeStyle = y % 3 ? '#554b3e70' : '#554b3e35'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(95, y + 1, 230, y - 1, 384, y + (y % 3)); ctx.stroke();
  }
  return canvas;
}

export function backCanvas() {
  const canvas = canvasOf(192, 288); const ctx = canvas.getContext('2d')!;
  paper(ctx, 192, 288);
  ctx.strokeStyle = '#726550'; ctx.strokeRect(8, 8, 176, 272);
  return canvas;
}
