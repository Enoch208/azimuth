import keeperFound from "@/assets/found.png";
import keeperBearing from "@/assets/bearing.png";
import keeperSad from "@/assets/sad.png";
import {
  GLYPH_BOX,
  GLYPH_STROKE,
  TEMPERATURE_PATHS,
  UNREAD_PATHS,
  type GlyphPath,
} from "@/components/marks/temperature-paths";
import { sealedLeaks, type ResultCard } from "@/lib/result-card";
import type { Temperature } from "@/lib/daily";

// Drawn straight onto a canvas rather than screenshotting the DOM. Canvas text
// uses fonts already loaded by the page, so the card comes out in Unbounded
// instead of a fallback, and it needs no dependency to do it.
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1500;

const INK = "#100f06";
const PAPER = "#f5f4ed";
const PAPER_RAISED = "#fbfaf5";
const PAPER_SUNK = "#ded9c7";
const INK_SOFT = "#4a4739";
const INK_FAINT = "#6e6a59";
const GOLD = "#ffda57";
const TEAL = "#00917a";

const FILL: Record<Temperature, string> = {
  0: "#00917a",
  1: "#e2543c",
  2: "#b87d05",
  3: "#e5a00d",
  4: "#2f7da8",
  5: PAPER_SUNK,
};

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`could not load ${src}`));
    image.src = src;
  });
}

// next/font generates hashed family names, so the real stack is read back off
// the document rather than guessed.
function familyOf(className: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.className = className;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family || fallback;
}

// "TREASURE FOUND" and "THE TRAIL WENT COLD" are far wider than "SO CLOSE".
// The headline shrinks to the panel rather than bleeding off both edges.
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  family: string,
  weight = 500,
): string {
  let size = startPx;
  while (size > 28) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return `${weight} ${size}px ${family}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  paths: GlyphPath[],
  x: number,
  y: number,
  size: number,
  colour: string,
) {
  const scale = size / GLYPH_BOX;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = GLYPH_STROKE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const path of paths) {
    const shape = new Path2D(path.d);
    if (path.filled) ctx.fill(shape);
    else ctx.stroke(shape);
  }
  ctx.restore();
}

function keeperFor(card: ResultCard): string {
  if (card.found) return card.kind === "sealed" ? keeperBearing.src : keeperFound.src;
  return keeperSad.src;
}

export async function renderResultCard(card: ResultCard): Promise<Blob> {
  // Last line of defence. If a sealed card ever gains a leaking field, no image
  // is produced at all rather than one that quietly gives the day away.
  if (card.kind === "sealed") {
    const leaks = sealedLeaks(card, []);
    if (leaks.length > 0) {
      throw new Error(`refusing to export a sealed card that leaks: ${leaks.join(", ")}`);
    }
  }

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const display = familyOf("font-display", "sans-serif");
  const sans = familyOf("font-sans", "sans-serif");

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is unavailable");

  // Paper and its grid.
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  ctx.strokeStyle = "rgba(16,15,6,0.07)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= CARD_WIDTH; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CARD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= CARD_HEIGHT; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CARD_WIDTH, y);
    ctx.stroke();
  }

  // The panel, with the house hard shadow.
  const M = 64;
  const panel = { x: M, y: M, w: CARD_WIDTH - M * 2, h: CARD_HEIGHT - M * 2 };
  ctx.fillStyle = INK;
  roundRect(ctx, panel.x + 14, panel.y + 14, panel.w, panel.h, 34);
  ctx.fill();
  ctx.fillStyle = PAPER_RAISED;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 34);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();

  const left = panel.x + 56;
  const right = panel.x + panel.w - 56;

  // Masthead.
  ctx.fillStyle = INK;
  ctx.font = `500 30px ${display}`;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "10px";
  ctx.fillText("AZIMUTH", left, panel.y + 82);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = INK_FAINT;
  ctx.font = `600 26px ${sans}`;
  ctx.textAlign = "right";
  ctx.letterSpacing = "5px";
  ctx.fillText(`#${card.huntNumber}`, right, panel.y + 82);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";

  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(left, panel.y + 116);
  ctx.lineTo(right, panel.y + 116);
  ctx.stroke();

  // The Keeper.
  const keeper = await load(keeperFor(card));
  const kh = 340;
  const kw = (keeper.width / keeper.height) * kh;
  ctx.drawImage(keeper, CARD_WIDTH / 2 - kw / 2, panel.y + 150, kw, kh);

  let y = panel.y + 560;

  // Identity.
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `600 40px ${sans}`;
  if (card.identity.callsign) {
    ctx.letterSpacing = "3px";
    ctx.fillText(card.identity.callsign.toUpperCase(), CARD_WIDTH / 2, y);
    ctx.letterSpacing = "0px";
    y += 44;
    ctx.fillStyle = INK_FAINT;
    ctx.font = `500 30px ${sans}`;
    ctx.fillText(card.identity.wallet, CARD_WIDTH / 2, y);
  } else {
    ctx.fillText(card.identity.wallet, CARD_WIDTH / 2, y);
  }

  // Headline.
  y += 108;
  ctx.fillStyle = card.found ? TEAL : INK;
  ctx.font = fitFont(ctx, card.headline.toUpperCase(), right - left, 96, display);
  ctx.fillText(card.headline.toUpperCase(), CARD_WIDTH / 2, y);

  // Digs.
  y += 62;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 38px ${sans}`;
  ctx.fillText(`${card.digsUsed} / ${card.digsAllowed} digs`, CARD_WIDTH / 2, y);

  if (card.kind === "revealed" && card.closestLine) {
    y += 48;
    ctx.fillStyle = INK_SOFT;
    ctx.font = `500 34px ${sans}`;
    ctx.fillText(`Closest dig: ${card.closestLine}`, CARD_WIDTH / 2, y);
  }

  // Trail.
  y += 76;
  const chip = 76;
  const gap = 14;
  const total = card.trail.length * chip + Math.max(0, card.trail.length - 1) * gap;
  let cx = CARD_WIDTH / 2 - total / 2;
  for (const temperature of card.trail) {
    ctx.fillStyle = temperature === null ? PAPER_SUNK : FILL[temperature];
    roundRect(ctx, cx, y, chip, chip, 16);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.stroke();
    drawGlyph(
      ctx,
      temperature === null ? UNREAD_PATHS : TEMPERATURE_PATHS[temperature],
      cx + chip / 2 - 22,
      y + chip / 2 - 22,
      44,
      INK,
    );
    cx += chip + gap;
  }
  y += chip;

  // Outcome block, anchored above the footer so both variants sit the same way
  // rather than leaving the sealed card bottom-heavy with empty paper.
  const blockH = 168;
  const blockY = panel.y + panel.h - 130 - blockH;
  if (card.kind === "sealed") {
    ctx.fillStyle = INK;
    roundRect(ctx, left, blockY, right - left, blockH, 24);
    ctx.fill();

    ctx.fillStyle = GOLD;
    ctx.font = `700 32px ${sans}`;
    ctx.letterSpacing = "5px";
    ctx.fillText("YOUR RESULT IS SEALED", CARD_WIDTH / 2, blockY + 66);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = "rgba(245,244,237,0.72)";
    ctx.font = `500 30px ${sans}`;
    ctx.fillText(`Map opens in ${card.countdown}`, CARD_WIDTH / 2, blockY + 118);
  } else {
    const cells = [
      { label: "DAILY RANK", value: `#${card.rank}` },
      { label: "SCORE", value: `${card.score}` },
      { label: "STREAK", value: card.streak > 0 ? `${card.streak}d` : "—" },
    ];
    const cellW = (right - left - 28) / 3;
    cells.forEach((cell, index) => {
      const x = left + index * (cellW + 14);
      ctx.fillStyle = index === 0 ? GOLD : PAPER;
      roundRect(ctx, x, blockY, cellW, blockH, 24);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = INK_FAINT;
      ctx.font = `700 22px ${sans}`;
      ctx.letterSpacing = "4px";
      ctx.fillText(cell.label, x + cellW / 2, blockY + 54);
      ctx.letterSpacing = "0px";

      ctx.fillStyle = INK;
      ctx.font = `500 68px ${display}`;
      ctx.fillText(cell.value, x + cellW / 2, blockY + 128);
    });
  }

  // Footer. Two lines: the game's own line, and what makes it possible — a
  // card is the only part of AZIMUTH a stranger sees, so the confidentiality
  // it is bragging about should be attributed on it.
  ctx.fillStyle = INK_FAINT;
  ctx.font = `500 26px ${sans}`;
  ctx.letterSpacing = "3px";
  ctx.fillText("THE CHAIN KNOWS. YOU DON'T.", CARD_WIDTH / 2, panel.y + panel.h - 86);

  ctx.fillStyle = TEAL;
  ctx.font = `700 22px ${sans}`;
  ctx.letterSpacing = "4px";
  ctx.fillText("POWERED BY INCO ON BASE", CARD_WIDTH / 2, panel.y + panel.h - 44);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("could not encode the card"))),
      "image/png",
    );
  });
}

export function cardFilename(card: ResultCard): string {
  return `azimuth-${card.huntNumber}-${card.kind}.png`;
}
