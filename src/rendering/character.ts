import { type CharacterMapInfo, Direction, Gender, SitState } from 'eolib';
import { GAME_WIDTH, HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from '../game-state';
import { GfxType, getBitmapById } from '../gfx';
import { isoToScreen } from '../utils/iso-to-screen';
import type { Vector2 } from '../vector';

export enum CharacterState {
  Standing = 0,
  Walking = 1,
  SitGround = 2,
  Attacking = 3,
}

const CHARACTER_WIDTH = 18;
const HALF_CHARACTER_WIDTH = CHARACTER_WIDTH / 2;
const CHARACTER_WALKING_WIDTH = 26;
const HALF_CHARACTER_WALKING_WIDTH = CHARACTER_WALKING_WIDTH / 2;
const CHARACTER_SIT_GROUND_WIDTH = 24;
const HALF_CHARACTER_SIT_GROUND_WIDTH = CHARACTER_SIT_GROUND_WIDTH / 2;
const CHARACTER_ATTACK_WIDTH = 24;
const HALF_CHARACTER_ATTACK_WIDTH = CHARACTER_ATTACK_WIDTH / 2;

const CHARACTER_HEIGHT = 58;
const CHARACTER_WALKING_HEIGHT = 61;
const CHARACTER_SIT_GROUND_HEIGHT = 43;
const CHARACTER_ATTACK_HEIGHT = 58;

const WALK_ANIMATION_FRAMES = 4;
const ATTACK_ANIMATION_FRAMES = 2;

export class CharacterRenderer {
  mapInfo: CharacterMapInfo;
  state: CharacterState = CharacterState.Standing;
  animationFrame = 0;
  walkOffset: Vector2 = { x: 0, y: 0 };

  constructor(mapInfo: CharacterMapInfo) {
    this.mapInfo = mapInfo;
    this.state =
      mapInfo.sitState === SitState.Floor
        ? CharacterState.SitGround
        : CharacterState.Standing;
    this.preloadSprites();
  }

  preloadSprites() {
    getBitmapById(GfxType.SkinSprites, 1); // standing
    getBitmapById(GfxType.SkinSprites, 2); // walking
    getBitmapById(GfxType.SkinSprites, 3); // attacking
    getBitmapById(GfxType.SkinSprites, 6); // sitting on ground
  }

  setState(state: CharacterState) {
    this.state = state;
    this.animationFrame = 0;
    this.walkOffset = { x: 0, y: 0 };
  }

 tick() {
    if (
      this.state === CharacterState.Walking ||
      this.state === CharacterState.Attacking
    ) {
      // use same tick rate for walking and attacking
      const frames =
        this.state === CharacterState.Walking
          ? WALK_ANIMATION_FRAMES
          : ATTACK_ANIMATION_FRAMES;
      this.animationFrame = (this.animationFrame + 1) % frames;
    }
  }

  render(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
    switch (this.state) {
      case CharacterState.Standing:
        this.renderStanding(ctx, playerScreen);
        break;
      case CharacterState.Walking:
        this.renderWalking(ctx, playerScreen);
        break;
      case CharacterState.SitGround:
        this.renderSittingOnGround(ctx, playerScreen);
        break;
      case CharacterState.Attacking:
        this.renderAttacking(ctx, playerScreen);
        break;
    }
  }

    renderAttacking(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
    const bmp = getBitmapById(GfxType.SkinSprites, 3); // Attack sprite sheet
    if (!bmp) {
      return;
    }

    // Attack sprite sheet layout: Female frames 0-3, Male frames 4-7
    const startX =
      this.mapInfo.gender === Gender.Female ? 0 : CHARACTER_ATTACK_WIDTH * 4;

    // Direction offset: Down/Right = 0, Up/Left = 2 frames ahead
    const directionOffset = [Direction.Up, Direction.Left].includes(
      this.mapInfo.direction,
    )
      ? CHARACTER_ATTACK_WIDTH * ATTACK_ANIMATION_FRAMES
      : 0;

    const sourceX =
      startX + directionOffset + CHARACTER_ATTACK_WIDTH * this.animationFrame;
    const sourceY = this.mapInfo.skin * CHARACTER_ATTACK_HEIGHT;

    const screenCoords = isoToScreen(this.mapInfo.coords);

    // Attack sprites may need different positioning offsets
    const additionalOffset = { x: 0, y: 0 };
    switch (this.mapInfo.direction) {
      case Direction.Up:
        additionalOffset.x = 0;
        break;
      case Direction.Down:
        additionalOffset.x = -2;
        break;
      case Direction.Left:
        additionalOffset.x = -4;
        break;
      case Direction.Right:
        additionalOffset.x = 4;
        break;
    }

    const screenX =
      screenCoords.x -
      HALF_CHARACTER_ATTACK_WIDTH -
      playerScreen.x +
      HALF_GAME_WIDTH +
      additionalOffset.x;

    const screenY =
      screenCoords.y -
      CHARACTER_ATTACK_HEIGHT -
      playerScreen.y +
      HALF_GAME_HEIGHT +
      4 +
      additionalOffset.y;

    const mirrored = [Direction.Right, Direction.Up].includes(
      this.mapInfo.direction,
    );

    if (mirrored) {
      ctx.save();
      ctx.translate(GAME_WIDTH, 0);
      ctx.scale(-1, 1);
    }

    const drawX = mirrored
      ? GAME_WIDTH - screenX - CHARACTER_ATTACK_WIDTH
      : screenX;

    ctx.drawImage(
      bmp,
      sourceX,
      sourceY,
      CHARACTER_ATTACK_WIDTH,
      CHARACTER_ATTACK_HEIGHT,
      drawX,
      screenY,
      CHARACTER_ATTACK_WIDTH,
      CHARACTER_ATTACK_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }


  renderStanding(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
    const bmp = getBitmapById(GfxType.SkinSprites, 1);
    if (!bmp) {
      return;
    }

    const startX =
      this.mapInfo.gender === Gender.Female ? 0 : CHARACTER_WIDTH * 2;
    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(this.mapInfo.direction)
        ? CHARACTER_WIDTH
        : 0);
    const sourceY = this.mapInfo.skin * CHARACTER_HEIGHT;

    const screenCoords = isoToScreen(this.mapInfo.coords);

    const screenX =
      screenCoords.x - HALF_CHARACTER_WIDTH - playerScreen.x + HALF_GAME_WIDTH;

    const screenY =
      screenCoords.y - CHARACTER_HEIGHT - playerScreen.y + HALF_GAME_HEIGHT + 4;

    const mirrored = [Direction.Right, Direction.Up].includes(
      this.mapInfo.direction,
    );

    if (mirrored) {
      ctx.save();
      ctx.translate(GAME_WIDTH, 0);
      ctx.scale(-1, 1);
    }

    const drawX = mirrored ? GAME_WIDTH - screenX - CHARACTER_WIDTH : screenX;

    ctx.drawImage(
      bmp,
      sourceX,
      sourceY,
      CHARACTER_WIDTH,
      CHARACTER_HEIGHT,
      drawX,
      screenY,
      CHARACTER_WIDTH,
      CHARACTER_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }

  renderSittingOnGround(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
    const bmp = getBitmapById(GfxType.SkinSprites, 6);
    if (!bmp) {
      return;
    }

    const startX =
      this.mapInfo.gender === Gender.Female
        ? 0
        : CHARACTER_SIT_GROUND_WIDTH * 2;
    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(this.mapInfo.direction)
        ? CHARACTER_SIT_GROUND_WIDTH
        : 0);
    const sourceY = this.mapInfo.skin * CHARACTER_SIT_GROUND_HEIGHT;

    const screenCoords = isoToScreen(this.mapInfo.coords);

    const additionalOffset = { x: 0, y: 0 };
    switch (this.mapInfo.direction) {
      case Direction.Up:
        additionalOffset.x = 2;
        additionalOffset.y = 11;
        break;
      case Direction.Down:
        additionalOffset.x = -4;
        additionalOffset.y = 8;
        break;
      case Direction.Left:
        additionalOffset.x = -2;
        additionalOffset.y = 12;
        break;
      case Direction.Right:
        additionalOffset.x = 4;
        additionalOffset.y = 8;
        break;
    }

    const screenX =
      screenCoords.x -
      HALF_CHARACTER_SIT_GROUND_WIDTH -
      playerScreen.x +
      HALF_GAME_WIDTH +
      additionalOffset.x;

    const screenY =
      screenCoords.y -
      CHARACTER_SIT_GROUND_HEIGHT -
      playerScreen.y +
      HALF_GAME_HEIGHT +
      additionalOffset.y;

    const mirrored = [Direction.Right, Direction.Up].includes(
      this.mapInfo.direction,
    );

    if (mirrored) {
      ctx.save();
      ctx.translate(GAME_WIDTH, 0);
      ctx.scale(-1, 1);
    }

    const drawX = mirrored
      ? GAME_WIDTH - screenX - CHARACTER_SIT_GROUND_WIDTH
      : screenX;

    ctx.drawImage(
      bmp,
      sourceX,
      sourceY,
      CHARACTER_SIT_GROUND_WIDTH,
      CHARACTER_SIT_GROUND_HEIGHT,
      drawX,
      screenY,
      CHARACTER_SIT_GROUND_WIDTH,
      CHARACTER_SIT_GROUND_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }

  renderWalking(ctx: CanvasRenderingContext2D, playerScreen: Vector2) {
    const bmp = getBitmapById(GfxType.SkinSprites, 2);
    if (!bmp) {
      return;
    }

    const startX =
      this.mapInfo.gender === Gender.Female ? 0 : CHARACTER_WALKING_WIDTH * 8;

    const sourceX =
      startX +
      ([Direction.Up, Direction.Left].includes(this.mapInfo.direction)
        ? CHARACTER_WALKING_WIDTH * WALK_ANIMATION_FRAMES
        : 0) +
      CHARACTER_WALKING_WIDTH * this.animationFrame;
    const sourceY = this.mapInfo.skin * CHARACTER_WALKING_HEIGHT;

    const screenCoords = isoToScreen(this.mapInfo.coords);

    const additionalOffset = { x: 0, y: 0 };
    if (this.mapInfo.gender === Gender.Female) {
      switch (this.mapInfo.direction) {
        case Direction.Up:
          additionalOffset.x = 0;
          additionalOffset.y = 6;
          break;
        case Direction.Down:
          additionalOffset.x = 0;
          additionalOffset.y = 6;
          break;
        case Direction.Left:
          additionalOffset.x = 0;
          additionalOffset.y = 6;
          break;
        case Direction.Right:
          additionalOffset.x = 0;
          additionalOffset.y = 6;
          break;
      }
    } else {
      switch (this.mapInfo.direction) {
        case Direction.Up:
          additionalOffset.x = 0;
          additionalOffset.y = 6;
          break;
        case Direction.Down:
          additionalOffset.x = -1;
          additionalOffset.y = 6;
          break;
        case Direction.Left:
          additionalOffset.x = 0;
          additionalOffset.y = 6;
          break;
        case Direction.Right:
          additionalOffset.x = 1;
          additionalOffset.y = 6;
          break;
      }
    }

    const screenX =
      screenCoords.x -
      HALF_CHARACTER_WALKING_WIDTH -
      playerScreen.x +
      HALF_GAME_WIDTH +
      this.walkOffset.x +
      additionalOffset.x;

    const screenY =
      screenCoords.y -
      CHARACTER_WALKING_HEIGHT -
      playerScreen.y +
      HALF_GAME_HEIGHT +
      this.walkOffset.y +
      additionalOffset.y;

    const mirrored = [Direction.Right, Direction.Up].includes(
      this.mapInfo.direction,
    );

    if (mirrored) {
      ctx.save();
      ctx.translate(GAME_WIDTH, 0);
      ctx.scale(-1, 1);
    }

    const drawX = mirrored
      ? GAME_WIDTH - screenX - CHARACTER_WALKING_WIDTH
      : screenX;

    ctx.drawImage(
      bmp,
      sourceX,
      sourceY,
      CHARACTER_WALKING_WIDTH,
      CHARACTER_WALKING_HEIGHT,
      drawX,
      screenY,
      CHARACTER_WALKING_WIDTH,
      CHARACTER_WALKING_HEIGHT,
    );

    if (mirrored) {
      ctx.restore();
    }
  }
}