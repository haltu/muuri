import { DragAutoScrollSpeed, DragAutoScrollHandle } from './Grid/Grid';
import Item from './Item/Item';

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RectExtended extends Rect {
  right: number;
  bottom: number;
}

export interface StyleDeclaration {
  [prop: string]: string;
}

export interface ScrollEvent extends Event {
  type: 'scroll';
}

//
// CLASSES
//

export class AutoScroller {
  constructor();
  static AXIS_X: 1;
  static AXIS_Y: 2;
  static FORWARD: 4;
  static BACKWARD: 8;
  static LEFT: 9;
  static RIGHT: 5;
  static UP: 10;
  static DOWN: 6;
  static smoothSpeed(
    maxSpeed: number,
    acceleration: number,
    deceleration: number
  ): DragAutoScrollSpeed;
  static pointerHandle(pointerSize: number): DragAutoScrollHandle;
  addItem(item: Item): void;
  updateItem(item: Item): void;
  removeItem(item: Item): void;
  isItemScrollingX(item: Item): boolean;
  isItemScrollingY(item: Item): boolean;
  isItemScrolling(item: Item): boolean;
  destroy(): void;
}
