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
